const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const FoodItem = require('../models/FoodItem');
const User = require('../models/User');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const DeliveryPartner = require('../models/DeliveryPartner');
const { verifyToken, authorize } = require('../middleware/auth');
const requireAdmin = [verifyToken, authorize('admin')];

// ── GET /api/admin/delivery-partners ──────────────────────────────────────
router.get('/delivery-partners', ...requireAdmin, async (req, res) => {
    try {
        const partners = await DeliveryPartner.find({ is_online: true }).select('name vehicle_type current_location phone');
        res.json({ success: true, partners });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error fetching partners.' });
    }
});

// ── POST /api/admin/orders/:id/assign ────────────────────────────────────
router.post('/orders/:id/assign', ...requireAdmin, async (req, res) => {
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

// ── Multer config for food image uploads ─────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(__dirname, '../../public/images');
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `food_${Date.now()}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        cb(null, allowed.includes(file.mimetype));
    },
});

// ── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', ...requireAdmin, async (req, res) => {
    try {
        const [foods, users, orders, revenueResult] = await Promise.all([
            FoodItem.countDocuments(),
            User.countDocuments({ role: 'user' }),
            Order.countDocuments(),
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

        res.json({
            success: true,
            stats: { foods, users, orders, revenue: parseFloat(revenue.toFixed(2)) },
            recentOrders,
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── GET /api/admin/foods ─────────────────────────────────────────────────────
router.get('/foods', ...requireAdmin, async (req, res) => {
    try {
        const foods = await FoodItem.find().sort({ category: 1, food_name: 1 });
        res.json({ success: true, foods });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── POST /api/admin/foods ─────────────────────────────────────────────────────
router.post('/foods', ...requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { food_name, description, price, category, is_featured, restaurantId } = req.body;
        if (!food_name || !price || !category || !restaurantId)
            return res.json({ success: false, message: 'Name, price, category, and restaurantId are required.' });

        const imageFile = req.file ? `/images/${req.file.filename}` : '/images/default.jpg';

        const food = await FoodItem.create({
            food_name: food_name.trim(),
            description: description ? description.trim() : '',
            price: parseFloat(price),
            category: category.trim(),
            image: imageFile,
            is_featured: !!is_featured,
            restaurantId
        });
        res.json({ success: true, message: 'Food item added successfully!' });
    } catch (err) {
        console.error('Admin add food error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── GET /api/admin/foods/:id ──────────────────────────────────────────────────
router.get('/foods/:id', ...requireAdmin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id))
            return res.status(404).json({ success: false, message: 'Not found.' });

        const food = await FoodItem.findById(req.params.id);
        if (!food) return res.status(404).json({ success: false, message: 'Not found.' });
        res.json({ success: true, food });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── PUT /api/admin/foods/:id ──────────────────────────────────────────────────
router.put('/foods/:id', ...requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(404).json({ success: false, message: 'Not found.' });

        const { food_name, description, price, category, is_featured } = req.body;
        if (!food_name || !price || !category)
            return res.json({ success: false, message: 'Name, price, and category are required.' });

        const { restaurantId, ...otherUpdates } = req.body;
        const updates = { ...otherUpdates };
        if (restaurantId) updates.restaurantId = restaurantId;

        if (req.file) updates.image = `/images/${req.file.filename}`;

        const food = await FoodItem.findByIdAndUpdate(id, updates, { new: true });
        res.json({ success: true, message: 'Food item updated!' });
    } catch (err) {
        console.error('Admin update food error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── DELETE /api/admin/foods/:id ───────────────────────────────────────────────
router.delete('/foods/:id', ...requireAdmin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id))
            return res.status(404).json({ success: false, message: 'Not found.' });

        await FoodItem.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Food item deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── GET /api/admin/orders ─────────────────────────────────────────────────────
router.get('/orders', ...requireAdmin, async (req, res) => {
    try {
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .populate('userId', 'name email');
        res.json({ success: true, orders });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── PUT /api/admin/orders/:id/status ─────────────────────────────────────────
router.put('/orders/:id/status', ...requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const allowed = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];

        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(404).json({ success: false, message: 'Order not found.' });
        if (!allowed.includes(status))
            return res.json({ success: false, message: 'Invalid status.' });

        await Order.findByIdAndUpdate(id, { orderStatus: status });
        res.json({ success: true, message: `Order updated to ${status}.` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/users', ...requireAdmin, async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }, '-password').sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
