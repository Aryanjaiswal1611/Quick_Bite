const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const FoodItem = require('../models/FoodItem');
const DeliveryPartner = require('../models/DeliveryPartner');
const Restaurant = require('../models/Restaurant');
const { verifyToken, requireUser, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../utils/response');

// ── POST /api/orders/place ──────────────────────────────────────────────────
router.post(
  '/place',
  ...requireUser,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const {
      delivery_name,
      delivery_phone,
      delivery_address,
      payment_method,
      upiId,
      cardNumber,
      paymentStatus,
      transactionId,
    } = req.body;

    if (!delivery_name || !delivery_phone || !delivery_address) {
      return res.status(400).json({
        success: false,
        message: 'All delivery fields are required.',
      });
    }

    if (payment_method === 'upi' && !upiId) {
      return res.status(400).json({
        success: false,
        message: 'UPI ID is required for UPI payment.',
      });
    }

    if (payment_method === 'card' && !cardNumber) {
      return res.status(400).json({
        success: false,
        message: 'Card number is required for Card payment.',
      });
    }

    let cartItems = await Cart.find({ user_id: userId }).populate('food_id');
    cartItems = cartItems.filter((ci) => ci.food_id);

    if (!cartItems.length) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty or the items are no longer available.',
      });
    }

    const restaurantId = cartItems[0].food_id?.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Items in cart are not associated with a restaurant.',
      });
    }

    // Ensure single-restaurant cart
    const multiRestaurant = cartItems.some(
      (ci) => String(ci.food_id.restaurantId) !== String(restaurantId)
    );
    if (multiRestaurant) {
      return res.status(400).json({
        success: false,
        message: 'Cart contains items from multiple restaurants. Please order from one restaurant at a time.',
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found. Please try again.',
      });
    }

    const items = cartItems.map((ci) => ({
      food_id: ci.food_id._id,
      food_name: ci.food_id.food_name,
      price: ci.food_id.price,
      quantity: ci.quantity,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const delivery = 30.0;
    const total_price = parseFloat((subtotal + delivery).toFixed(2));
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const methodLabel =
      payment_method === 'online' || payment_method === 'Online Payment'
        ? 'Online Payment'
        : 'Cash on Delivery';

    const order = await Order.create({
      userId,
      restaurantId,
      items,
      totalPrice: total_price,
      delivery_name,
      delivery_phone,
      delivery_address,
      payment_method: methodLabel,
      paymentDetails: {
        upiId: upiId || '',
        cardNumber: cardNumber ? `****${String(cardNumber).slice(-4)}` : '',
        transactionId: transactionId || '',
      },
      paymentStatus: paymentStatus || (methodLabel === 'Online Payment' ? 'Paid' : 'Pending'),
      orderStatus: 'Placed',
      restaurantStatus: 'Pending',
      estimatedDeliveryTime: '30-45 mins',
      verificationCode,
    });

    await Promise.all(
      items.map((item) =>
        FoodItem.findByIdAndUpdate(item.food_id, {
          $inc: { orderCount: item.quantity },
        })
      )
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant_${order.restaurantId}`).emit('new_order', order);
    }

    const orderEmitter = req.app.get('orderEmitter');
    if (orderEmitter) {
      orderEmitter.emit(`new_order_${order.restaurantId}`, order);
    }

    await Cart.deleteMany({ user_id: userId });

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order_id: order._id,
      order,
      redirect: `/order-success?order_id=${order._id}`,
    });
  })
);

// ── GET /api/orders/history ─────────────────────────────────────────────────
router.get(
  '/history',
  ...requireUser,
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ userId: req.user.id })
      .populate('restaurantId', 'restaurantName branchName')
      .populate('delivery_partner_id', 'name phone averageRating')
      .sort({ createdAt: -1 });
    return res.json({ success: true, orders });
  })
);

// ── GET /api/orders – admin only ────────────────────────────────────────────
router.get(
  '/',
  ...requireAdmin,
  asyncHandler(async (_req, res) => {
    const orders = await Order.find()
      .populate('userId', 'name email')
      .populate('restaurantId', 'restaurantName branchName')
      .sort({ createdAt: -1 });
    return res.json({ success: true, orders });
  })
);

// ── GET /api/orders/:id ─────────────────────────────────────────────────────
router.get(
  '/:id',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = await Order.findById(id)
      .populate('delivery_partner_id', 'name averageRating phone')
      .populate('restaurantId', 'restaurantName branchName');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Customer can only view own orders; restaurant/delivery/admin with assignment access
    const role = req.user.role;
    const isOwner = String(order.userId) === String(req.user.id);
    const isRestaurant = role === 'restaurant' && String(order.restaurantId?._id || order.restaurantId) === String(req.user.id);
    const isDelivery =
      role === 'delivery' && String(order.delivery_partner_id?._id || order.delivery_partner_id) === String(req.user.id);
    const isAdmin = role === 'admin';

    if (!isOwner && !isRestaurant && !isDelivery && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    const payload = {
      success: true,
      order,
    };

    // Only customer and delivery need verification code visibility
    if (isOwner || isDelivery || isAdmin) {
      payload.verificationCode = order.verificationCode;
    }

    return res.json(payload);
  })
);

// ── POST /api/orders/:id/rate-delivery ──────────────────────────────────────
router.post(
  '/:id/rate-delivery',
  ...requireUser,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Valid rating between 1 and 5 is required.',
      });
    }

    const order = await Order.findOne({ _id: id, userId: req.user.id });
    if (!order || order.orderStatus !== 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate delivered orders.',
      });
    }

    const partnerId = order.delivery_partner_id;
    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'No delivery partner assigned to this order.',
      });
    }

    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found.' });
    }

    const oldAvg = partner.averageRating || 0;
    const oldCount = partner.ratingCount || 0;
    const newCount = oldCount + 1;
    const newAvg = (oldAvg * oldCount + Number(rating)) / newCount;

    partner.ratingCount = newCount;
    partner.averageRating = Number(newAvg.toFixed(1));
    await partner.save();

    return res.json({
      success: true,
      message: 'Rating submitted successfully!',
      averageRating: partner.averageRating,
    });
  })
);

module.exports = router;
