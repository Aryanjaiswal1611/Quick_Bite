const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const Order = require('../models/Order');
const DeliveryPartner = require('../models/DeliveryPartner');
const { requireUser } = require('../middleware/auth');
const { asyncHandler } = require('../utils/response');

// ── POST /api/feedback/submit ───────────────────────────────────────────────
router.post(
  '/submit',
  ...requireUser,
  asyncHandler(async (req, res) => {
    const { orderId, rating, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating between 1 and 5 is required.',
      });
    }

    const order = await Order.findOne({ _id: orderId, userId: req.user.id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    if (order.orderStatus !== 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be given for delivered orders.',
      });
    }
    if (order.feedbackId) {
      return res.status(400).json({
        success: false,
        message: 'Feedback already submitted for this order.',
      });
    }

    const feedback = await Feedback.create({
      orderId,
      userId: req.user.id,
      restaurantId: order.restaurantId,
      deliveryPartnerId: order.delivery_partner_id,
      rating,
      comment: comment?.trim() || '',
    });

    order.feedbackId = feedback._id;
    await order.save();

    if (order.delivery_partner_id) {
      const partner = await DeliveryPartner.findById(order.delivery_partner_id);
      if (partner) {
        const totalRating = partner.averageRating * partner.ratingCount + Number(rating);
        partner.ratingCount += 1;
        partner.averageRating = Number((totalRating / partner.ratingCount).toFixed(1));
        await partner.save();
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully.',
      feedback,
    });
  })
);

// ── GET /api/feedback/rider/:riderId ────────────────────────────────────────
router.get(
  '/rider/:riderId',
  asyncHandler(async (req, res) => {
    const { riderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(riderId)) {
      return res.status(400).json({ success: false, message: 'Invalid rider ID.' });
    }
    const reviews = await Feedback.find({ deliveryPartnerId: riderId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });
    return res.json({ success: true, reviews });
  })
);

module.exports = router;
