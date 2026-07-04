const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema({
    food_name: {
        type: String,
        required: [true, 'Food name is required'],
        trim: true,
    },
    description: {
        type: String,
        default: '',
        trim: true,
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative'],
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true,
    },
    image: {
        type: String,
        default: '/images/default.jpg',
    },
    is_featured: {
        type: Boolean,
        default: false,
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: [true, 'Restaurant ID is required'],
    },
    availability: {
        type: Boolean,
        default: true
    },
    orderCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('FoodItem', foodItemSchema);
