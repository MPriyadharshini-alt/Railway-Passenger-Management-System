const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ message: 'Name is required.' });
    }

    if (typeof email !== 'string' || !email.trim() || email.trim().length > 254) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'Password must be at least 12 characters and no more than 72 UTF-8 bytes.' });
    }

    // Check duplicate email (case-insensitive via schema lowercase: true)
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const session = await mongoose.startSession();
    session.startTransaction();

    // Role is always PASSENGER on public registration — never trust client-supplied role
    let user;
    try {
      [user] = await User.create([{
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role: 'PASSENGER'
      }], { session });

      await Notification.create([{
        userId: user._id,
        title: 'Welcome to Railway Passenger Platform',
        message: 'Your account has been registered successfully. Explore trains and plan your journey now!',
        type: 'GENERAL'
      }], { session });
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      if (err.code === 11000) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
      }
      throw err;
    } finally {
      await session.endSession();
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: 'PASSENGER' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || !email.trim() || email.trim().length > 254) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    if (typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'Password is required.' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

module.exports = router;
