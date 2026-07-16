/**
 * One-shot cleanup: delete ALL food items from the database.
 * Run once from backend/: node seeders/cleanup-foods.js
 * This preserves all restaurants, users, orders, and delivery partners.
 */
require('../config/env');
const mongoose = require('mongoose');
const FoodItem = require('../models/FoodItem');
const config = require('../config/env');

async function cleanup() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('MongoDB connected');

    const result = await FoodItem.deleteMany({});
    console.log(`Deleted ${result.deletedCount} food item(s) from the database.`);
    console.log('The customer menu will now be empty until a restaurant adds dishes.');
  } catch (err) {
    console.error('Cleanup error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

cleanup();
