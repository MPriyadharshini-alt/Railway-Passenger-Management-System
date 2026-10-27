const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Train = require('../models/Train');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const { requireAdmin } = require('../middleware/auth');

// Protect all admin endpoints with backend role check
router.use(requireAdmin);

// GET /api/admin/stats - Operational metrics
router.get('/stats', async (req, res) => {
  try {
    const [totalTrains, totalBookings, activeBookings, cancelledBookings, totalUsers, demoTotals] = await Promise.all([
      Train.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'CONFIRMED' }),
      Booking.countDocuments({ status: 'CANCELLED' }),
      User.countDocuments({ role: 'PASSENGER' }),
      Booking.aggregate([
        { $match: { status: 'CONFIRMED', simulatedPayment: true } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: '$fare' }
          }
        }
      ])
    ]);

    const demoPayments = demoTotals[0]?.count || 0;
    const demoPaymentAmount = demoTotals[0]?.amount || 0;
    return res.json({
      totalTrains,
      totalBookings,
      activeBookings,
      cancelledBookings,
      totalUsers,
      demoPayments,
      demoPaymentAmount,
      realRevenue: 0
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    return res.status(500).json({ message: 'Server error retrieving statistics.' });
  }
});

// GET /api/admin/trains - List all trains
router.get('/trains', async (req, res) => {
  try {
    const trains = await Train.find().sort({ createdAt: -1 });
    return res.json(trains);
  } catch (err) {
    console.error('Admin get trains error:', err);
    return res.status(500).json({ message: 'Server error retrieving trains.' });
  }
});

// POST /api/admin/trains - Create new train
router.post('/trains', async (req, res) => {
  try {
    const {
      trainNumber,
      trainName,
      source,
      destination,
      departureTime,
      arrivalTime,
      journeyDate,
      totalSeats,
      availableSeats,
      fare,
      status = 'Scheduled',
      currentStation,
      delayMinutes = 0
    } = req.body;

    if (!trainNumber || !trainNumber.trim()) return res.status(400).json({ message: 'Train number is required.' });
    if (!trainName || !trainName.trim()) return res.status(400).json({ message: 'Train name is required.' });
    if (!source || !source.trim()) return res.status(400).json({ message: 'Source station is required.' });
    if (!destination || !destination.trim()) return res.status(400).json({ message: 'Destination station is required.' });
    if (source.trim().toLowerCase() === destination.trim().toLowerCase())
      return res.status(400).json({ message: 'Source and destination cannot be identical.' });
    if (!departureTime || !departureTime.trim()) return res.status(400).json({ message: 'Departure time is required.' });
    if (!arrivalTime || !arrivalTime.trim()) return res.status(400).json({ message: 'Arrival time is required.' });
    if (!journeyDate || !journeyDate.trim()) return res.status(400).json({ message: 'Journey date is required.' });

    const tSeats = parseInt(totalSeats, 10);
    if (isNaN(tSeats) || tSeats <= 0) return res.status(400).json({ message: 'Total seats must be greater than 0.' });

    let aSeats = availableSeats !== undefined ? parseInt(availableSeats, 10) : tSeats;
    if (isNaN(aSeats) || aSeats < 0 || aSeats > tSeats)
      return res.status(400).json({ message: 'Available seats must be between 0 and total seats.' });

    const fareVal = parseFloat(fare);
    if (isNaN(fareVal) || fareVal < 0) return res.status(400).json({ message: 'Fare must be 0 or greater.' });

    // Check duplicate train number
    const existing = await Train.findOne({ trainNumber: trainNumber.trim().toUpperCase() });
    if (existing)
      return res.status(409).json({ message: `Train number '${trainNumber.trim().toUpperCase()}' already exists.` });

    const train = await Train.create({
      trainNumber: trainNumber.trim().toUpperCase(),
      trainName: trainName.trim(),
      source: source.trim(),
      destination: destination.trim(),
      departureTime: departureTime.trim(),
      arrivalTime: arrivalTime.trim(),
      journeyDate: journeyDate.trim(),
      totalSeats: tSeats,
      availableSeats: aSeats,
      fare: fareVal,
      status,
      currentStation: currentStation ? currentStation.trim() : source.trim(),
      delayMinutes: parseInt(delayMinutes, 10) || 0
    });

    return res.status(201).json({ message: 'Train created successfully.', train });
  } catch (err) {
    console.error('Error creating train:', err);
    return res.status(500).json({ message: 'Server error creating train.' });
  }
});

