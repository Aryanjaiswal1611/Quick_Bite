const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { generateToken } = require('../utils/tokens');
const { normalizeEmail, isValidEmail } = require('../utils/validators');
const { asyncHandler } = require('../utils/response');

// ── POST /api/signup ────────────────────────────────────────────────────────
router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { name, email, password, confirm_password, phone } = req.body;
    const errors = {};

    if (!name?.trim()) errors.name = 'Full name is required.';
    if (!email) {
      errors.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Invalid email address.';
    }
    if (!password || password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
    if (password !== confirm_password) {
      errors.confirm = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      // eslint-disable-next-line no-console
      console.error(`[SIGNUP] Validation failed for ${email || '(no email)'}:`, errors);
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      // eslint-disable-next-line no-console
      console.error(`[SIGNUP] Duplicate email attempted: ${normalizedEmail}`);
      return res.status(400).json({
        success: false,
        message: 'This email is already registered.',
        errors: { email: 'This email is already registered.' },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone?.trim() || '',
      role: 'user',
    });

    const token = generateToken({ id: user._id, role: user.role });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      redirect: '/menu',
    });
  })
);

// ── POST /api/login ─────────────────────────────────────────────────────────
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      // eslint-disable-next-line no-console
      console.error('[LOGIN] Missing fields — email or password not provided');
      return res.status(400).json({
        success: false,
        message: 'Please fill in all fields.',
      });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      // eslint-disable-next-line no-console
      console.error(`[LOGIN] Failed login attempt for email: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken({ id: user._id, role: user.role });
    const redirect = user.role === 'admin' ? '/menu' : '/menu';

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      redirect,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  })
);

// ── POST /api/logout ────────────────────────────────────────────────────────
router.post('/logout', (_req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully',
    redirect: '/login',
  });
});

// ── GET /api/me ─────────────────────────────────────────────────────────────
router.get(
  '/me',
  verifyToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('name email role phone');
    if (!user) {
      return res.status(401).json({ success: false, loggedIn: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      loggedIn: true,
      user_id: user._id,
      user_name: user.name,
      email: user.email,
      role: user.role,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  })
);

module.exports = router;
