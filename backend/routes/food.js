const express = require('express');
const router = express.Router();
const FoodItem = require('../models/FoodItem');
const { asyncHandler } = require('../utils/response');

// ── GET /api/foods ──────────────────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const foods = await FoodItem.find({ availability: true })
      .populate('restaurantId', 'restaurantName branchName isLoggedIn isActive')
      .sort({ category: 1, food_name: 1 });
    return res.json({ success: true, foods });
  })
);

// ── GET /api/foods/categories ───────────────────────────────────────────────
router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await FoodItem.distinct('category', { availability: true });
    return res.json({ success: true, categories: categories.sort() });
  })
);

// ── GET /api/foods/featured ─────────────────────────────────────────────────
router.get(
  '/featured',
  asyncHandler(async (_req, res) => {
    const foods = await FoodItem.find({ availability: true, is_featured: true })
      .populate('restaurantId', 'restaurantName branchName isLoggedIn isActive')
      .limit(6);
    return res.json({ success: true, foods });
  })
);

// ── GET /api/foods/recommended ──────────────────────────────────────────────
router.get(
  '/recommended',
  asyncHandler(async (_req, res) => {
    const foods = await FoodItem.find({ availability: true })
      .populate('restaurantId', 'restaurantName branchName isLoggedIn isActive')
      .sort({ orderCount: -1 })
      .limit(4);
    return res.json({ success: true, foods });
  })
);

// ── GET /api/foods/:id ──────────────────────────────────────────────────────
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const food = await FoodItem.findById(req.params.id).populate(
      'restaurantId',
      'restaurantName branchName isLoggedIn isActive'
    );
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found.' });
    }
    return res.json({ success: true, food });
  })
);

module.exports = router;