// PUT /api/admin/trains/:id - Update train details
router.put('/trains/:id', async (req, res) => {
  try {
    const train = await Train.findById(req.params.id);
    if (!train) return res.status(404).json({ message: 'Train not found.' });

    const {
      trainNumber,
      trainName,
      source,
      destination,
      departureTime,
      arrivalTime,
      journeyDate,
      totalSeats,
      availableSeats,
      fare,
      status,
      currentStation,
      delayMinutes
    } = req.body;

    const tSeats = totalSeats !== undefined ? Number(totalSeats) : train.totalSeats;
    const aSeats = availableSeats !== undefined ? Number(availableSeats) : train.availableSeats;
    const fareVal = fare !== undefined ? parseFloat(fare) : train.fare;
    const [confirmedSeatResult, pendingSeatResult] = await Promise.all([
      Booking.aggregate([
      { $match: { trainId: train._id, status: 'CONFIRMED' } },
      { $group: { _id: null, seats: { $sum: '$seatCount' } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'PENDING', 'bookingDetails.trainId': train._id } },
        { $group: { _id: null, seats: { $sum: '$bookingDetails.seatCount' } } }
      ])
    ]);
    const confirmedSeats = confirmedSeatResult[0]?.seats || 0;
    const heldSeats = pendingSeatResult[0]?.seats || 0;
    const reservedSeats = confirmedSeats + heldSeats;
    const hasReservations = confirmedSeats > 0 || heldSeats > 0;

    if (!Number.isSafeInteger(tSeats) || tSeats <= 0 || tSeats < reservedSeats) {
      return res.status(400).json({ message: `Total seats must be a positive whole number and cannot be less than ${reservedSeats} confirmed or temporarily held seat(s).` });
    }
    if (!Number.isSafeInteger(aSeats) || aSeats < 0 || aSeats > tSeats - reservedSeats) {
      return res.status(400).json({ message: `Available seats must be a whole number between 0 and ${tSeats - reservedSeats}, based on confirmed bookings and active payment holds.` });
    }
    if (!Number.isFinite(fareVal) || fareVal < 0) return res.status(400).json({ message: 'Fare must be 0 or greater.' });

    if (source && destination && source.trim().toLowerCase() === destination.trim().toLowerCase()) {
      return res.status(400).json({ message: 'Source and destination cannot be identical.' });
    }

    const scheduleFieldsChanged = (
      (source && source.trim() !== train.source) ||
      (destination && destination.trim() !== train.destination) ||
      (journeyDate && journeyDate.trim() !== train.journeyDate) ||
      (departureTime && departureTime.trim() !== train.departureTime) ||
      (arrivalTime && arrivalTime.trim() !== train.arrivalTime)
    );
    if (hasReservations && scheduleFieldsChanged) {
      return res.status(409).json({ message: 'Route and schedule cannot change while confirmed bookings or payment seat holds exist.' });
    }

    const validStatuses = ['Scheduled', 'On Time', 'Delayed', 'Arrived', 'Cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid train status.' });
    }

    // Check duplicate train number if changed
    if (trainNumber && trainNumber.trim().toUpperCase() !== train.trainNumber) {
      const dup = await Train.findOne({ trainNumber: trainNumber.trim().toUpperCase(), _id: { $ne: train._id } });
      if (dup) return res.status(409).json({ message: 'Train number already in use by another train.' });
    }

    const updated = await Train.findOneAndUpdate(
      { _id: req.params.id, availableSeats: train.availableSeats },
      {
        trainNumber: trainNumber ? trainNumber.trim().toUpperCase() : train.trainNumber,
        trainName: trainName ? trainName.trim() : train.trainName,
        source: source ? source.trim() : train.source,
        destination: destination ? destination.trim() : train.destination,
        departureTime: departureTime ? departureTime.trim() : train.departureTime,
        arrivalTime: arrivalTime ? arrivalTime.trim() : train.arrivalTime,
        journeyDate: journeyDate ? journeyDate.trim() : train.journeyDate,
        totalSeats: tSeats,
        availableSeats: aSeats,
        fare: fareVal,
        status: status || train.status,
        currentStation: currentStation !== undefined ? currentStation.trim() : train.currentStation,
        delayMinutes: delayMinutes !== undefined ? parseInt(delayMinutes, 10) : train.delayMinutes
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(409).json({ message: 'Train inventory changed while saving. Refresh the fleet and try again.' });
    }

    return res.json({ message: 'Train updated successfully.', train: updated });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Train not found.' });
    console.error('Error updating train:', err);
    return res.status(500).json({ message: 'Server error updating train.' });
  }
});

