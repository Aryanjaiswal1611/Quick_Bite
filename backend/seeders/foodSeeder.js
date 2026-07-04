/**
 * Food Item Seeder
 * Run from the backend/ directory: node seeders/foodSeeder.js
 * Seeds 20 sample food items across multiple categories with proper Unsplash images.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const FoodItem = require('../models/FoodItem');
const Restaurant = require('../models/Restaurant');
const bcrypt = require('bcryptjs');

const sampleFoods = [
    // ── Burgers ──────────────────────────────────────────────────────────────
    {
        food_name: 'Classic Beef Burger',
        description: 'Juicy beef patty with lettuce, tomato, cheese, and our secret sauce in a toasted brioche bun.',
        price: 149,
        category: 'Burgers',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
        is_featured: true,
    },
    {
        food_name: 'Spicy Chicken Burger',
        description: 'Crispy fried chicken with jalapeños, sriracha mayo, and pickles on a sesame bun.',
        price: 129,
        category: 'Burgers',
        image: 'https://images.unsplash.com/photo-1615719413546-198b25453f85?w=600&q=80',
        is_featured: true,
    },
    {
        food_name: 'Veggie Delight Burger',
        description: 'Grilled veggie patty with avocado, lettuce, tomato, and chipotle sauce.',
        price: 109,
        category: 'Burgers',
        image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&q=80',
        is_featured: false,
    },
    {
        food_name: 'Double Decker Burger',
        description: 'Two massive patties, double cheese, and caramlized onions. Not for the faint-hearted.',
        price: 199,
        category: 'Burgers',
        image: 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=600&q=80',
        is_featured: true,
    },

    // ── Pizza ─────────────────────────────────────────────────────────────────
    {
        food_name: 'Margherita Pizza',
        description: 'Classic pizza with tomato sauce, fresh mozzarella, and basil on a thin crust.',
        price: 199,
        category: 'Pizza',
        image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80',
        is_featured: true,
    },
    {
        food_name: 'Pepperoni Feast',
        description: 'Loaded with double pepperoni, mozzarella, and a rich tomato base.',
        price: 249,
        category: 'Pizza',
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80',
        is_featured: true,
    },
    {
        food_name: 'BBQ Chicken Pizza',
        description: 'Grilled chicken, BBQ sauce, onions, and smoky cheddar on a thick crust.',
        price: 229,
        category: 'Pizza',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
        is_featured: false,
    },
    {
        food_name: 'Pesto Veggie Pizza',
        description: 'Basil pesto base, sun-dried tomatoes, spinach, and goat cheese.',
        price: 269,
        category: 'Pizza',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80',
        is_featured: false,
    },

    // ── Chinese ───────────────────────────────────────────────────────────────
    {
        food_name: 'Vegetable Fried Rice',
        description: 'Wok-tossed rice with seasonal vegetables, egg, and soy sauce.',
        price: 119,
        category: 'Chinese',
        image: 'https://images.unsplash.com/photo-1627308595229-7830f5c9100f?w=600&q=80',
        is_featured: false,
    },
    {
        food_name: 'Hakka Noodles',
        description: 'Stir-fried noodles with vegetables and a savory Indo-Chinese sauce.',
        price: 129,
        category: 'Chinese',
        image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&q=80',
        is_featured: true,
    },
    {
        food_name: 'Chicken Manchurian',
        description: 'Crispy chicken balls in a tangy, spicy Manchurian gravy.',
        price: 159,
        category: 'Chinese',
        image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600&q=80',
        is_featured: false,
    },
    {
        food_name: 'Chilli Paneer',
        description: 'Diced paneer stir-fried with capsicum, onions, and spicy chilli sauce.',
        price: 149,
        category: 'Chinese',
        image: 'https://images.unsplash.com/photo-1551881192-002d027b20f9?w=600&q=80',
        is_featured: true,
    },

    // ── Desserts ──────────────────────────────────────────────────────────────
    {
        food_name: 'Chocolate Lava Cake',
        description: 'Warm chocolate cake with a gooey molten centre, served with vanilla ice cream.',
        price: 89,
        category: 'Desserts',
        image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&q=80',
        is_featured: true,
    },
    {
        food_name: 'Cold Coffee Sundae',
        description: 'Rich cold coffee topped with vanilla ice cream, chocolate drizzle, and nuts.',
        price: 79,
        category: 'Desserts',
        image: 'https://images.unsplash.com/photo-1563805042-7684c8e9e533?w=600&q=80',
        is_featured: false,
    },
    {
        food_name: 'Gulab Jamun',
        description: 'Soft milk-solid dumplings soaked in rose-flavoured sugar syrup. Served warm.',
        price: 59,
        category: 'Desserts',
        image: 'https://images.unsplash.com/photo-1589114471223-fa0041261d71?w=600&q=80',
        is_featured: false,
    },
    {
        food_name: 'Classic Cheesecake',
        description: 'New York style cheesecake with a buttery graham cracker crust.',
        price: 129,
        category: 'Desserts',
        image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&q=80',
        is_featured: true,
    },

    // ── Drinks ────────────────────────────────────────────────────────────────
    {
        food_name: 'Fresh Mango Shake',
        description: 'Thick, creamy mango milkshake made with Alphonso mangoes.',
        price: 69,
        category: 'Drinks',
        image: 'https://images.unsplash.com/photo-1625553556755-aed7a40306ea?w=600&q=80',
        is_featured: false,
    },
    {
        food_name: 'Masala Lemonade',
        description: 'Refreshing lemonade with mint, black salt, and a hint of chilli.',
        price: 49,
        category: 'Drinks',
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&q=80',
        is_featured: false,
    },
    {
        food_name: 'Cold Brew Coffee',
        description: 'Smooth, low-acidity cold brew steeped for 16 hours. Served over ice.',
        price: 89,
        category: 'Drinks',
        image: 'https://images.unsplash.com/photo-1461023058943-07cb1ce8e121?w=600&q=80',
        is_featured: true,
    },
    {
        food_name: 'Berry Smoothie',
        description: 'Mixed strawberries, raspberries, and blueberries blended with Greek yogurt.',
        price: 99,
        category: 'Drinks',
        image: 'https://images.unsplash.com/photo-1553530666-ba11a7ddbb58?w=600&q=80',
        is_featured: false,
    },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/food_delivery');
        console.log('✅ MongoDB Connected');

        // Delete existing foods and cart items to prevent duplicates and broken refs
        await FoodItem.deleteMany({});
        try {
            await mongoose.connection.collection('carts').deleteMany({});
        } catch (e) {
            // collection might not exist yet
        }
        console.log('🗑️  Cleared existing food items and carts to reset image URLs');

        // Create or find default seed restaurant so validation doesn't fail
        let restaurant = await Restaurant.findOne({ email: 'kitchen@quickbite.com' });
        if (!restaurant) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            restaurant = await Restaurant.create({
                restaurantName: 'QuickBite Kitchen',
                branchName: 'Downtown',
                email: 'kitchen@quickbite.com',
                password: hashedPassword,
                isLoggedIn: true,
                isActive: true
            });
            console.log('✅ Created default seed restaurant (kitchen@quickbite.com / password123)');
        } else {
            // Make sure restaurant is marked logged in and active so items show online
            restaurant.isLoggedIn = true;
            restaurant.isActive = true;
            await restaurant.save();
        }

        const foodsToInsert = sampleFoods.map(food => ({
            ...food,
            restaurantId: restaurant._id
        }));

        await FoodItem.insertMany(foodsToInsert);
        console.log(`✅ Seeded ${sampleFoods.length} food items successfully!`);
        
    } catch (err) {
        console.error('❌ Seeder error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 MongoDB Disconnected');
    }
}

seed();
