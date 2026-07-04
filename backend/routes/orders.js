const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const FoodItem = require('../models/FoodItem');
const DeliveryPartner = require('../models/DeliveryPartner');
const Restaurant = require('../models/Restaurant');
const { verifyToken } = require('../middleware/auth');

// ── POST /api/orders/place ────────────────────────────────────────────────────
router.post('/place', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { delivery_name, delivery_phone, delivery_address, payment_method, upiId, cardNumber, paymentStatus, transactionId } = req.body;

        if (!delivery_name || !delivery_phone || !delivery_address) {
            return res.json({ success: false, message: 'All delivery fields are required.' });
        }

        if (payment_method === 'upi' && !upiId) {
            return res.json({ success: false, message: 'UPI ID is required for UPI payment.' });
        }

        if (payment_method === 'card' && !cardNumber) {
            return res.json({ success: false, message: 'Card number is required for Card payment.' });
        }

        // Fetch cart with food info and restaurantId
        let cartItems = await Cart.find({ user_id: userId }).populate('food_id');
        
        // FILTER: Remove any items where the food record no longer exists (orphaned refs)
        cartItems = cartItems.filter(ci => ci.food_id);
        
        if (!cartItems.length) {
            return res.json({ success: false, message: 'Your cart is empty or the items are no longer available.' });
        }

        // Get restaurantId from the first item
        const restaurantId = cartItems[0].food_id?.restaurantId;

        if (!restaurantId) {
            return res.json({ success: false, message: 'Error: Items in cart are not associated with a restaurant.' });
        }

        // Check restaurant exists
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.json({ success: false, message: 'Restaurant not found. Please try again.' });
        }

        // Build order items
        const items = cartItems.map(ci => ({
            food_id: ci.food_id._id,
            food_name: ci.food_id.food_name,
            price: ci.food_id.price,
            quantity: ci.quantity,
        }));

        const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const delivery = 30.00;
        const total_price = parseFloat((subtotal + delivery).toFixed(2));
        const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();


        // Create order
        let order;
        try {
            order = await Order.create({
                userId: userId,
                restaurantId: restaurantId,
                items,
                totalPrice: total_price,
                delivery_name,
                delivery_phone,
                delivery_address,
                payment_method: (payment_method === 'online' ? 'Online Payment' : 'Cash on Delivery'),
                paymentDetails: {
                    upiId: upiId || '',
                    cardNumber: cardNumber || '',
                    transactionId: transactionId || ''
                },
                paymentStatus: paymentStatus || 'Pending',
                orderStatus: 'Placed',
                restaurantStatus: 'Pending',
                estimatedDeliveryTime: '30-45 mins',
                verificationCode: verificationCode,
            });
        } catch (dbErr) {
            console.error('Order creation DB error:', dbErr);
            return res.json({ success: false, message: 'Database error while creating order.' });
        }

        // Increment orderCount for each food item
        for (const item of items) {
            await FoodItem.findByIdAndUpdate(item.food_id, {
                $inc: { orderCount: item.quantity }
            });
        }

        const io = req.app.get('io');
        io.to(`restaurant_${order.restaurantId}`).emit('new_order', order);

        const orderEmitter = req.app.get('orderEmitter');
        if (orderEmitter) {
            orderEmitter.emit(`new_order_${order.restaurantId}`, order);
        }

        // Clear cart
        await Cart.deleteMany({ user_id: userId });

        res.json({
            success: true,
            order_id: order._id,
            redirect: `/order_success.html?order_id=${order._id}`,
        });
    } catch (err) {
        console.error('Order place error:', err);
        res.status(500).json({ success: false, message: 'Order placement failed. Please try again.' });
    }
});

// ── GET /api/orders/history ───────────────────────────────────────────────────
router.get('/history', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const orders = await Order.find({ userId: userId }).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (err) {
        console.error('Order history error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── GET /api/orders – all orders (admin/dashboard) ───────────────────────────
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find().populate('userId', 'name email').sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (err) {
        console.error('Fetch all orders error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching orders.' });
    }
});

// ── GET /api/orders/restaurant/:restaurantId ──────────────────────────────────
router.get('/restaurant/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
            return res.status(400).json({ success: false, message: 'Invalid Restaurant ID.' });
        }

        const orders = await Order.find({ restaurantId })
            .populate('userId', 'name email phone')
            .sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (err) {
        console.error('Fetch restaurant orders error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching orders.' });
    }
});

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(404).json({ success: false, message: 'Order not found.' });

        const order = await Order.findOne({ _id: id, userId: userId }).populate('delivery_partner_id', 'name averageRating phone');
        if (!order)
            return res.status(404).json({ success: false, message: 'Order not found.' });

        res.json({ success: true, order, verificationCode: order.verificationCode });
    } catch (err) {
        console.error('Order by ID error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── POST /api/orders/:id/rate-delivery ────────────────────────────────────────
router.post('/:id/rate-delivery', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { rating } = req.body; // 1 to 5

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Valid rating between 1 and 5 is required.' });
        }

        const order = await Order.findOne({ _id: id, userId: userId });
        if (!order || order.orderStatus !== 'Delivered') {
            return res.status(400).json({ success: false, message: 'Can only rate delivered orders.' });
        }

        const partnerId = order.delivery_partner_id;
        if (!partnerId) {
            return res.status(400).json({ success: false, message: 'No delivery partner assigned to this order.' });
        }

        const partner = await DeliveryPartner.findById(partnerId);
        if (!partner) {
            return res.status(404).json({ success: false, message: 'Delivery partner not found.' });
        }

        const oldAvg = partner.averageRating || 0;
        const oldCount = partner.ratingCount || 0;
        const newCount = oldCount + 1;
        const newAvg = ((oldAvg * oldCount) + Number(rating)) / newCount;

        partner.ratingCount = newCount;
        partner.averageRating = Number(newAvg.toFixed(1));
        await partner.save();

        res.json({ success: true, message: 'Rating submitted successfully!', averageRating: partner.averageRating });
    } catch (err) {
        console.error('Rating error:', err);
        res.status(500).json({ success: false, message: 'Server error submitting rating.' });
    }
});

module.exports = router;
