const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const EventEmitter = require('events');

const config = require('./config/env');
const connectDB = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const foodRoutes = require('./routes/food');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const restaurantRoutes = require('./routes/restaurant');
const dishRoutes = require('./routes/dishes');
const deliveryRoutes = require('./routes/delivery');
const paymentRoutes = require('./routes/payment');
const feedbackRoutes = require('./routes/feedback');

const app = express();
const server = http.createServer(app);
const orderEmitter = new EventEmitter();
app.set('orderEmitter', orderEmitter);

// Trust proxy — required for Render, Vercel, and other PaaS deployments
// so that rate limiting, sessions, and IP-based features see the real client IP.
app.set('trust proxy', 1);

// ── Database ─────────────────────────────────────────────────────────────────
(async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('FATAL: Database connection failed — server will start but all DB operations will fail.');
    console.error(err);
  }
})();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

// ── CORS ────────────────────────────────────────────────────────────────────
// Build the allowed-origins list from env vars + localhost dev URLs.
const buildAllowedOrigins = () => {
  const set = new Set();

  // Dev URLs — always allowed
  set.add('http://localhost:5173');
  set.add('http://localhost:3000');
  set.add('http://127.0.0.1:5173');

  // CLIENT_URL — should be the production frontend URL (set on Render dashboard)
  if (config.clientUrl) {
    config.clientUrl.split(',').forEach((u) => set.add(u.trim()));
  }

  // CORS_ORIGIN — if a specific list is given (not '*'), add them
  if (config.corsOrigin && config.corsOrigin !== '*') {
    config.corsOrigin.split(',').forEach((o) => set.add(o.trim()));
  }

  return Array.from(set);
};

const allowedOrigins = buildAllowedOrigins();
const isOriginAllowed = (origin) => {
  if (!origin || origin === 'null') return true; // server-to-server, Postman, file://
  if (config.corsOrigin === '*') return true;     // reflect mode — all origins allowed
  return allowedOrigins.includes(origin);
};

// ── Manual CORS middleware ─────────────────────────────────────────────────
// This runs before ANY other middleware (including the cors npm package) and
// guarantees CORS headers are present on every response. On Render (and other
// PaaS hosts) this is the most reliable approach because it does not depend on
// the cors package's callback internals or streaming behavior.
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Vary', 'Origin');
  } else if (origin) {
    // eslint-disable-next-line no-console
    console.warn(`[CORS] Blocked origin: "${origin}" — add this to the CORS_ORIGIN or CLIENT_URL env var on Render`);
  }

  // Respond immediately to preflight — never let it reach any route or rate limiter
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// ── cors npm package (belt + suspenders) ───────────────────────────────────
// The manual middleware above already handles everything. This is just an
// additional layer that may pick up edge cases the manual middleware misses.
const corsOptions = {
  origin: config.corsOrigin === '*' ? true : allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// ── Request logging ─────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  // eslint-disable-next-line no-console
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} — origin: ${req.headers.origin || 'same-origin'}`);
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Rate limiting ───────────────────────────────────────────────────────────
function skipPreflight(_req) {
  return _req.method === 'OPTIONS';
}

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.isProduction ? 300 : 1000,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
});

app.use(globalLimiter);

// ── Session (legacy support; primary auth is JWT) ───────────────────────────
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.isProduction,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: config.isProduction ? 'none' : 'lax',
    },
  })
);

// ── Static assets ───────────────────────────────────────────────────────────
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use(express.static(path.join(__dirname, 'public')));

// Production: serve built React app
const frontendDist = path.join(__dirname, '../frontend/dist');
const hasFrontendBuild = fs.existsSync(path.join(frontendDist, 'index.html'));
if (hasFrontendBuild) {
  app.use(express.static(frontendDist));
}

// ── API routes ──────────────────────────────────────────────────────────────
app.use('/api/login', authLimiter);
app.use('/api/signup', authLimiter);
app.use('/api/restaurant/login', authLimiter);
app.use('/api/restaurant/signup', authLimiter);
app.use('/api/delivery/login', authLimiter);
app.use('/api/delivery/signup', authLimiter);

app.use('/api', authRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/feedback', feedbackRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'QuickBite API is healthy',
    data: {
      env: config.nodeEnv,
      timestamp: new Date().toISOString(),
    },
  });
});

// ── Socket.IO ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: config.corsOrigin === '*' ? true : allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.set('io', io);

io.on('connection', (socket) => {
  socket.on('join_order_room', (orderId) => {
    if (orderId) socket.join(`order_${orderId}`);
  });

  socket.on('join_restaurant_room', (restaurantId) => {
    if (restaurantId) socket.join(`restaurant_${restaurantId}`);
  });

  socket.on('join_delivery_room', (partnerId) => {
    if (partnerId) socket.join(`delivery_${partnerId}`);
  });

  socket.on('delivery_location_update', (data) => {
    if (!data?.orderId) return;
    io.to(`order_${data.orderId}`).emit('location_update', {
      lat: data.lat,
      lng: data.lng,
      time: new Date(),
    });
  });
});

// ── Error / 404 for API ─────────────────────────────────────────────────────
app.use(notFoundHandler);

// SPA fallback (non-API)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  if (hasFrontendBuild) {
    return res.sendFile(path.join(frontendDist, 'index.html'));
  }
  return res.status(404).json({
    success: false,
    message: 'Frontend build not found. Run `npm run build` in the frontend folder, or use the Vite dev server.',
  });
});

app.use(errorHandler);

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log('=================================');
  // eslint-disable-next-line no-console
  console.log('QuickBite Server Running');
  // eslint-disable-next-line no-console
  console.log(`http://localhost:${config.port}`);
  // eslint-disable-next-line no-console
  console.log(`Environment: ${config.nodeEnv}`);
  // eslint-disable-next-line no-console
  console.log(`CORS origin mode: ${config.corsOrigin === '*' ? 'reflect (any origin allowed)' : config.corsOrigin}`);
  // eslint-disable-next-line no-console
  console.log('=================================');
});

module.exports = { app, server };
