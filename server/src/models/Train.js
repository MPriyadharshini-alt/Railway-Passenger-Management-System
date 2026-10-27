const mongoose = require('mongoose');

const trainSchema = new mongoose.Schema(
  {
    trainNumber: {
      type: String,
      required: [true, 'Train number is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    trainName: {
      type: String,
      required: [true, 'Train name is required'],
      trim: true
    },
    source: {
      type: String,
      required: [true, 'Source station is required'],
      trim: true
    },
    destination: {
      type: String,
      required: [true, 'Destination station is required'],
      trim: true
    },
    departureTime: {
      type: String,
      required: [true, 'Departure time is required']
    },
    arrivalTime: {
      type: String,
      required: [true, 'Arrival time is required']
    },
    journeyDate: {
      type: String,
      required: [true, 'Journey date is required']
    },
    totalSeats: {
      type: Number,
      required: [true, 'Total seats is required'],
      min: [1, 'Total seats must be at least 1']
    },
    availableSeats: {
      type: Number,
      required: [true, 'Available seats is required'],
      min: [0, 'Available seats cannot be negative']
    },
    fare: {
      type: Number,
      required: [true, 'Fare is required'],
      min: [0, 'Fare cannot be negative']
    },
    status: {
      type: String,
      enum: ['Scheduled', 'On Time', 'Delayed', 'Arrived', 'Cancelled'],
      default: 'Scheduled'
    },
    currentStation: {
      type: String,
      trim: true
    },
    delayMinutes: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Index for search queries
trainSchema.index({ source: 1, destination: 1 });
trainSchema.index({ journeyDate: 1 });

trainSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.trainId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Train', trainSchema);
