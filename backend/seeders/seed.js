/**
 * Seed demo data for QuickBite.
 * Run from backend/: npm run seed
 *
 * NOTE: This script only seeds accounts (admin, customer, restaurant, delivery partner).
 * Menu items are NOT seeded — they must be added by restaurants through the dashboard.
 */
require('../config/env');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const DeliveryPartner = require('../models/DeliveryPartner');
const Cart = require('../models/Cart');
const config = require('../config/env');

async function upsertUser({ name, email, password, role, phone }) {
  const hashed = await bcrypt.hash(password, 10);
  return User.findOneAndUpdate(
    { email },
    { name, email, password: hashed, role, phone: phone || '' },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
}

async function seed() {
  try {
    await mongoose.connect(config.mongoUri);
    // eslint-disable-next-line no-console
    console.log('MongoDB connected');

    await Cart.deleteMany({});

    const admin = await upsertUser({
      name: 'Admin',
      email: 'admin@food.com',
      password: 'admin123',
      role: 'admin',
    });

    const customer = await upsertUser({
      name: 'Demo Customer',
      email: 'customer@quickbite.com',
      password: 'password123',
      role: 'user',
      phone: '9876543210',
    });

    const restaurantPassword = await bcrypt.hash('password123', 10);
    const restaurant = await Restaurant.findOneAndUpdate(
      { email: 'kitchen@quickbite.com' },
      {
        restaurantName: 'QuickBite Kitchen',
        branchName: 'Downtown',
        email: 'kitchen@quickbite.com',
        password: restaurantPassword,
        isLoggedIn: false,
        isActive: false,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    const deliveryPassword = await bcrypt.hash('password123', 10);
    const partner = await DeliveryPartner.findOneAndUpdate(
      { email: 'rider@quickbite.com' },
      {
        name: 'Demo Rider',
        email: 'rider@quickbite.com',
        phone: '9123456780',
        password: deliveryPassword,
        vehicle_type: 'Bike',
        is_online: true,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    // eslint-disable-next-line no-console
    console.log('Seed complete');
    // eslint-disable-next-line no-console
    console.log('─────────────────────────────────────────');
    // eslint-disable-next-line no-console
    console.log('Demo accounts (password: password123 unless noted)');
    // eslint-disable-next-line no-console
    console.log(`  Admin:      admin@food.com / admin123  (${admin._id})`);
    // eslint-disable-next-line no-console
    console.log(`  Customer:   customer@quickbite.com     (${customer._id})`);
    // eslint-disable-next-line no-console
    console.log(`  Restaurant: kitchen@quickbite.com      (${restaurant._id})`);
    // eslint-disable-next-line no-console
    console.log(`  Delivery:   rider@quickbite.com        (${partner._id})`);
    // eslint-disable-next-line no-console
    console.log('  Food items: 0 (add dishes via the restaurant dashboard)');
    // eslint-disable-next-line no-console
    console.log('─────────────────────────────────────────');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Seed error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
