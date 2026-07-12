const mongoose = require('mongoose');

const deliveryPartnerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    phone: {
        type: String,
        required: [true, 'Phone is required'],
        unique: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
    },
    vehicle_type: {
        type: String,
        enum: ['Bike', 'Scooter', 'Bicycle', 'Car'],
        default: 'Bike',
    },
    is_online: {
        type: Boolean,
        default: false,
    },
    current_location: {
        lat: { type: Number },
        lng: { type: Number },
        last_updated: { type: Date }
    },
    earnings: {
        type: Number,
        default: 0
    },
    sessionEarnings: {
        type: Number,
        default: 0
    },
    total_deliveries: {
        type: Number,
        default: 0
    },
    ratingCount: {
        type: Number,
        default: 0
    },
    averageRating: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
