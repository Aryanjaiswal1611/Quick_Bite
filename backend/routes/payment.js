const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { verifyToken, requireUser } = require('../middleware/auth');
const config = require('../config/env');
const { asyncHandler } = require('../utils/response');

const razorpay = new Razorpay({
  key_id: config.razorpayKeyId,
  key_secret: config.razorpayKeySecret,
});

const isDummyKeys = () =>
  !process.env.RAZORPAY_KEY_ID || String(config.razorpayKeyId).includes('dummy');

// ── POST /api/payments/process ──────────────────────────────────────────────
router.post(
  '/process',
  ...requireUser,
  asyncHandler(async (req, res) => {
    const { orderId, method, paymentGateway = 'None', transactionId = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    const order = await Order.findOne({ _id: orderId, userId: req.user.id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const payment = await Payment.create({
      orderId,
      userId: req.user.id,
      amount: order.totalPrice,
      method,
      paymentGateway,
      transactionId,
      status: method === 'COD' ? 'Pending' : 'Completed',
    });

    if (payment.status === 'Completed') {
      order.paymentStatus = 'Paid';
      await order.save();
    }

    return res.json({
      success: true,
      message: `Payment ${payment.status}`,
      payment,
    });
  })
);

// ── GET /api/payments/order/:orderId ────────────────────────────────────────
router.get(
  '/order/:orderId',
  ...requireUser,
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const payment = await Payment.findOne({ orderId, userId: req.user.id }).sort({
      createdAt: -1,
    });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }
    return res.json({ success: true, payment });
  })
);

// ── POST /api/payments/create-order ─────────────────────────────────────────
router.post(
  '/create-order',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    if (isDummyKeys()) {
      return res.json({
        success: true,
        order: {
          id: `order_mock_${Date.now()}`,
          amount: Math.round(Number(amount) * 100),
          currency: 'INR',
        },
        isDummy: true,
        key: config.razorpayKeyId,
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100),
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
    });

    return res.json({
      success: true,
      order,
      isDummy: false,
      key: config.razorpayKeyId,
    });
  })
);

// ── POST /api/payments/verify-payment ───────────────────────────────────────
router.post(
  '/verify-payment',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, isDummy } = req.body;

    if (isDummy || isDummyKeys()) {
      return res.json({
        success: true,
        message: 'Mock payment verified successfully.',
      });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      return res.json({ success: true, message: 'Payment verified successfully.' });
    }

    return res.status(400).json({ success: false, message: 'Invalid payment signature' });
  })
);

module.exports = router;
