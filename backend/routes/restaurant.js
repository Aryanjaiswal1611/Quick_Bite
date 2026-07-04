const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const DeliveryPartner = require('../models/DeliveryPartner');
const bcrypt = require('bcryptjs');

const { verifyToken, authorize, JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Minimal Middleware for Restaurant Auth (JWT-based)
const requireRestaurant = [verifyToken, authorize('restaurant')];

// ── GET /api/restaurant/delivery-partners ──────────────────────────────────────
router.get('/delivery-partners', requireRestaurant, async (req, res) => {
    try {
        const partners = await DeliveryPartner.find({ is_online: true }).select('name vehicle_type current_location phone');
        res.json({ success: true, partners });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error fetching partners.' });
    }
});

// ── POST /api/restaurant/orders/:id/assign ────────────────────────────────────
router.post('/orders/:id/assign', requireRestaurant, async (req, res) => {
    try {
        const { id } = req.params;
        const { partnerId } = req.body;
        
        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(partnerId)) {
            return res.status(400).json({ success: false, message: 'Invalid ID.' });
        }

        const order = await Order.findByIdAndUpdate(
            id,
            { 
                delivery_partner_id: partnerId,
                'timeline.assigned_at': new Date()
            },
            { new: true }
        ).populate('delivery_partner_id', 'name phone');

        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        const io = req.app.get('io');
        io.to(`order_${order._id}`).emit('status_update', { orderId: order._id, status: order.orderStatus });
        io.to(`delivery_${partnerId}`).emit('order_assigned', { partnerId, order });

        res.json({ success: true, order, message: `Assigned to ${order.delivery_partner_id.name}` });
    } catch (err) {
        console.error('Assign order error:', err);
        res.status(500).json({ success: false, message: 'Server error assigning order.' });
    }
});

// ── POST /api/restaurant/signup ───────────────────────────────────────────────
router.post('/signup', async (req, res) => {
    try {
        const { restaurantName, branchName, email, password } = req.body;
        
        const existing = await Restaurant.findOne({ email });
        if (existing) return res.status(400).json({ success: false, message: 'Email already registered.' });
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const restaurant = new Restaurant({
            restaurantName,
            branchName,
            email,
            password: hashedPassword
        });
        
        await restaurant.save();
        res.json({ success: true, message: 'Registration successful! You can now log in.' });
    } catch (err) {
        console.error('Restaurant signup error:', err);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

// ── POST /api/restaurant/login ────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body; // Using email now instead of username
        
        const restaurant = await Restaurant.findOne({ email });
        if (!restaurant) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        
        const isMatch = await bcrypt.compare(password, restaurant.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        
        // Create Token
        const token = jwt.sign({ id: restaurant._id, role: 'restaurant' }, JWT_SECRET, { expiresIn: '1d' });

        // Update login status in DB
        restaurant.isLoggedIn = true;
        await restaurant.save();

        res.json({ 
            success: true, 
            token,
            restaurant: { id: restaurant._id, name: `${restaurant.restaurantName} - ${restaurant.branchName}` },
            message: 'Login successful' 
        });
    } catch (err) {
        console.error('Restaurant login error:', err);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// ── GET /api/restaurant/check-auth ──────────────────────────────────────────
router.get('/check-auth', verifyToken, authorize('restaurant'), async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.user.id);
        if (!restaurant) return res.json({ success: false, loggedIn: false });
        res.json({ 
            success: true, 
            loggedIn: true, 
            name: `${restaurant.restaurantName} - ${restaurant.branchName}`, 
            id: restaurant._id,
            isActive: restaurant.isActive
        });
    } catch (err) {
        res.json({ success: false, loggedIn: false });
    }
});

// ── POST /api/restaurant/logout ───────────────────────────────────────────────
router.post('/logout', verifyToken, authorize('restaurant'), async (req, res) => {
    try {
        await Restaurant.findByIdAndUpdate(req.user.id, { isLoggedIn: false });
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        console.error('Restaurant logout error:', err);
        res.status(500).json({ success: false, message: 'Server error during logout.' });
    }
});

// ── PATCH /api/restaurant/status ──────────────────────────────────────────────
router.patch('/status', ...requireRestaurant, async (req, res) => {
    try {
        const { isActive } = req.body;
        await Restaurant.findByIdAndUpdate(req.user.id, { isActive });
        res.json({ success: true, message: `Restaurant is now ${isActive ? 'Online' : 'Offline'}` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error updating status' });
    }
});

router.get('/stream', requireRestaurant, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const orderEmitter = req.app.get('orderEmitter');

    const handleOrderUpdate = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    if (orderEmitter) {
        orderEmitter.on(`new_order_${req.user.id}`, handleOrderUpdate);
    }

    const intervalId = setInterval(() => { res.write(':\n\n'); }, 15000);

    req.on('close', () => {
        clearInterval(intervalId);
        if (orderEmitter) {
            orderEmitter.removeListener(`new_order_${req.user.id}`, handleOrderUpdate);
        }
    });
});

// ── GET /api/restaurant/orders ────────────────────────────────────────────────
router.get('/orders', requireRestaurant, async (req, res) => {
    try {
        const orders = await Order.find({ restaurantId: req.user.id })
                                  .populate('userId', 'name email phone')
                                  .sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (err) {
        console.error('Fetch restaurant orders error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching orders.' });
    }
});

// ── POST /api/restaurant/orders/:id/accept ────────────────────────────────────
router.post('/orders/:id/accept', requireRestaurant, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ success: false, message: 'Invalid order ID.' });

        const order = await Order.findByIdAndUpdate(
            id,
            { restaurantStatus: 'Accepted', orderStatus: 'Preparing' },
            { new: true }
        );

        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        const io = req.app.get('io');
        io.to(`order_${order._id}`).emit('status_update', { orderId: order._id, status: order.orderStatus });

        res.json({ success: true, order, message: 'Order accepted successfully.' });
    } catch (err) {
        console.error('Accept order error:', err);
        res.status(500).json({ success: false, message: 'Server error accepting order.' });
    }
});

// ── POST /api/restaurant/orders/:id/reject ────────────────────────────────────
router.post('/orders/:id/reject', requireRestaurant, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ success: false, message: 'Invalid order ID.' });

        const order = await Order.findByIdAndUpdate(
            id,
            { restaurantStatus: 'Rejected', orderStatus: 'Cancelled' },
            { new: true }
        );

        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        const io = req.app.get('io');
        io.to(`order_${order._id}`).emit('status_update', { orderId: order._id, status: order.orderStatus });

        res.json({ success: true, order, message: 'Order rejected successfully.' });
    } catch (err) {
        console.error('Reject order error:', err);
        res.status(500).json({ success: false, message: 'Server error rejecting order.' });
    }
});

// ── POST /api/restaurant/orders/:id/status ────────────────────────────────────
router.post('/orders/:id/status', requireRestaurant, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['Preparing', 'Out for Delivery', 'Delivered'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status.' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ success: false, message: 'Invalid order ID.' });

        const order = await Order.findByIdAndUpdate(
            id,
            { orderStatus: status },
            { new: true }
        );

        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        const io = req.app.get('io');
        io.to(`order_${order._id}`).emit('status_update', { orderId: order._id, status: order.orderStatus });

        res.json({ success: true, order, message: `Status updated to ${status}.` });
    } catch (err) {
        console.error('Update order status error:', err);
        res.status(500).json({ success: false, message: 'Server error updating status.' });
    }
});

module.exports = router;
