const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateFare } = require('../src/services/pricing');

test('authoritative fares apply class multipliers and class bounds', () => {
  assert.equal(calculateFare(950, '3A', 2), 1900);
  assert.equal(calculateFare(950, 'SL', 1), 428);
  assert.equal(calculateFare(100, '1A', 1), 1200);
  assert.throws(() => calculateFare(500, 'INVALID', 1), /Unsupported travel class/);
});