// PUT /api/admin/trains/:id/status - Update operational status and notify passengers
router.put('/trains/:id/status', async (req, res) => {
  try {
    const train = await Train.findById(req.params.id);
    if (!train) return res.status(404).json({ message: 'Train not found.' });

    const { status, currentStation, delayMinutes = 0 } = req.body;
    const validStatuses = ['Scheduled', 'On Time', 'Delayed', 'Arrived', 'Cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Choose a valid train status.' });

    const delay = Number(delayMinutes);
    if (!Number.isSafeInteger(delay) || delay < 0) {
      return res.status(400).json({ message: 'Delay must be a non-negative whole number of minutes.' });
    }
    const station = typeof currentStation === 'string' && currentStation.trim()
      ? currentStation.trim()
      : train.currentStation || train.source;

    await Train.findByIdAndUpdate(
      req.params.id,
      { status, currentStation: station, delayMinutes: delay },
      { runValidators: true }
    );

    // Notify all passengers with CONFIRMED bookings for this train
    const activeBookings = await Booking.find({ trainId: train._id, status: 'CONFIRMED' }).select('userId bookingReference');

    let statusMsg = `Train ${train.trainNumber} (${train.trainName}) status updated to '${status}'.`;
    if (delay > 0) {
      statusMsg += ` Currently delayed by ${delay} mins near ${station}.`;
    } else if (station) {
      statusMsg += ` Currently near/at ${station}.`;
    }

    if (activeBookings.length > 0) {
      const notificationDocs = activeBookings.map((b) => ({
        userId: b.userId,
        title: `Status Update: ${train.trainNumber}`,
        message: `${statusMsg} (Booking Ref: ${b.bookingReference})`,
        type: 'TRAIN_STATUS'
      }));
      await Notification.insertMany(notificationDocs);
    }

    return res.json({
      message: `Train status updated and ${activeBookings.length} passenger(s) notified.`,
      status,
      currentStation: station,
      delayMinutes: delay
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Train not found.' });
    console.error('Error updating train status:', err);
    return res.status(500).json({ message: 'Server error updating train status.' });
  }
});

// DELETE /api/admin/trains/:id - Delete train
router.delete('/trains/:id', async (req, res) => {
  try {
    const train = await Train.findById(req.params.id);
    if (!train) return res.status(404).json({ message: 'Train not found.' });

    const [bookingCount, pendingPaymentCount] = await Promise.all([
      Booking.countDocuments({ trainId: train._id }),
      Payment.countDocuments({ status: 'PENDING', 'bookingDetails.trainId': train._id })
    ]);
    if (bookingCount > 0 || pendingPaymentCount > 0) {
      const referencedRecords = bookingCount + pendingPaymentCount;
      return res.status(409).json({
        message: `Cannot delete train: ${referencedRecords} booking or payment-hold record(s) refer to this service. Keep the train record to preserve history and checkout consistency.`
      });
    }

    await train.deleteOne();
    return res.json({ message: 'Train record deleted successfully.' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Train not found.' });
    console.error('Error deleting train:', err);
    return res.status(500).json({ message: 'Server error deleting train.' });
  }
});

// GET /api/admin/bookings - View all bookings
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'name email')
      .populate('trainId', 'trainNumber trainName source destination')
      .sort({ createdAt: -1 });

    const result = bookings.map((b) => {
      const bObj = b.toJSON();
      const uObj = bObj.userId;
      const tObj = bObj.trainId;
      return {
        id: bObj.id,
        bookingReference: bObj.bookingReference,
        userId: uObj?._id || bObj.userId,
        userName: uObj?.name,
        userEmail: uObj?.email,
        trainId: tObj?.trainId || bObj.trainId,
        trainNumber: tObj?.trainNumber,
        trainName: tObj?.trainName,
        source: tObj?.source,
        destination: tObj?.destination,
        journeyDate: bObj.journeyDate,
        passengerName: bObj.passengerName,
        passengerAge: bObj.passengerAge,
        passengerGender: bObj.passengerGender,
        travelClass: bObj.travelClass,
        seatCount: bObj.seatCount,
        fare: bObj.fare,
        paymentMethod: bObj.paymentMethod,
        paymentReference: bObj.paymentReference,
        paymentProvider: bObj.paymentProvider,
        simulatedPayment: bObj.simulatedPayment,
        paymentStatus: bObj.paymentStatus,
        status: bObj.status,
        createdAt: bObj.createdAt,
        cancelledAt: bObj.cancelledAt
      };
    });

    return res.json(result);
  } catch (err) {
    console.error('Error getting admin bookings:', err);
    return res.status(500).json({ message: 'Server error retrieving bookings.' });
  }
});

// GET /api/admin/users - List all passengers
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'PASSENGER' }).sort({ createdAt: -1 });
    return res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    return res.status(500).json({ message: 'Server error retrieving users.' });
  }
});

module.exports = router;
