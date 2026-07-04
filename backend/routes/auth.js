const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

// Helper to generate JWT
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: '1d' }
    );
};

// ── POST /api/signup ─────────────────────────────────────────
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, confirm_password, phone } = req.body;
        const errors = {};

        // Validation
        if (!name?.trim()) errors.name = 'Full name is required.';
        if (!email) {
            errors.email = 'Email is required.';
        } else if (!/^\S+@\S+\.\S+$/.test(email)) {
            errors.email = 'Invalid email address.';
        }
        if (!password || password.length < 6) errors.password = 'Password must be at least 6 characters.';
        if (password !== confirm_password) errors.confirm = 'Passwords do not match.';

        if (Object.keys(errors).length > 0) {
            return res.json({ success: false, errors });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check duplicate email
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.json({ success: false, errors: { email: 'This email is already registered.' } });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            phone: phone?.trim() || '',
            role: 'user'
        });

        const token = generateToken(user);

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            redirect: '/menu.html?welcome=1'
        });

    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// ── POST /api/login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.json({ success: false, message: 'Please fill in all fields.' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.json({ success: false, message: 'Invalid email or password.' });
        }

        const token = generateToken(user);
        const redirect = user.role === 'admin' ? '/admin/dashboard.html' : '/menu.html';

        res.json({
            success: true,
            token,
            redirect,
            user: {
                id: user._id,
                name: user.name,
                role: user.role
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// ── POST /api/logout ─────────────────────────────────────────
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: "Logged out successfully",
        redirect: "/login.html"
    });
});

// ── GET /api/me ─────────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('name email role');
        if (!user) return res.status(404).json({ loggedIn: false });
        res.json({
            loggedIn: true,
            user_id: user._id,
            user_name: user.name,
            role: user.role
        });
    } catch (err) {
        console.error('Me route error:', err);
        res.status(500).json({ loggedIn: false });
    }
});

module.exports = router;