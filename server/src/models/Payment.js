const mongoose = require('mongoose');
const { Schema } = mongoose;

const bookingDetailsSchema = new Schema(
  {
    trainId: { type: Schema.Types.ObjectId, ref: 'Train', required: true },
    journeyDate: { type: String, required: true },
    passengerName: { type: String, required: true, trim: true },
    passengerAge: { type: Number, required: true, min: 1, max: 120 },
    passengerGender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    travelClass: { type: String, enum: ['SL', '3A', '2A', '1A', 'CC', 'EC'], required: true },
    seatCount: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const paymentSchema = new Schema(
  {
    transactionReference: { type: String, unique: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', default: null },
    clientRequestId: { type: String, trim: true },
    razorpayOrderId: { type: String, trim: true },
    razorpayPaymentId: { type: String, trim: true },
    razorpayRefundId: { type: String, trim: true },
    provider: { type: String, enum: ['RAZORPAY', 'SIMULATED'] },
    bookingDetails: { type: bookingDetailsSchema, default: undefined },
    amount: { type: Number, required: true, min: 0 },
    amountPaise: { type: Number, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true },
    method: { type: String, trim: true },
    mode: { type: String, enum: ['test', 'live', 'simulated'] },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUND_PENDING', 'REFUND_FAILED', 'REFUNDED', 'EXPIRED', 'SUCCESS'],
      required: true
    },
    simulated: { type: Boolean, default: false },
    expiresAt: { type: Date },
    refundReceipt: { type: String, trim: true },
    refundRequestedAt: { type: Date },
    refundedAt: { type: Date },
    lastFailureCode: { type: String, trim: true }
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ status: 1, expiresAt: 1 });
paymentSchema.index({ clientRequestId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });

paymentSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.bookingDetails;
    delete ret.clientRequestId;
    delete ret.refundReceipt;
    return ret;
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
