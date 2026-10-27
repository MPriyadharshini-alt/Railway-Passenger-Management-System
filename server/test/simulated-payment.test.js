const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Payment = require('../src/models/Payment');
const Booking = require('../src/models/Booking');
const { PAYMENT_METHODS, applySimulatedPaymentAction } = require('../src/services/payments.service');

const userId = new mongoose.Types.ObjectId();
const trainId = new mongoose.Types.ObjectId();

test('simulated payment attempts are explicitly identified in payment and booking records', () => {
  const payment = new Payment({
    transactionReference: 'SIM-payment-reference',
    userId,
    bookingDetails: {
      trainId,
      journeyDate: '2026-12-01',
      passengerName: 'Test Passenger',
      passengerAge: 30,
      passengerGender: 'Other',
      travelClass: '3A',
      seatCount: 1
    },
    amount: 150,
    amountPaise: 15000,
    currency: 'INR',
    method: 'UPI_GPAY',
    mode: 'simulated',
    provider: 'SIMULATED',
    simulated: true,
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 60_000)
  });
  const booking = new Booking({
    bookingReference: 'PNR-TEST123456',
    userId,
    trainId,
    journeyDate: '2026-12-01',
    passengerName: 'Test Passenger',
    passengerAge: 30,
    passengerGender: 'Other',
    travelClass: '3A',
    seatCount: 1,
    fare: 150,
    paymentMethod: 'UPI_GPAY',
    paymentReference: 'SIM-payment-reference',
    paymentProvider: 'SIMULATED',
    simulatedPayment: true,
    paymentStatus: 'PAID'
  });

  assert.equal(payment.validateSync(), undefined);
  assert.equal(booking.validateSync(), undefined);
});

test('simulation accepts actions rather than frontend-supplied payment statuses', async () => {
  await assert.rejects(
    applySimulatedPaymentAction(new mongoose.Types.ObjectId(), userId, 'PAID'),
    (error) => error.status === 400
  );
});

test('only the three advertised demo payment methods are accepted', async () => {
  assert.deepEqual(PAYMENT_METHODS, ['UPI_GPAY', 'DEBIT_CARD', 'CREDIT_CARD']);
  await assert.rejects(
    applySimulatedPaymentAction(new mongoose.Types.ObjectId(), userId, 'approve', 'BANK_PASSWORD'),
    (error) => error.status === 400
  );
});
