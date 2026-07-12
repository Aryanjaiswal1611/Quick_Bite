const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const FoodItem = require('../models/FoodItem');
const User = require('../models/User');
const Order = require('../models/Order');
const DeliveryPartner = require('../models/DeliveryPartner');
const Restaurant = require('../models/Restaurant');
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { asyncHandler } = require('../utils/response');

// ── GET /api/admin/delivery-partners ────────────────────────────────────────
router.get(
  '/delivery-partners',
  ...requireAdmin,
  asyncHandler(async (_req, res) => {
    const partners = await DeliveryPartner.find({ is_online: true }).select(
      'name vehicle_type current_location phone'
    );
    return res.json({ success: true, partners });
  })
);

// ── POST /api/admin/orders/:id/assign ───────────────────────────────────────
router.post(
  '/orders/:id/assign',
  ...requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { partnerId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID.' });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      {
        delivery_partner_id: partnerId,
        'timeline.assigned_at': new Date(),
      },
      { new: true }
    ).populate('delivery_partner_id', 'name phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('status_update', {
        orderId: order._id,
        status: order.orderStatus,
      });
      io.to(`delivery_${partnerId}`).emit('order_assigned', { partnerId, order });
    }

    return res.json({
      success: true,
      order,
      message: `Assigned to ${order.delivery_partner_id.name}`,
    });
  })
);

// ── GET /api/admin/stats ────────────────────────────────────────────────────
router.get(
  '/stats',
  ...requireAdmin,
  asyncHandler(async (_req, res) => {
    const [foods, users, orders, restaurants, revenueResult] = await Promise.all([
      FoodItem.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Order.countDocuments(),
      Restaurant.countDocuments(),
      Order.aggregate([
        { $match: { orderStatus: 'Delivered' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
    ]);

    const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('userId', 'name');

    return res.json({
      success: true,
      stats: {
        foods,
        users,
        orders,
        restaurants,
        revenue: parseFloat(Number(revenue).toFixed(2)),
      },
      recentOrders,
    });
  })
);

// ── GET /api/admin/foods ────────────────────────────────────────────────────
router.get(
  '/foods',
  ...requireAdmin,
  asyncHandler(async (_req, res) => {
    const foods = await FoodItem.find()
      .populate('restaurantId', 'restaurantName branchName')
      .sort({ category: 1, food_name: 1 });
    return res.json({ success: true, foods });
  })
);

// ── POST /api/admin/foods ───────────────────────────────────────────────────
router.post(
  '/foods',
  ...requireAdmin,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const { food_name, description, price, category, is_featured, restaurantId } = req.body;
    if (!food_name || !price || !category || !restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, category, and restaurantId are required.',
      });
    }

    const imageFile = req.file ? `/images/${req.file.filename}` : '/images/default.jpg';
    await FoodItem.create({
      food_name: food_name.trim(),
      description: description ? description.trim() : '',
      price: parseFloat(price),
      category: category.trim(),
      image: imageFile,
      is_featured: !!is_featured,
      restaurantId,
    });

    return res.status(201).json({ success: true, message: 'Food item added successfully!' });
  })
);

// ── GET /api/admin/foods/:id ────────────────────────────────────────────────
router.get(
  '/foods/:id',
  ...requireAdmin,
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Not found.' });
    }
    const food = await FoodItem.findById(req.params.id);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Not found.' });
    }
    return res.json({ success: true, food });
  })
);

// ── PUT /api/admin/foods/:id ────────────────────────────────────────────────
router.put(
  '/foods/:id',
  ...requireAdmin,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Not found.' });
    }

    const { food_name, description, price, category, is_featured, restaurantId } = req.body;
    if (!food_name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and category are required.',
      });
    }

    const updates = {
      food_name: food_name.trim(),
      description: description ? description.trim() : '',
      price: parseFloat(price),
      category: category.trim(),
      is_featured: !!is_featured,
    };
    if (restaurantId) updates.restaurantId = restaurantId;
    if (req.file) updates.image = `/images/${req.file.filename}`;

    await FoodItem.findByIdAndUpdate(id, updates);
    return res.json({ success: true, message: 'Food item updated!' });
  })
);

// ── DELETE /api/admin/foods/:id ─────────────────────────────────────────────
router.delete(
  '/foods/:id',
  ...requireAdmin,
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Not found.' });
    }
    await FoodItem.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Food item deleted.' });
  })
);

// ── GET /api/admin/orders ───────────────────────────────────────────────────
router.get(
  '/orders',
  ...requireAdmin,
  asyncHandler(async (_req, res) => {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')
      .populate('restaurantId', 'restaurantName branchName');
    return res.json({ success: true, orders });
  })
);

// ── PUT /api/admin/orders/:id/status ────────────────────────────────────────
router.put(
  '/orders/:id/status',
  ...requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    await Order.findByIdAndUpdate(id, { orderStatus: status });
    return res.json({ success: true, message: `Order updated to ${status}.` });
  })
);

// ── GET /api/admin/users ────────────────────────────────────────────────────
router.get(
  '/users',
  ...requireAdmin,
  asyncHandler(async (_req, res) => {
    const users = await User.find({ role: 'user' }, '-password').sort({ createdAt: -1 });
    return res.json({ success: true, users });
  })
);

// ── GET /api/admin/restaurants ──────────────────────────────────────────────
router.get(
  '/restaurants',
  ...requireAdmin,
  asyncHandler(async (_req, res) => {
    const restaurants = await Restaurant.find().select('-password').sort({ createdAt: -1 });
    return res.json({ success: true, restaurants });
  })
);

module.exports = router;
