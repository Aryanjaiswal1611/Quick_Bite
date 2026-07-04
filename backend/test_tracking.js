const mongoose = require('mongoose');
const Order = require('./models/Order');

const connectDB = require('./config/db');

async function testOrderTracking() {
    try {
        await connectDB();
        console.log('Connected to DB.');

        // 1. Create a dummy order
        const mockUserId = new mongoose.Types.ObjectId();
        const mockRestaurantId = new mongoose.Types.ObjectId();
        const order = new Order({
            userId: mockUserId,
            restaurantId: mockRestaurantId,
            items: [{
                food_id: new mongoose.Types.ObjectId(),
                food_name: 'Test Pizza',
                price: 100,
                quantity: 2
            }],
            totalPrice: 200,
            delivery_name: 'Test User',
            delivery_phone: '1234567890',
            delivery_address: '123 Test St',
            verificationCode: '1234'
        });

        const savedOrder = await order.save();
        console.log('Order created with status:', savedOrder.orderStatus);

        // 2. Fetch it
        const fetchedOrder = await Order.findById(savedOrder._id);
        console.log('Fetched default status:', fetchedOrder.orderStatus);

        // 3. Update status
        fetchedOrder.orderStatus = 'Out for Delivery';
        await fetchedOrder.save();
        console.log('Updated status to:', fetchedOrder.orderStatus);

        // 4. Verify again
        const finalOrder = await Order.findById(savedOrder._id);
        console.log('Final verified status:', finalOrder.orderStatus);

        // Cleanup
        await Order.findByIdAndDelete(savedOrder._id);
        console.log('Cleanup done.');

        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

testOrderTracking();
