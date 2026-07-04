const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');

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

const EventEmitter = require('events');
const orderEmitter = new EventEmitter();
app.set('orderEmitter', orderEmitter);

const PORT = process.env.PORT || 8000;

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const globalLimiter = rateLimit({
    windowMs: 10 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 10 sec',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(globalLimiter);

app.use(session({
    secret: process.env.SESSION_SECRET || 'quickbite_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(express.static(path.join(__dirname, '../public')));

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

const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_order_room', (orderId) => {
        socket.join(`order_${orderId}`);
        console.log(`Socket joined order_${orderId}`);
    });

    socket.on('join_restaurant_room', (restaurantId) => {
        socket.join(`restaurant_${restaurantId}`);
        console.log(`Restaurant room joined: ${restaurantId}`);
    });

    socket.on('delivery_location_update', (data) => {
        io.to(`order_${data.orderId}`).emit('location_update', {
            lat: data.lat,
            lng: data.lng,
            time: new Date()
        });
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

server.listen(PORT, () => {
    console.log('=================================');
    console.log(`🚀 QuickBite Server Running`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log('=================================');
});
