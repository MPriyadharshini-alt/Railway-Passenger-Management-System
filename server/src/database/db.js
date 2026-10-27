const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

const dbDir = path.resolve(__dirname, '../../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(dbDir, 'railway.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for reliability
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
`);

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'PASSENGER',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      train_number TEXT NOT NULL UNIQUE,
      train_name TEXT NOT NULL,
      source TEXT NOT NULL,
      destination TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      arrival_time TEXT NOT NULL,
      journey_date DATE NOT NULL,
      total_seats INTEGER NOT NULL,
      available_seats INTEGER NOT NULL,
      fare REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Scheduled',
      current_station TEXT,
      delay_minutes INTEGER DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_reference TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      train_id INTEGER NOT NULL,
      journey_date DATE NOT NULL,
      passenger_name TEXT NOT NULL,
      passenger_age INTEGER NOT NULL,
      passenger_gender TEXT NOT NULL,
      travel_class TEXT DEFAULT 'SL',
      seat_count INTEGER NOT NULL,
      fare REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'CONFIRMED',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      cancelled_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (train_id) REFERENCES trains(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      booking_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    );
  `);

  // Migrate travel_class if upgrading existing table
  try {
    db.exec(`ALTER TABLE bookings ADD COLUMN travel_class TEXT DEFAULT 'SL';`);
  } catch (e) {
    // Column already exists
  }
}

function seedDatabase(forceClean = false) {
  initSchema();

  if (forceClean) {
    db.exec(`
      DELETE FROM notifications;
      DELETE FROM bookings;
      DELETE FROM trains;
      DELETE FROM users;
    `);
  }

  // Check if users exist
  const countUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (countUsers.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const passengerHash = bcrypt.hashSync('DemoPassword123', salt);
    const adminHash = bcrypt.hashSync('AdminPassword123', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);

    insertUser.run('Priyadharshini M', 'passenger@example.com', passengerHash, 'PASSENGER');
    insertUser.run('Operations Controller', 'admin@example.com', adminHash, 'ADMIN');
  }

  // Check if trains exist
  const countTrains = db.prepare('SELECT COUNT(*) as count FROM trains').get();
  if (countTrains.count === 0) {
    const today = new Date().toISOString().split('T')[0];
    const getDate = (offsetDays) => {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    const insertTrain = db.prepare(`
      INSERT INTO trains (
        train_number, train_name, source, destination, 
        departure_time, arrival_time, journey_date, 
        total_seats, available_seats, fare, status, 
        current_station, delay_minutes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    // Authentic, realistic trains with exact class fare ranges
    // Sleeper (SL): ₹200–₹600 | 3A: ₹500–₹1,200 | 2A: ₹800–₹1,800 | 1A: ₹1,200–₹2,500 | CC: ₹300–₹800 | EC: ₹700–₹1,500
    const initialTrains = [
      ['12952', 'Mumbai Rajdhani Express', 'New Delhi', 'Mumbai Central', '16:55', '08:35', today, 140, 68, 950.0, 'On Time', 'Kota Junction', 0],
      ['22436', 'Vande Bharat Express', 'New Delhi', 'Varanasi', '06:00', '14:00', today, 120, 42, 680.0, 'Delayed', 'Kanpur Central', 15],
      ['12007', 'Shatabdi Express', 'Bangalore', 'Chennai Central', '06:00', '11:00', today, 110, 56, 520.0, 'On Time', 'Jolarpettai', 0],
      ['12626', 'Kerala Express', 'New Delhi', 'Chennai Central', '20:10', '04:30', today, 160, 84, 420.0, 'On Time', 'Nagpur', 0],
      ['12124', 'Deccan Queen Superfast', 'Pune', 'Mumbai Central', '07:15', '10:25', today, 100, 35, 380.0, 'Arrived', 'Mumbai Central', 0],
      ['20901', 'Vande Bharat Express', 'Mumbai Central', 'Ahmedabad', '06:00', '11:25', getDate(1), 120, 78, 650.0, 'Scheduled', 'Mumbai Central', 0],
      ['12245', 'Howrah Duronto Express', 'Howrah', 'Bangalore', '10:50', '16:00', getDate(1), 150, 95, 510.0, 'Scheduled', 'Howrah', 0],
      ['12954', 'Tejas Rajdhani Express', 'Mumbai Central', 'New Delhi', '17:05', '09:40', getDate(1), 140, 52, 990.0, 'Scheduled', 'Mumbai Central', 0],
      ['12028', 'Shatabdi Express', 'Chennai Central', 'Bangalore', '17:30', '22:30', today, 110, 64, 520.0, 'On Time', 'Katpadi', 0],
      ['12301', 'Kolkata Rajdhani Express', 'Howrah', 'New Delhi', '16:50', '10:05', getDate(2), 140, 72, 1020.0, 'Scheduled', 'Howrah', 0]
    ];

    for (const t of initialTrains) {
      insertTrain.run(...t);
    }

    // Seed realistic journey advisory notifications
    const passenger = db.prepare("SELECT id FROM users WHERE email = 'passenger@example.com'").get();
    if (passenger) {
      const insertNotif = db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `);
      insertNotif.run(
        passenger.id,
        'Welcome to Railway Passenger Digital Platform',
        'Your digital travel assistant is active. Easily search train schedules, reserve seats with real-time fare calculation, and track live train locations.',
        'GENERAL',
        0
      );
      insertNotif.run(
        passenger.id,
        'Digital Boarding Pass Guideline',
        'Passengers can present their digital PNR e-Ticket with the verification QR code directly on their smartphone during travel.',
        'GENERAL',
        0
      );
    }
  }
}

// Ensure schema is ready on import
initSchema();

module.exports = {
  db,
  initSchema,
  seedDatabase
};
