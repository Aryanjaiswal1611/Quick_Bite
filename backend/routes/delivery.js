const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const DeliveryPartner = require('../models/DeliveryPartner');
const Order = require('../models/Order');
const { requireDelivery } = require('../middleware/auth');
const { generateToken } = require('../utils/tokens');
const {
  normalizeEmail,
  isValidEmail,
  isValidPhone,
  normalizeVehicleType,
  VEHICLE_TYPES,
} = require('../utils/validators');
const { asyncHandler } = require('../utils/response');

// ── POST /api/delivery/signup ───────────────────────────────────────────────
router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { name, email, phone, password, vehicle_type } = req.body;
    const errors = {};

    if (!name?.trim()) errors.name = 'Name is required.';
    if (!email || !isValidEmail(email)) errors.email = 'Valid email is required.';
    if (!isValidPhone(phone)) errors.phone = 'Valid 10-digit phone is required.';
    if (!password || password.length < 6) errors.password = 'Password must be at least 6 characters.';

    const vehicle = normalizeVehicleType(vehicle_type);
    if (!vehicle || !VEHICLE_TYPES.includes(vehicle)) {
      errors.vehicle_type = `Vehicle type must be one of: ${VEHICLE_TYPES.join(', ')}`;
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const normalized = normalizeEmail(email);
    const existing = await DeliveryPartner.findOne({
      $or: [{ email: normalized }, { phone: String(phone).trim() }],
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone already registered.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const partner = await DeliveryPartner.create({
      name: name.trim(),
      email: normalized,
      phone: String(phone).trim(),
      vehicle_type: vehicle,
      password: hashedPassword,
    });

    const token = generateToken({ id: partner._id, role: 'delivery' }, '7d');

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      partner: {
        id: partner._id,
        name: partner.name,
        email: partner.email,
        is_online: partner.is_online,
        vehicle_type: partner.vehicle_type,
        averageRating: partner.averageRating,
      },
    });
  })
);

// ── POST /api/delivery/login ────────────────────────────────────────────────
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

    const partner = await DeliveryPartner.findOne({ email: normalizeEmail(email) });
    if (!partner) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, partner.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken({ id: partner._id, role: 'delivery' }, '7d');

    partner.sessionEarnings = 0;
    await partner.save();

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      partner: {
        id: partner._id,
        name: partner.name,
        email: partner.email,
        is_online: partner.is_online,
        vehicle_type: partner.vehicle_type,
        averageRating: partner.averageRating,
        earnings: partner.earnings,
        total_deliveries: partner.total_deliveries,
      },
    });
  })
);

// ── GET /api/delivery/me ────────────────────────────────────────────────────
router.get(
  '/me',
  ...requireDelivery,
  asyncHandler(async (req, res) => {
    const partner = await DeliveryPartner.findById(req.user.id).select('-password');
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }
    return res.json({ success: true, partner });
  })
);

// ── POST /api/delivery/toggle-status ────────────────────────────────────────
router.post(
  '/toggle-status',
  ...requireDelivery,
  asyncHandler(async (req, res) => {
    const is_online = !!req.body.is_online;
    const partner = await DeliveryPartner.findByIdAndUpdate(
      req.user.id,
      { is_online },
      { new: true }
    ).select('-password');

    return res.json({
      success: true,
      is_online: partner.is_online,
      partner,
      message: `You are now ${partner.is_online ? 'online' : 'offline'}`,
    });
  })
);

// ── GET /api/delivery/orders ────────────────────────────────────────────────
router.get(
  '/orders',
  ...requireDelivery,
  asyncHandler(async (req, res) => {
    const orders = await Order.find({
      delivery_partner_id: req.user.id,
      orderStatus: { $in: ['Preparing', 'Out for Delivery'] },
    })
      .populate('restaurantId', 'restaurantName branchName')
      .sort({ createdAt: -1 });

    return res.json({ success: true, orders });
  })
);

// ── POST /api/delivery/orders/:id/status ────────────────────────────────────
router.post(
  '/orders/:id/status',
  ...requireDelivery,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, verificationCode } = req.body;
    const validStatuses = ['Picked Up', 'Out for Delivery', 'Delivered'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findOne({ _id: id, delivery_partner_id: req.user.id });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    if (status === 'Delivered') {
      if (!verificationCode) {
        return res.status(400).json({
          success: false,
          message: 'Verification code is required',
        });
      }
      if (String(order.verificationCode).trim() !== String(verificationCode).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Incorrect verification code. Access denied.',
        });
      }
    }

    const updateData = {};
    if (status === 'Picked Up' || status === 'Out for Delivery') {
      updateData.orderStatus = 'Out for Delivery';
      if (status === 'Picked Up') {
        updateData['timeline.picked_up_at'] = new Date();
      }
    } else if (status === 'Delivered') {
      updateData.orderStatus = 'Delivered';
      updateData['timeline.delivered_at'] = new Date();
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: id, delivery_partner_id: req.user.id },
      updateData,
      { new: true }
    );

    if (status === 'Delivered') {
      await DeliveryPartner.findByIdAndUpdate(req.user.id, {
        $inc: { earnings: 50, sessionEarnings: 50, total_deliveries: 1 },
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${updatedOrder._id}`).emit('status_update', {
        orderId: updatedOrder._id,
        status: updatedOrder.orderStatus,
      });
    }

    return res.json({ success: true, order: updatedOrder, message: `Order marked as ${status}` });
  })
);

// ── GET /api/delivery/earnings ──────────────────────────────────────────────
router.get(
  '/earnings',
  ...requireDelivery,
  asyncHandler(async (req, res) => {
    const partner = await DeliveryPartner.findById(req.user.id).select(
      'earnings sessionEarnings total_deliveries'
    );
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }
    return res.json({ success: true, earnings: partner });
  })
);

// ── POST /api/delivery/logout ───────────────────────────────────────────────
router.post(
  '/logout',
  ...requireDelivery,
  asyncHandler(async (req, res) => {
    await DeliveryPartner.findByIdAndUpdate(req.user.id, {
      is_online: false,
      sessionEarnings: 0,
    });
    return res.json({ success: true, message: 'Logged out successfully' });
  })
);

module.exports = router;
