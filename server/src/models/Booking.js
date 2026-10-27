const mongoose = require('mongoose');
const { Schema } = mongoose;

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    trainId: {
      type: Schema.Types.ObjectId,
      ref: 'Train',
      required: true
    },
    journeyDate: {
      type: String,
      required: [true, 'Journey date is required']
    },
    passengerName: {
      type: String,
      required: [true, 'Passenger name is required'],
      trim: true
    },
    passengerAge: {
      type: Number,
      required: [true, 'Passenger age is required'],
      min: [1, 'Age must be at least 1'],
      max: [120, 'Age cannot exceed 120']
    },
    passengerGender: {
      type: String,
      required: [true, 'Passenger gender is required'],
      enum: ['Male', 'Female', 'Other']
    },
    travelClass: {
      type: String,
      enum: ['SL', '3A', '2A', '1A', 'CC', 'EC'],
      default: 'SL'
    },
    seatCount: {
      type: Number,
      required: true,
      min: [1, 'Seat count must be at least 1']
    },
    fare: {
      type: Number,
      required: true,
      min: [0, 'Fare cannot be negative']
    },
    paymentMethod: {
      type: String,
      trim: true
    },
    paymentProvider: {
      type: String,
      enum: ['RAZORPAY', 'SIMULATED']
    },
    simulatedPayment: {
      type: Boolean,
      default: false
    },
    paymentReference: String,
    paymentStatus: {
      type: String,
      enum: ['SUCCESS', 'PAID', 'REFUND_PENDING', 'REFUND_FAILED', 'REFUNDED']
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'CANCELLED'],
      default: 'CONFIRMED'
    },
    cancelledAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient user-based queries
bookingSchema.index({ userId: 1 });
bookingSchema.index({ trainId: 1 });
bookingSchema.index({ status: 1 });

bookingSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
