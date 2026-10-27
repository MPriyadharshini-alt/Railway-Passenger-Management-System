const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Train = require('../models/Train');
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const TRAIN_FIELDS = 'trainNumber trainName source destination departureTime arrivalTime status currentStation delayMinutes';

function serializeBooking(booking) {
  const result = booking.toJSON();
  const train = result.trainId;
  return {
    ...result,
    trainId: train?.trainId || train?.id || train || result.trainId,
    trainNumber: train?.trainNumber,
    trainName: train?.trainName,
    source: train?.source,
    destination: train?.destination,
    departureTime: train?.departureTime,
    arrivalTime: train?.arrivalTime,
    trainStatus: train?.status,
    currentStation: train?.currentStation,
    delayMinutes: train?.delayMinutes
  };
}

router.post('/', requireAuth, (req, res) => res.status(410).json({
  message: 'Direct booking is disabled. Complete the demo checkout before a booking can be confirmed.'
}));

router.get('/', requireAuth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('trainId', TRAIN_FIELDS)
      .sort({ createdAt: -1 });
    return res.json(bookings.map(serializeBooking));
  } catch (err) {
    console.error('Error fetching bookings:', err.message);
    return res.status(500).json({ message: 'Server error retrieving bookings.' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('trainId', TRAIN_FIELDS);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.userId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'You do not have permission to view this booking.' });
    }
    return res.json(serializeBooking(booking));
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Booking not found.' });
    console.error('Error fetching booking:', err.message);
    return res.status(500).json({ message: 'Server error retrieving booking details.' });
  }
});

router.post('/:id/cancel', requireAuth, async (req, res) => {
  let session;
  try {
    const booking = await Booking.findById(req.params.id).populate('trainId');
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.userId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'You do not have permission to cancel this booking.' });
    }
    if (booking.status === 'CANCELLED') return res.status(409).json({ message: 'This booking is already cancelled.' });

    session = await mongoose.startSession();
    session.startTransaction();
    const cancelledAt = new Date();
    const cancelled = await Booking.findOneAndUpdate(
      { _id: booking._id, status: 'CONFIRMED' },
      { $set: { status: 'CANCELLED', cancelledAt } },
      { new: true, session }
    );
    if (!cancelled) {
      await session.abortTransaction();
      return res.status(409).json({ message: 'Booking status changed while cancellation was processing. Refresh and check its status.' });
    }

    await Train.findOneAndUpdate(
      { _id: booking.trainId._id },
      [{
        $set: {
          availableSeats: { $min: ['$totalSeats', { $add: ['$availableSeats', booking.seatCount] }] }
        }
      }],
      { session }
    );

    const paymentNotice = booking.simulatedPayment || booking.paymentProvider === 'SIMULATED'
      ? ' Demo payments do not represent a real transaction and are not refundable.'
      : ' No refund was initiated by this application; contact your payment provider about any historical transaction.';
    await Notification.create([{
      userId: booking.userId,
      bookingId: booking._id,
      title: `Booking Cancelled: ${booking.bookingReference}`,
      message: `Your booking for ${booking.trainId.trainName} (${booking.trainId.trainNumber}) was cancelled and ${booking.seatCount} seat(s) released.${paymentNotice}`,
      type: 'BOOKING_CANCELLED'
    }], { session });

    await session.commitTransaction();
    return res.json({
      message: `Booking cancelled and seats restored.${paymentNotice}`,
      booking: {
        id: cancelled._id.toString(),
        bookingReference: cancelled.bookingReference,
        status: cancelled.status,
        paymentStatus: cancelled.paymentStatus,
        cancelledAt
      }
    });
  } catch (err) {
    if (session?.inTransaction()) await session.abortTransaction();
    if (err.name === 'CastError') return res.status(404).json({ message: 'Booking not found.' });
    console.error('Cancellation error:', err.message);
    return res.status(500).json({ message: 'Server error while cancelling booking.' });
  } finally {
    if (session) await session.endSession();
  }
});

module.exports = router;
