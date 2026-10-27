const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Train = require('../models/Train');
const { requireAuth } = require('../middleware/auth');
const { PAYMENT_METHODS, applySimulatedPaymentAction, expirePendingPayments } = require('../services/payments.service');
const { CLASS_MULTIPLIERS, calculateFare } = require('../services/pricing');

const router = express.Router();
const HOLD_MINUTES = 10;

function paymentResponse(payment) {
  return {
    paymentId: payment.id,
    orderId: payment.transactionReference,
    amount: payment.amountPaise,
    currency: payment.currency,
    mode: 'simulated',
    provider: 'SIMULATED',
    simulated: true,
    expiresAt: payment.expiresAt
  };
}

function validateBookingRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Booking details must be a valid object.' };
  }

  const {
    trainId,
    journeyDate,
    passengerName,
    passengerAge,
    passengerGender,
    travelClass = 'SL',
    seatCount = 1
  } = body;

  if (!mongoose.Types.ObjectId.isValid(trainId)) return { error: 'Select a valid train.' };
  const parsedJourneyDate = typeof journeyDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(journeyDate)
    ? new Date(`${journeyDate}T00:00:00.000Z`)
    : null;
  if (!parsedJourneyDate || Number.isNaN(parsedJourneyDate.getTime()) ||
      parsedJourneyDate.toISOString().slice(0, 10) !== journeyDate) {
    return { error: 'Enter a valid journey date.' };
  }
  if (typeof passengerName !== 'string' || !passengerName.trim() || passengerName.trim().length > 100) {
    return { error: 'Passenger name is required and must not exceed 100 characters.' };
  }
  const age = Number(passengerAge);
  if (!Number.isInteger(age) || age < 1 || age > 120) return { error: 'Enter a valid passenger age between 1 and 120.' };
  if (!['Male', 'Female', 'Other'].includes(passengerGender)) return { error: 'Choose a valid passenger gender.' };
  const count = Number(seatCount);
  if (!Number.isSafeInteger(count) || count < 1 || count > 6) return { error: 'Seat count must be a whole number between 1 and 6.' };
  if (!CLASS_MULTIPLIERS[travelClass]) return { error: 'Choose a supported travel class.' };

  return {
    details: {
      trainId,
      journeyDate,
      passengerName: passengerName.trim(),
      passengerAge: age,
      passengerGender,
      travelClass,
      seatCount: count
    }
  };
}

router.get('/config', requireAuth, (req, res) => res.json({
  mode: 'simulated',
  enabled: false,
  simulated: true,
  currency: 'INR',
  methods: [
    { id: 'UPI_GPAY', label: 'UPI / Google Pay' },
    { id: 'DEBIT_CARD', label: 'Debit Card' },
    { id: 'CREDIT_CARD', label: 'Credit Card' }
  ],
  message: 'Demo payment only. No real money is charged.'
}));

