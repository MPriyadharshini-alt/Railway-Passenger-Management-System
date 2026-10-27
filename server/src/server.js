const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { connectDB } = require('./database/mongo');
const { seedDatabase } = require('./database/seed');
const authRoutes = require('./routes/auth.routes');
const trainRoutes = require('./routes/train.routes');
const bookingRoutes = require('./routes/booking.routes');
const paymentRoutes = require('./routes/payments.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');
const Payment = require('./models/Payment');
const { rateLimit } = require('express-rate-limit');
const helmet = require('helmet');
const { expirePendingPayments } = require('./services/payments.service');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const configuredOrigins = process.env.CORS_ORIGINS;
const configuredOriginList = configuredOrigins
  ? configuredOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];
const localDevelopmentOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];
const allowedOrigins = isProduction
  ? configuredOriginList
  : [...new Set([...configuredOriginList, ...localDevelopmentOrigins])];

if (isProduction && (!configuredOrigins || allowedOrigins.length === 0)) {
  throw new Error('Set CORS_ORIGINS to the deployed frontend origin in production.');
}

app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      ...(isProduction ? { upgradeInsecureRequests: [] } : {})
    }
  }
}));
const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key']
});
app.use((req, res, next) => {
  const origin = req.get('Origin');
  const requestOrigin = `${req.protocol}://${req.get('host')}`;
  if (origin && origin === requestOrigin) return next();
  return corsMiddleware(req, res, next);
});
app.use(express.json({ limit: '100kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Try again later.' }
});
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many payment attempts. Try again later.' }
});
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/payments', paymentLimiter);

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });
}

// API Health Check
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'unavailable',
    service: 'Railway Passenger Digital Platform API',
    version: '2.0.0',
    database: mongoose.connection.readyState === 1 ? 'MongoDB Connected' : 'MongoDB Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/trains', trainRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Serve Frontend in Production or if client/dist exists
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`Serving static client files from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.resolve(clientDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      message: 'Railway Passenger Digital Platform API is running.',
      frontend: 'Run "npm run dev:client" for development frontend.',
      healthCheck: '/api/health'
    });
  });
}

// Central 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found.' });
});

// Central Error Handler
app.use((err, req, res, next) => {
  if (err.message === 'Origin is not allowed by CORS.') {
    return res.status(403).json({ message: 'Origin is not allowed by CORS.' });
  }
  console.error('Unhandled server error:', err);
  res.status(500).json({
    message: 'An unexpected server error occurred. Please try again later.'
  });
});

// Start server only after connecting to MongoDB
async function startServer() {
  await connectDB();
  await Payment.init();
  if (process.env.NODE_ENV !== 'production') {
    await seedDatabase();
  } else {
    console.log('Production mode: automatic demo-data seeding is disabled.');
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚆 Railway Passenger Digital Platform Server is running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🧪 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🗄️  Database: MongoDB`);
    console.log(`=======================================================`);
  });

  const expiryTimer = setInterval(() => {
    expirePendingPayments().catch((err) => {
      console.error('Pending payment expiry sweep failed:', err.message);
    });
  }, 60 * 1000);
  expiryTimer.unref();

  const shutdown = (signal) => {
    console.log(`${signal} received; shutting down gracefully.`);
    clearInterval(expiryTimer);
    server.close(() => {
      require('mongoose').disconnect().finally(() => process.exit(0));
    });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

startServer();

module.exports = app;
