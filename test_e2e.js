const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');

const dotenv = require('./server/node_modules/dotenv');
const mongoose = require('./server/node_modules/mongoose');
const Payment = require('./server/src/models/Payment');
const Booking = require('./server/src/models/Booking');
const Notification = require('./server/src/models/Notification');
const User = require('./server/src/models/User');
const { calculateFare } = require('./server/src/services/pricing');

dotenv.config({ path: path.join(__dirname, 'server', '.env') });

const BASE_URL = new URL(process.env.BASE_URL || 'http://localhost:5000');
assert.ok(['localhost', '127.0.0.1', '::1'].includes(BASE_URL.hostname), 'Integration checks are restricted to a local API.');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/railway_platform';
assert.ok(
  ['localhost', '127.0.0.1', '[::1]'].includes(new URL(MONGODB_URI).hostname),
  'Integration checks are restricted to local MongoDB; remote databases are never modified.'
);
const API_URL = `${BASE_URL.origin}/api`;
const paymentIds = new Set();
const bookingIds = new Set();
let passengerToken;
let passengerId;
let secondaryUserId;
let secondaryUserToken;

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, options);
  return { response, data: await response.json().catch(() => ({})) };
}

function authHeaders(token, extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

async function login(email, password) {
  const { response, data } = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  assert.equal(response.status, 200, `Login failed for ${email}: ${data.message}`);
  assert.ok(data.token);
  return data;
}

async function getTrain(trainId, token) {
  const { response, data } = await request(`/trains/${trainId}`, {
    headers: authHeaders(token)
  });
  assert.equal(response.status, 200, data.message);
  return data;
}

async function createAttempt(train, requestId = crypto.randomUUID()) {
  const { response, data } = await request('/payments/orders', {
    method: 'POST',
    headers: authHeaders(passengerToken, {
      'Content-Type': 'application/json',
      'Idempotency-Key': requestId
    }),
    body: JSON.stringify({
      trainId: train.trainId,
      journeyDate: train.journeyDate,
      passengerName: 'Automated Integration Passenger',
      passengerAge: 30,
      passengerGender: 'Other',
      travelClass: '3A',
      seatCount: 1,
      fare: 0,
      amount: 1
    })
  });
  assert.equal(response.status, 201, data.message);
  if (data.paymentId) paymentIds.add(data.paymentId);
  assert.equal(data.provider, 'SIMULATED');
  assert.equal(data.simulated, true);
  return data;
}

async function simulate(paymentId, action, paymentMethod = 'UPI_GPAY') {
  return request(`/payments/${paymentId}/simulate`, {
    method: 'POST',
    headers: authHeaders(passengerToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ action, paymentMethod })
  });
}

async function checkSeatRestored(trainId, expectedSeats) {
  const refreshed = await getTrain(trainId, passengerToken);
  assert.equal(refreshed.availableSeats, expectedSeats, 'Seat hold should be released or booking cancellation should restore inventory.');
}

async function cleanup() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  }

  const ids = [...paymentIds].map((id) => new mongoose.Types.ObjectId(id));
  if (ids.length) {
    const remaining = await Payment.find({ _id: { $in: ids }, userId: passengerId });
    for (const payment of remaining) {
      if (payment.status === 'PENDING') {
        const { response, data } = await simulate(payment.id, 'cancel');
        assert.equal(response.status, 200, data.message);
      }
    }
  }

  if (bookingIds.size) {
    const idsToRemove = [...bookingIds].map((id) => new mongoose.Types.ObjectId(id));
    await Notification.deleteMany({ bookingId: { $in: idsToRemove }, userId: passengerId });
    await Booking.deleteMany({ _id: { $in: idsToRemove }, userId: passengerId });
  }
  if (ids.length) {
    await Payment.deleteMany({ _id: { $in: ids }, userId: passengerId });
  }
  if (secondaryUserId) {
    const id = new mongoose.Types.ObjectId(secondaryUserId);
    await Notification.deleteMany({ userId: id });
    await User.deleteOne({ _id: id, role: 'PASSENGER' });
  }
  await mongoose.disconnect();
}