router.post('/orders', requireAuth, async (req, res) => {
  let session;
  try {
    const clientRequestId = req.get('Idempotency-Key');
    if (typeof clientRequestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(clientRequestId)) {
      return res.status(400).json({ message: 'A valid Idempotency-Key is required to prevent duplicate payment orders.' });
    }

    await expirePendingPayments();
    const existing = await Payment.findOne({ clientRequestId, userId: req.user._id });
    if (existing) {
      if (existing.status === 'PENDING' && existing.expiresAt > new Date()) {
        return res.json(paymentResponse(existing));
      }
      return res.status(409).json({ message: 'This checkout attempt has already been processed or expired. Start a new attempt.' });
    }

    const validation = validateBookingRequest(req.body);
    if (validation.error) return res.status(400).json({ message: validation.error });
    const { details } = validation;
    const train = await Train.findById(details.trainId).select('trainName trainNumber journeyDate fare status availableSeats');
    if (!train) return res.status(404).json({ message: 'Train not found.' });
    if (train.status === 'Cancelled') return res.status(409).json({ message: 'This train service has been cancelled.' });
    if (train.journeyDate !== details.journeyDate) {
      return res.status(409).json({ message: 'Journey date no longer matches this train schedule. Search again.' });
    }

    const amount = calculateFare(train.fare, details.travelClass, details.seatCount);
    const amountPaise = Math.round(amount * 100);
    if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
      return res.status(400).json({ message: 'Calculated payment amount is invalid.' });
    }

    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
    const paymentReference = `SIM-${crypto.randomUUID()}`;
    session = await mongoose.startSession();
    session.startTransaction();

    const reservedTrain = await Train.findOneAndUpdate(
      {
        _id: train._id,
        journeyDate: details.journeyDate,
        fare: train.fare,
        status: { $ne: 'Cancelled' },
        availableSeats: { $gte: details.seatCount }
      },
      { $inc: { availableSeats: -details.seatCount } },
      { new: true, session }
    );
    if (!reservedTrain) {
      await session.abortTransaction();
      return res.status(409).json({ message: 'Train fare, schedule, or seat availability changed. Refresh train availability and try again.' });
    }

    const [payment] = await Payment.create([{
      transactionReference: paymentReference,
      userId: req.user._id,
      clientRequestId,
      bookingDetails: details,
      amount,
      amountPaise,
      currency: 'INR',
      mode: 'simulated',
      status: 'PENDING',
      simulated: true,
      provider: 'SIMULATED',
      expiresAt
    }], { session });

    await session.commitTransaction();
    return res.status(201).json(paymentResponse(payment));
  } catch (err) {
    if (session?.inTransaction()) await session.abortTransaction();
    if (err.code === 11000) {
      const existing = await Payment.findOne({
        clientRequestId: req.get('Idempotency-Key'),
        userId: req.user._id
      });
      if (existing?.status === 'PENDING' && existing.expiresAt > new Date()) {
        return res.json(paymentResponse(existing));
      }
      return res.status(409).json({ message: 'A payment attempt already exists for this checkout request.' });
    }
    console.error('Could not create demo payment attempt:', err.message);
    if (err.status) return res.status(err.status).json({ message: err.message });
    return res.status(500).json({ message: 'Unable to start checkout. No booking was confirmed; retry safely.' });
  } finally {
    if (session) await session.endSession();
  }
});

router.post('/:id/simulate', requireAuth, async (req, res) => {
  try {
    if (!req.body || !['approve', 'decline', 'cancel'].includes(req.body.action)) {
      return res.status(400).json({ message: 'Choose a valid demonstration payment action.' });
    }
    if (
      req.body.action === 'approve' &&
      !PAYMENT_METHODS.includes(req.body.paymentMethod)
    ) {
      return res.status(400).json({ message: 'Choose UPI / Google Pay, debit card, or credit card.' });
    }

    const result = await applySimulatedPaymentAction(
      req.params.id,
      req.user._id,
      req.body.action,
      req.body.paymentMethod
    );
    return res.json({
      message: result.status === 'PAID'
        ? 'Demo payment completed. No real money was charged.'
        : result.status === 'FAILED'
          ? 'Demo payment failed. No real money was charged and held seats were released.'
          : result.status === 'CANCELLED'
            ? 'Demo payment was cancelled. No real money was charged and held seats were released.'
            : result.status === 'EXPIRED'
              ? 'The seat hold expired before payment could be completed.'
              : 'Demo payment could not be completed.',
      status: result.status,
      simulated: true,
      booking: result.booking
        ? { id: result.booking.id || result.booking._id.toString(), bookingReference: result.booking.bookingReference }
        : null
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('Demo payment could not be processed:', err.message);
    return res.status(500).json({ message: 'Could not process demo payment.' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, userId: req.user._id })
      .select('status bookingId mode amount currency expiresAt provider simulated method');
    if (!payment) return res.status(404).json({ message: 'Payment attempt not found.' });
    return res.json({
      id: payment.id,
      status: payment.status,
      provider: 'SIMULATED',
      simulated: true,
      bookingId: payment.bookingId,
      mode: 'simulated',
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
      expiresAt: payment.expiresAt
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Payment attempt not found.' });
    console.error('Could not retrieve demo payment status:', err.message);
    return res.status(500).json({ message: 'Could not retrieve payment status.' });
  }
});

module.exports = router;
