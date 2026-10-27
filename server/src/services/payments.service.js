const crypto = require('crypto');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Train = require('../models/Train');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const { calculateFare } = require('./pricing');

const PAYMENT_METHODS = ['UPI_GPAY', 'DEBIT_CARD', 'CREDIT_CARD'];

function generateBookingRef() {
  return `PNR-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

function releaseHeldSeats(session, trainId, seatCount) {
  return Train.findOneAndUpdate(
    { _id: trainId },
    [{
      $set: {
        availableSeats: { $min: ['$totalSeats', { $add: ['$availableSeats', seatCount] }] }
      }
    }],
    { session }
  );
}

async function applySimulatedPaymentAction(paymentId, userId, action, paymentMethod) {
  if (!['approve', 'decline', 'cancel'].includes(action)) {
    throw Object.assign(new Error('Choose a valid demonstration payment action.'), { status: 400 });
  }
  if (action === 'approve' && !PAYMENT_METHODS.includes(paymentMethod)) {
    throw Object.assign(new Error('Choose UPI / Google Pay, debit card, or credit card.'), { status: 400 });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const payment = await Payment.findOne({
      _id: paymentId,
      userId,
      provider: 'SIMULATED',
      simulated: true,
      mode: 'simulated'
    }).session(session);
    if (!payment) throw Object.assign(new Error('Demonstration payment attempt not found.'), { status: 404 });
    if (
      payment.currency !== 'INR' ||
      !Number.isSafeInteger(payment.amountPaise) ||
      payment.amount <= 0 ||
      payment.amountPaise !== Math.round(payment.amount * 100)
    ) {
      throw Object.assign(new Error('This payment attempt has an invalid amount or currency.'), { status: 409 });
    }

    if (action === 'approve' && payment.status === 'PAID' && payment.bookingId) {
      const booking = await Booking.findById(payment.bookingId).session(session);
      await session.commitTransaction();
      return { status: 'PAID', booking, idempotent: true };
    }
    if (payment.status !== 'PENDING') {
      throw Object.assign(new Error(`This payment attempt is ${payment.status.toLowerCase()} and cannot be completed.`), { status: 409 });
    }

    const details = payment.bookingDetails;
    if (!details) throw Object.assign(new Error('Payment attempt is missing its held booking details.'), { status: 409 });
    const now = new Date();
    if (!payment.expiresAt || payment.expiresAt <= now) {
      const expired = await Payment.findOneAndUpdate(
        {
          _id: payment._id,
          status: 'PENDING',
          $or: [{ expiresAt: { $lte: now } }, { expiresAt: { $exists: false } }]
        },
        { $set: { status: 'EXPIRED' } },
        { new: true, session }
      );
      if (expired) await releaseHeldSeats(session, details.trainId, details.seatCount);
      await session.commitTransaction();
      return { status: 'EXPIRED' };
    }

    if (action !== 'approve') {
      const status = action === 'decline' ? 'FAILED' : 'CANCELLED';
      const updated = await Payment.findOneAndUpdate(
        { _id: payment._id, status: 'PENDING', expiresAt: { $gt: now } },
        { $set: { status } },
        { new: true, session }
      );
      if (!updated) throw Object.assign(new Error('Payment attempt changed while processing. Check its status.'), { status: 409 });
      await releaseHeldSeats(session, details.trainId, details.seatCount);
      await session.commitTransaction();
      return { status };
    }

    const train = await Train.findById(details.trainId).session(session);
    const expectedAmount = train && calculateFare(train.fare, details.travelClass, details.seatCount);
    if (
      !train ||
      train.status === 'Cancelled' ||
      train.journeyDate !== details.journeyDate ||
      expectedAmount !== payment.amount
    ) {
      const updated = await Payment.findOneAndUpdate(
        { _id: payment._id, status: 'PENDING', expiresAt: { $gt: now } },
        { $set: { status: 'FAILED', lastFailureCode: 'BOOKING_DETAILS_CHANGED' } },
        { new: true, session }
      );
      if (!updated) throw Object.assign(new Error('Payment attempt changed while processing. Check its status.'), { status: 409 });
      await releaseHeldSeats(session, details.trainId, details.seatCount);
      await session.commitTransaction();
      return { status: 'FAILED' };
    }

    const [booking] = await Booking.create([{
      bookingReference: generateBookingRef(),
      userId: payment.userId,
      trainId: details.trainId,
      journeyDate: details.journeyDate,
      passengerName: details.passengerName,
      passengerAge: details.passengerAge,
      passengerGender: details.passengerGender,
      travelClass: details.travelClass,
      seatCount: details.seatCount,
      fare: payment.amount,
      paymentMethod,
      paymentReference: payment.transactionReference,
      paymentProvider: 'SIMULATED',
      simulatedPayment: true,
      paymentStatus: 'PAID',
      status: 'CONFIRMED'
    }], { session });

    const updated = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'PENDING', expiresAt: { $gt: now } },
      {
        $set: { status: 'PAID', bookingId: booking._id, method: paymentMethod },
        $unset: { bookingDetails: 1 }
      },
      { new: true, session }
    );
    if (!updated) throw Object.assign(new Error('Payment attempt changed while processing. Check its status.'), { status: 409 });

    await Notification.create([{
      userId: payment.userId,
      bookingId: booking._id,
      title: `Demo Ticket Confirmed: ${booking.bookingReference}`,
      message: `Your demo payment was recorded for ${train.trainName} (${train.trainNumber}) from ${train.source} to ${train.destination}. No real money was charged.`,
      type: 'BOOKING_CONFIRMED'
    }], { session });

    await session.commitTransaction();
    return { status: 'PAID', booking };
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    if (
      action === 'approve' &&
      (err.code === 112 || err.hasErrorLabel?.('TransientTransactionError'))
    ) {
      const completed = await Payment.findOne({
        _id: paymentId,
        userId,
        provider: 'SIMULATED',
        simulated: true,
        status: 'PAID'
      });
      if (completed?.bookingId) {
        const booking = await Booking.findById(completed.bookingId);
        if (booking) return { status: 'PAID', booking, idempotent: true };
      }
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

async function expirePendingPayments() {
  const expired = await Payment.find({ status: 'PENDING', expiresAt: { $lte: new Date() } })
    .select('_id bookingDetails')
    .limit(100);

  for (const item of expired) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const payment = await Payment.findOneAndUpdate(
        { _id: item._id, status: 'PENDING', expiresAt: { $lte: new Date() } },
        { $set: { status: 'EXPIRED' } },
        { new: true, session }
      );
      if (payment?.bookingDetails) {
        await releaseHeldSeats(session, payment.bookingDetails.trainId, payment.bookingDetails.seatCount);
      }
      await session.commitTransaction();
    } catch (err) {
      if (session.inTransaction()) await session.abortTransaction();
      console.error('Could not expire pending demo payment:', err.message);
    } finally {
      await session.endSession();
    }
  }
}

module.exports = {
  PAYMENT_METHODS,
  applySimulatedPaymentAction,
  expirePendingPayments
};
