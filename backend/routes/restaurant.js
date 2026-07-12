const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const DeliveryPartner = require('../models/DeliveryPartner');
const { requireRestaurant } = require('../middleware/auth');
const { generateToken } = require('../utils/tokens');
const { normalizeEmail, isValidEmail } = require('../utils/validators');
const { asyncHandler } = require('../utils/response');

// ── POST /api/restaurant/signup ─────────────────────────────────────────────
router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { restaurantName, branchName, email, password } = req.body;
    const errors = {};

    if (!restaurantName?.trim()) errors.restaurantName = 'Restaurant name is required.';
    if (!branchName?.trim()) errors.branchName = 'Branch name is required.';
    if (!email || !isValidEmail(email)) errors.email = 'Valid email is required.';
    if (!password || password.length < 6) errors.password = 'Password must be at least 6 characters.';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const normalized = normalizeEmail(email);
    const existing = await Restaurant.findOne({ email: normalized });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered.',
        errors: { email: 'Email already registered.' },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await Restaurant.create({
      restaurantName: restaurantName.trim(),
      branchName: branchName.trim(),
      email: normalized,
      password: hashedPassword,
      isActive: false,
      isLoggedIn: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful! You can now log in.',
    });
  })
);

// ── POST /api/restaurant/login ──────────────────────────────────────────────
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const restaurant = await Restaurant.findOne({ email: normalizeEmail(email) });
    if (!restaurant) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, restaurant.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken({ id: restaurant._id, role: 'restaurant' });

    restaurant.isLoggedIn = true;
    await restaurant.save();

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      restaurant: {
        id: restaurant._id,
        name: `${restaurant.restaurantName} - ${restaurant.branchName}`,
        restaurantName: restaurant.restaurantName,
        branchName: restaurant.branchName,
        email: restaurant.email,
        isActive: restaurant.isActive,
      },
    });
  })
);

// ── GET /api/restaurant/check-auth ──────────────────────────────────────────
router.get(
  '/check-auth',
  ...requireRestaurant,
  asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findById(req.user.id).select('-password');
    if (!restaurant) {
      return res.status(401).json({ success: false, loggedIn: false, message: 'Restaurant not found' });
    }

    return res.json({
      success: true,
      loggedIn: true,
      name: `${restaurant.restaurantName} - ${restaurant.branchName}`,
      id: restaurant._id,
      isActive: restaurant.isActive,
      restaurant: {
        id: restaurant._id,
        name: `${restaurant.restaurantName} - ${restaurant.branchName}`,
        restaurantName: restaurant.restaurantName,
        branchName: restaurant.branchName,
        email: restaurant.email,
        isActive: restaurant.isActive,
      },
    });
  })
);

// ── POST /api/restaurant/logout ─────────────────────────────────────────────
router.post(
  '/logout',
  ...requireRestaurant,
  asyncHandler(async (req, res) => {
    await Restaurant.findByIdAndUpdate(req.user.id, { isLoggedIn: false });
    return res.json({ success: true, message: 'Logged out successfully' });
  })
);

// ── PATCH /api/restaurant/status ────────────────────────────────────────────
router.patch(
  '/status',
  ...requireRestaurant,
  asyncHandler(async (req, res) => {
    const isActive = !!req.body.isActive;
    await Restaurant.findByIdAndUpdate(req.user.id, { isActive });
    return res.json({
      success: true,
      message: `Restaurant is now ${isActive ? 'Online' : 'Offline'}`,
      isActive,
    });
  })
);

// ── GET /api/restaurant/delivery-partners ───────────────────────────────────
router.get(
  '/delivery-partners',
  ...requireRestaurant,
  asyncHandler(async (_req, res) => {
    const partners = await DeliveryPartner.find({ is_online: true }).select(
      'name vehicle_type current_location phone averageRating'
    );
    return res.json({ success: true, partners });
  })
);

// ── GET /api/restaurant/orders ──────────────────────────────────────────────
router.get(
  '/orders',
  ...requireRestaurant,
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ restaurantId: req.user.id })
      .populate('userId', 'name email phone')
      .populate('delivery_partner_id', 'name phone vehicle_type')
      .sort({ createdAt: -1 });
    return res.json({ success: true, orders });
  })
);

// ── POST /api/restaurant/orders/:id/accept ──────────────────────────────────
router.post(
  '/orders/:id/accept',
  ...requireRestaurant,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: id, restaurantId: req.user.id, restaurantStatus: 'Pending' },
      { restaurantStatus: 'Accepted', orderStatus: 'Preparing' },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found, already handled, or not yours.',
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('status_update', {
        orderId: order._id,
        status: order.orderStatus,
      });
    }

    return res.json({ success: true, order, message: 'Order accepted successfully.' });
  })
);

// ── POST /api/restaurant/orders/:id/reject ──────────────────────────────────
router.post(
  '/orders/:id/reject',
  ...requireRestaurant,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: id, restaurantId: req.user.id, restaurantStatus: 'Pending' },
      { restaurantStatus: 'Rejected', orderStatus: 'Cancelled' },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found, already handled, or not yours.',
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('status_update', {
        orderId: order._id,
        status: order.orderStatus,
      });
    }

    return res.json({ success: true, order, message: 'Order rejected successfully.' });
  })
);

// ── POST /api/restaurant/orders/:id/status ──────────────────────────────────
router.post(
  '/orders/:id/status',
  ...requireRestaurant,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['Preparing', 'Out for Delivery', 'Delivered'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: id, restaurantId: req.user.id },
      { orderStatus: status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('status_update', {
        orderId: order._id,
        status: order.orderStatus,
      });
    }

    return res.json({ success: true, order, message: `Status updated to ${status}.` });
  })
);

// ── POST /api/restaurant/orders/:id/assign ──────────────────────────────────
router.post(
  '/orders/:id/assign',
  ...requireRestaurant,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { partnerId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID.' });
    }

    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found.' });
    }

    const order = await Order.findOneAndUpdate(
      {
        _id: id,
        restaurantId: req.user.id,
        restaurantStatus: 'Accepted',
      },
      {
        delivery_partner_id: partnerId,
        'timeline.assigned_at': new Date(),
      },
      { new: true }
    ).populate('delivery_partner_id', 'name phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or must be accepted first.',
      });
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

// ── SSE stream for new orders ───────────────────────────────────────────────
router.get('/stream', ...requireRestaurant, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const orderEmitter = req.app.get('orderEmitter');
  const eventName = `new_order_${req.user.id}`;

  const handleOrderUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  if (orderEmitter) {
    orderEmitter.on(eventName, handleOrderUpdate);
  }

  const intervalId = setInterval(() => {
    res.write(':\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(intervalId);
    if (orderEmitter) {
      orderEmitter.removeListener(eventName, handleOrderUpdate);
    }
  });
});

module.exports = router;
