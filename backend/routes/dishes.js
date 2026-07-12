const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const FoodItem = require('../models/FoodItem');
const { requireRestaurant } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { asyncHandler } = require('../utils/response');

// ── GET /api/dishes/restaurant/:restaurantId ────────────────────────────────
router.get(
  '/restaurant/:restaurantId',
  asyncHandler(async (req, res) => {
    const { restaurantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ success: false, message: 'Invalid Restaurant ID.' });
    }

    const dishes = await FoodItem.find({ restaurantId }).sort({ createdAt: -1 });
    return res.json({ success: true, dishes });
  })
);

// ── POST /api/dishes ────────────────────────────────────────────────────────
router.post(
  '/',
  ...requireRestaurant,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const { food_name, description, price, category, is_featured } = req.body;
    const restaurantId = req.user.id;

    if (!food_name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and category are required.',
      });
    }

    const imageFile = req.file ? `/images/${req.file.filename}` : '/images/default.jpg';

    const dish = await FoodItem.create({
      food_name: food_name.trim(),
      description: description ? description.trim() : '',
      price: parseFloat(price),
      category: category.trim(),
      image: imageFile,
      is_featured: is_featured === 'true' || is_featured === true,
      restaurantId,
      availability: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Dish added successfully!',
      dish,
    });
  })
);

// ── PUT /api/dishes/:id ─────────────────────────────────────────────────────
router.put(
  '/:id',
  ...requireRestaurant,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Dish ID.' });
    }

    const { food_name, description, price, category, is_featured, availability } = req.body;

    const updates = {};
    if (food_name) updates.food_name = food_name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (price) updates.price = parseFloat(price);
    if (category) updates.category = category.trim();
    if (is_featured !== undefined) {
      updates.is_featured = is_featured === 'true' || is_featured === true;
    }
    if (availability !== undefined) {
      updates.availability = availability === 'true' || availability === true;
    }
    if (req.file) updates.image = `/images/${req.file.filename}`;

    const dish = await FoodItem.findOneAndUpdate(
      { _id: id, restaurantId: req.user.id },
      updates,
      { new: true }
    );

    if (!dish) {
      return res.status(404).json({
        success: false,
        message: 'Dish not found or unauthorized.',
      });
    }

    return res.json({ success: true, message: 'Dish updated successfully!', dish });
  })
);

// ── DELETE /api/dishes/:id ──────────────────────────────────────────────────
router.delete(
  '/:id',
  ...requireRestaurant,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Dish ID.' });
    }

    const dish = await FoodItem.findOneAndDelete({ _id: id, restaurantId: req.user.id });
    if (!dish) {
      return res.status(404).json({
        success: false,
        message: 'Dish not found or unauthorized.',
      });
    }

    return res.json({ success: true, message: 'Dish deleted successfully!' });
  })
);

// ── PATCH /api/dishes/:id/availability ──────────────────────────────────────
router.patch(
  '/:id/availability',
  ...requireRestaurant,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { availability } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Dish ID.' });
    }

    const dish = await FoodItem.findOneAndUpdate(
      { _id: id, restaurantId: req.user.id },
      { availability: !!availability },
      { new: true }
    );

    if (!dish) {
      return res.status(404).json({
        success: false,
        message: 'Dish not found or unauthorized.',
      });
    }

    return res.json({
      success: true,
      message: `Dish availability updated to ${dish.availability ? 'Available' : 'Out of Stock'}`,
      dish,
    });
  })
);

module.exports = router;
