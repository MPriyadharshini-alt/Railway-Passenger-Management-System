/**
 * Admin Provisioning Script
 * =========================
 * Creates or securely resets the administrator account.
 *
 * Usage:
 *   node scripts/provision-admin.js
 *
 * Environment variables (set in server/.env):
 *   ADMIN_EMAIL    — defaults to admin@example.com
 *   ADMIN_PASSWORD — REQUIRED (min 8 chars)
 *   ADMIN_NAME     — defaults to "Operations Controller"
 *   MONGODB_URI    — defaults to mongodb://127.0.0.1:27017/railway_platform
 *
 * Security:
 *   • Passwords are always bcrypt-hashed (cost 12)
 *   • Will NOT overwrite an existing admin unless --reset flag is passed
 *   • Never logs plaintext passwords
 *
 * Example:
 *   $env:ADMIN_PASSWORD="MySecurePassword@2026"; node scripts/provision-admin.js
 *   # Force reset:
 *   $env:ADMIN_PASSWORD="NewPassword@2026"; node scripts/provision-admin.js --reset
 */

require('../server/node_modules/dotenv').config({ path: require('path').resolve(__dirname, '../server/.env') });
const mongoose = require('../server/node_modules/mongoose');

async function provision() {
  // Dynamic require to support running from root
  let bcrypt, User;
  try {
    bcrypt = require('../server/node_modules/bcryptjs');
    const connectDB = require('./server/src/database/mongo').connectDB;
    await connectDB();
    User = require('./server/src/models/User');
  } catch (e) {
    console.error('Failed to load modules. Run: npm --prefix server install');
    console.error(e.message);
    process.exit(1);
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const adminName = process.env.ADMIN_NAME || 'Operations Controller';
  const forceReset = process.argv.includes('--reset');

  if (!adminPassword || adminPassword.length < 8) {
    console.error('❌ ADMIN_PASSWORD environment variable is required and must be at least 8 characters.');
    console.error('   Set it with: $env:ADMIN_PASSWORD="YourSecurePassword@2026"');
    process.exit(1);
  }

  const existing = await User.findOne({ email: adminEmail });

  if (existing && !forceReset) {
    console.log(`ℹ️  Admin account already exists: ${adminEmail}`);
    console.log('   Use --reset flag to force password reset.');
    await mongoose.disconnect();
    return;
  }

  const hash = await bcrypt.hash(adminPassword, 12);

  if (existing) {
    await User.findByIdAndUpdate(existing._id, { passwordHash: hash, name: adminName, role: 'ADMIN' });
    console.log(`✅ Admin password reset for: ${adminEmail}`);
  } else {
    await User.create({ name: adminName, email: adminEmail, passwordHash: hash, role: 'ADMIN' });
    console.log(`✅ Admin account created: ${adminEmail}`);
  }

  console.log('🔒 Password stored as bcrypt hash (cost 12). Never stored in plaintext.');
  await mongoose.disconnect();
}

provision().catch((err) => {
  console.error('Provisioning failed:', err.message);
  process.exit(1);
});
