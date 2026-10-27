/**
 * Database seed script — populates MongoDB with sample data if it is empty.
 * Safe to run multiple times (idempotent — checks before inserting).
 */

const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const User = require('../models/User');
const Train = require('../models/Train');
const Notification = require('../models/Notification');

function getDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function seedDatabase() {
  try {
    // ── Users ──────────────────────────────────────────────────
    const existingUsers = await User.countDocuments();
    if (existingUsers === 0) {
      console.log('🌱 Seeding users...');
      const salt = await bcrypt.genSalt(10);
      const passengerHash = await bcrypt.hash('DemoPassword123', salt);
      const adminHash = await bcrypt.hash('AdminPassword123', salt);

      const passenger = await User.create({
        name: 'Priyadharshini M',
        email: 'passenger@example.com',
        passwordHash: passengerHash,
        role: 'PASSENGER'
      });

      await User.create({
        name: 'Operations Controller',
        email: 'admin@example.com',
        passwordHash: adminHash,
        role: 'ADMIN'
      });

      // Welcome notification for demo passenger
      await Notification.create({
        userId: passenger._id,
        title: 'Welcome to Railway Passenger Digital Platform',
        message:
          'Your digital travel assistant is active. Easily search train schedules, reserve seats with real-time fare calculation, and track train locations.',
        type: 'GENERAL'
      });

      await Notification.create({
        userId: passenger._id,
        title: 'Digital Boarding Pass Guideline',
        message:
          'Passengers can present their digital PNR e-Ticket with the verification QR code directly on their smartphone during travel.',
        type: 'GENERAL'
      });

      console.log('✅ Users seeded (passenger@example.com / DemoPassword123, admin@example.com / AdminPassword123)');
    }

    // ── Trains ─────────────────────────────────────────────────
    const existingTrains = await Train.countDocuments();
    if (existingTrains === 0) {
      console.log('🌱 Seeding trains...');
      const today = getDateOffset(0);

      const trainsData = [
        {
          trainNumber: '12952',
          trainName: 'Mumbai Rajdhani Express',
          source: 'New Delhi',
          destination: 'Mumbai Central',
          departureTime: '16:55',
          arrivalTime: '08:35',
          journeyDate: today,
          totalSeats: 140,
          availableSeats: 68,
          fare: 950.0,
          status: 'On Time',
          currentStation: 'Kota Junction',
          delayMinutes: 0
        },
        {
          trainNumber: '22436',
          trainName: 'Vande Bharat Express',
          source: 'New Delhi',
          destination: 'Varanasi',
          departureTime: '06:00',
          arrivalTime: '14:00',
          journeyDate: today,
          totalSeats: 120,
          availableSeats: 42,
          fare: 680.0,
          status: 'Delayed',
          currentStation: 'Kanpur Central',
          delayMinutes: 15
        },
        {
          trainNumber: '12007',
          trainName: 'Shatabdi Express',
          source: 'Bangalore',
          destination: 'Chennai Central',
          departureTime: '06:00',
          arrivalTime: '11:00',
          journeyDate: today,
          totalSeats: 110,
          availableSeats: 56,
          fare: 520.0,
          status: 'On Time',
          currentStation: 'Jolarpettai',
          delayMinutes: 0
        },
        {
          trainNumber: '12626',
          trainName: 'Kerala Express',
          source: 'New Delhi',
          destination: 'Chennai Central',
          departureTime: '20:10',
          arrivalTime: '04:30',
          journeyDate: today,
          totalSeats: 160,
          availableSeats: 84,
          fare: 420.0,
          status: 'On Time',
          currentStation: 'Nagpur',
          delayMinutes: 0
        },
        {
          trainNumber: '12124',
          trainName: 'Deccan Queen Superfast',
          source: 'Pune',
          destination: 'Mumbai Central',
          departureTime: '07:15',
          arrivalTime: '10:25',
          journeyDate: today,
          totalSeats: 100,
          availableSeats: 35,
          fare: 380.0,
          status: 'Arrived',
          currentStation: 'Mumbai Central',
          delayMinutes: 0
        },
        {
          trainNumber: '20901',
          trainName: 'Vande Bharat Express',
          source: 'Mumbai Central',
          destination: 'Ahmedabad',
          departureTime: '06:00',
          arrivalTime: '11:25',
          journeyDate: getDateOffset(1),
          totalSeats: 120,
          availableSeats: 78,
          fare: 650.0,
          status: 'Scheduled',
          currentStation: 'Mumbai Central',
          delayMinutes: 0
        },
        {
          trainNumber: '12245',
          trainName: 'Howrah Duronto Express',
          source: 'Howrah',
          destination: 'Bangalore',
          departureTime: '10:50',
          arrivalTime: '16:00',
          journeyDate: getDateOffset(1),
          totalSeats: 150,
          availableSeats: 95,
          fare: 510.0,
          status: 'Scheduled',
          currentStation: 'Howrah',
          delayMinutes: 0
        },
        {
          trainNumber: '12954',
          trainName: 'Tejas Rajdhani Express',
          source: 'Mumbai Central',
          destination: 'New Delhi',
          departureTime: '17:05',
          arrivalTime: '09:40',
          journeyDate: getDateOffset(1),
          totalSeats: 140,
          availableSeats: 52,
          fare: 990.0,
          status: 'Scheduled',
          currentStation: 'Mumbai Central',
          delayMinutes: 0
        },
        {
          trainNumber: '12028',
          trainName: 'Shatabdi Express',
          source: 'Chennai Central',
          destination: 'Bangalore',
          departureTime: '17:30',
          arrivalTime: '22:30',
          journeyDate: today,
          totalSeats: 110,
          availableSeats: 64,
          fare: 520.0,
          status: 'On Time',
          currentStation: 'Katpadi',
          delayMinutes: 0
        },
        {
          trainNumber: '12301',
          trainName: 'Kolkata Rajdhani Express',
          source: 'Howrah',
          destination: 'New Delhi',
          departureTime: '16:50',
          arrivalTime: '10:05',
          journeyDate: getDateOffset(2),
          totalSeats: 140,
          availableSeats: 72,
          fare: 1020.0,
          status: 'Scheduled',
          currentStation: 'Howrah',
          delayMinutes: 0
        }
      ];

      await Train.insertMany(trainsData);
      console.log(`✅ ${trainsData.length} sample trains seeded (demonstration data)`);
    }
  } catch (err) {
    console.error('Seed error:', err.message);
    throw err;
  }
}

module.exports = { seedDatabase };

if (require.main === module) {
  const { connectDB } = require('./mongo');
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    console.error('Refusing to add demo records in production. Set ALLOW_DEMO_SEED=true only for a controlled setup.');
    process.exit(1);
  }

  connectDB()
    .then(seedDatabase)
    .then(() => require('mongoose').disconnect())
    .catch(async (err) => {
      console.error('Seed command failed:', err.message);
      await require('mongoose').disconnect();
      process.exitCode = 1;
    });
}