async function runTests() {
  console.log('Running local Railway API integration checks...\n');

  const { response: healthResponse, data: health } = await request('/health');
  assert.equal(healthResponse.status, 200);
  assert.equal(health.status, 'ok');
  console.log('✓ API and MongoDB health');

  const passenger = await login(
    process.env.TEST_PASSENGER_EMAIL || 'passenger@example.com',
    process.env.TEST_PASSENGER_PASSWORD || 'DemoPassword123'
  );
  passengerToken = passenger.token;
  passengerId = passenger.user.id;
  const admin = await login(
    process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
    process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123'
  );
  console.log('✓ Passenger and administrator authentication');

  const registrationPassword = crypto.randomBytes(18).toString('base64url');
  const { response: registrationResponse, data: registration } = await request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Integration Test Passenger',
      email: `integration-${crypto.randomUUID()}@example.test`,
      password: registrationPassword,
      role: 'ADMIN'
    })
  });
  assert.equal(registrationResponse.status, 201, registration.message);
  assert.equal(registration.user.role, 'PASSENGER', 'Public registration must not permit role escalation.');
  secondaryUserId = registration.user.id;
  secondaryUserToken = registration.token;
  const currentUser = await request('/auth/me', { headers: authHeaders(secondaryUserToken) });
  assert.equal(currentUser.response.status, 200);
  assert.equal(currentUser.data.user.id, secondaryUserId);
  console.log('✓ Registration, signed-in identity, and role-escalation protection');

  const { response: noTokenResponse } = await request('/admin/stats');
  assert.equal(noTokenResponse.status, 401);
  const { response: passengerAdminResponse } = await request('/admin/stats', {
    headers: authHeaders(passengerToken)
  });
  assert.equal(passengerAdminResponse.status, 403);
  const { response: adminResponse } = await request('/admin/stats', {
    headers: authHeaders(admin.token)
  });
  assert.equal(adminResponse.status, 200);
  console.log('✓ Backend admin authorization');

  const { response: searchResponse, data: trains } = await request(
    '/trains/search?source=New%20Delhi&destination=Mumbai%20Central',
    { headers: authHeaders(passengerToken) }
  );
  assert.equal(searchResponse.status, 200);
  assert.ok(Array.isArray(trains));
  const selectedTrain = trains.find((train) => train.availableSeats > 0);
  assert.ok(selectedTrain, 'A seeded train with available seats is required.');
  const trainId = selectedTrain.trainId;
  const { response: detailsResponse, data: details } = await request(`/trains/${trainId}`, {
    headers: authHeaders(passengerToken)
  });
  assert.equal(detailsResponse.status, 200);
  assert.equal(details.availableSeats, selectedTrain.availableSeats);
  console.log('✓ Train search, details, and seat availability');

  const { response: configResponse, data: paymentConfig } = await request('/payments/config', {
    headers: authHeaders(passengerToken)
  });
  assert.equal(configResponse.status, 200);
  assert.equal(paymentConfig.mode, 'simulated');
  assert.equal(paymentConfig.simulated, true);
  assert.equal(paymentConfig.enabled, false);
  assert.deepEqual(paymentConfig.methods.map(({ id }) => id), ['UPI_GPAY', 'DEBIT_CARD', 'CREDIT_CARD']);

  const { response: directBookingResponse } = await request('/bookings', {
    method: 'POST',
    headers: authHeaders(passengerToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({})
  });
  assert.equal(directBookingResponse.status, 410, 'Direct bookings must not bypass payment confirmation.');

  await mongoose.connect(
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/railway_platform',
    { serverSelectionTimeoutMS: 5000 }
  );
    const seatsBefore = (await getTrain(trainId, passengerToken)).availableSeats;

    const failedRequestId = crypto.randomUUID();
    const failedAttempt = await createAttempt(selectedTrain, failedRequestId);
    const repeatedOrder = await request('/payments/orders', {
      method: 'POST',
      headers: authHeaders(passengerToken, {
        'Content-Type': 'application/json',
        'Idempotency-Key': failedRequestId
      }),
      body: JSON.stringify({
        trainId,
        journeyDate: selectedTrain.journeyDate,
        passengerName: 'Automated Integration Passenger',
        passengerAge: 30,
        passengerGender: 'Other',
        travelClass: '3A',
        seatCount: 1,
        fare: 0,
        amount: 1
      })
    });
    assert.equal(repeatedOrder.response.status, 200, repeatedOrder.data.message);
    assert.equal(repeatedOrder.data.paymentId, failedAttempt.paymentId, 'A repeated checkout request must reuse its original hold.');
    assert.equal(
      failedAttempt.amount,
      Math.round(calculateFare(details.fare, '3A', 1) * 100),
      'Server-calculated fare must not trust a client-supplied amount.'
    );

    const unauthorizedAction = await request(`/payments/${failedAttempt.paymentId}/simulate`, {
      method: 'POST',
      headers: authHeaders(admin.token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'approve', paymentMethod: 'UPI_GPAY' })
    });
    assert.equal(unauthorizedAction.response.status, 404);

    const invalidStatusAction = await simulate(failedAttempt.paymentId, 'PAID');
    assert.equal(invalidStatusAction.response.status, 400);
    const invalidMethodAction = await simulate(failedAttempt.paymentId, 'approve', 'BANK_PASSWORD');
    assert.equal(invalidMethodAction.response.status, 400);
    const failed = await simulate(failedAttempt.paymentId, 'decline');
    assert.equal(failed.response.status, 200, failed.data.message);
    assert.equal(failed.data.status, 'FAILED');
    await checkSeatRestored(trainId, seatsBefore);
    console.log('✓ Ownership checks, backend-controlled failure, and seat release');

    const cancelledAttempt = await createAttempt(selectedTrain);
    const cancelled = await simulate(cancelledAttempt.paymentId, 'cancel');
    assert.equal(cancelled.response.status, 200, cancelled.data.message);
    assert.equal(cancelled.data.status, 'CANCELLED');
    await checkSeatRestored(trainId, seatsBefore);
    console.log('✓ Simulated cancellation and seat release');

    const { response: revenueBeforeResponse, data: revenueBefore } = await request('/admin/stats', {
      headers: authHeaders(admin.token)
    });
    assert.equal(revenueBeforeResponse.status, 200);
    const successfulAttempt = await createAttempt(selectedTrain);
    const concurrentSuccesses = await Promise.all([
      simulate(successfulAttempt.paymentId, 'approve', 'DEBIT_CARD'),
      simulate(successfulAttempt.paymentId, 'approve', 'DEBIT_CARD')
    ]);
    const successful = concurrentSuccesses.find(({ data }) => data.status === 'PAID');
    assert.ok(successful, 'At least one concurrent confirmation should succeed.');
    assert.ok(successful.data.booking?.id);
    bookingIds.add(successful.data.booking.id);
    const successfulBookings = concurrentSuccesses
      .filter(({ data }) => data.status === 'PAID')
      .map(({ data }) => data.booking.id);
    assert.equal(new Set(successfulBookings).size, 1, 'Concurrent payment submissions must create only one booking.');
    await checkSeatRestored(trainId, seatsBefore - 1);

    const repeatedSuccess = await simulate(successfulAttempt.paymentId, 'approve');
    assert.equal(repeatedSuccess.response.status, 200, repeatedSuccess.data.message);
    assert.equal(repeatedSuccess.data.booking.id, successful.data.booking.id);
    await checkSeatRestored(trainId, seatsBefore - 1);

    const { response: bookingResponse, data: booking } = await request(
      `/bookings/${successful.data.booking.id}`,
      { headers: authHeaders(passengerToken) }
    );
    assert.equal(bookingResponse.status, 200);
    assert.equal(booking.paymentProvider, 'SIMULATED');
    assert.equal(booking.simulatedPayment, true);
    assert.equal(booking.paymentMethod, 'DEBIT_CARD');
    assert.equal(booking.paymentStatus, 'PAID');
    const otherPassengerBooking = await request(`/bookings/${booking.id}`, {
      headers: authHeaders(secondaryUserToken)
    });
    assert.equal(otherPassengerBooking.response.status, 403);
    const otherPassengerPayment = await request(`/payments/${successfulAttempt.paymentId}`, {
      headers: authHeaders(secondaryUserToken)
    });
    assert.equal(otherPassengerPayment.response.status, 404);
    const { response: revenueAfterResponse, data: revenueAfter } = await request('/admin/stats', {
      headers: authHeaders(admin.token)
    });
    assert.equal(revenueAfterResponse.status, 200);
    assert.equal(revenueAfter.demoPaymentAmount, revenueBefore.demoPaymentAmount + booking.fare);
    assert.equal(revenueAfter.realRevenue, 0);
    const adminBookings = await request('/admin/bookings', { headers: authHeaders(admin.token) });
    assert.equal(adminBookings.response.status, 200);
    assert.ok(adminBookings.data.some((item) => item.id === booking.id && item.simulatedPayment));
    const cancelledBooking = await request(`/bookings/${booking.id}/cancel`, {
      method: 'POST',
      headers: authHeaders(passengerToken)
    });
    assert.equal(cancelledBooking.response.status, 200, cancelledBooking.data.message);
    const paymentStatus = await request(`/payments/${successfulAttempt.paymentId}`, {
      headers: authHeaders(passengerToken)
    });
    assert.equal(paymentStatus.response.status, 200, paymentStatus.data.message);
    assert.equal(paymentStatus.data.status, 'PAID', 'Simulated cancellation must not request or record a real refund.');
    const statsAfterCancellation = await request('/admin/stats', { headers: authHeaders(admin.token) });
    assert.equal(statsAfterCancellation.response.status, 200);
    assert.equal(statsAfterCancellation.data.demoPaymentAmount, revenueBefore.demoPaymentAmount);
    await checkSeatRestored(trainId, seatsBefore);
    console.log('✓ Concurrent duplicate prevention, server-validated fare, non-revenue classification, cancellation, and seat restoration');

    const expiryAttempt = await createAttempt(selectedTrain);
    const expiryUpdate = await Payment.updateOne(
      { _id: expiryAttempt.paymentId, userId: passengerId, status: 'PENDING', provider: 'SIMULATED' },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );
    assert.equal(expiryUpdate.modifiedCount, 1, 'The test must expire its own pending payment.');
    const expired = await simulate(expiryAttempt.paymentId, 'approve');
    assert.equal(expired.response.status, 200, expired.data.message);
    assert.equal(expired.data.status, 'EXPIRED');
    await checkSeatRestored(trainId, seatsBefore);
    console.log('✓ Expired seat holds cannot be completed and release inventory');

    const { response: bookingsResponse, data: bookings } = await request('/bookings', {
      headers: authHeaders(passengerToken)
    });
    assert.equal(bookingsResponse.status, 200);
    assert.ok(Array.isArray(bookings));
    assert.ok(bookings.every((booking) => booking.userId === passengerId));
    console.log('✓ Passenger booking history is scoped to the signed-in account');
  console.log('\nAll local API integration checks passed.');
}

runTests()
  .catch((err) => {
    console.error('\nAPI integration checks failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (err) {
      console.error('Integration test cleanup failed:', err.message);
      process.exitCode = 1;
    } finally {
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    }
  });
