/**
 * Seed demo data for QuickBite.
 * Run from backend/: npm run seed
 */
require('../config/env');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const DeliveryPartner = require('../models/DeliveryPartner');
const FoodItem = require('../models/FoodItem');
const Cart = require('../models/Cart');
const config = require('../config/env');

const sampleFoods = [
  {
    food_name: 'Classic Beef Burger',
    description: 'Juicy beef patty with lettuce, tomato, cheese, and our secret sauce.',
    price: 149,
    category: 'Burgers',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
    is_featured: true,
  },
  {
    food_name: 'Spicy Chicken Burger',
    description: 'Crispy fried chicken with jalapeños, sriracha mayo, and pickles.',
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
    food_name: 'Margherita Pizza',
    description: 'Classic pizza with tomato sauce, fresh mozzarella, and basil.',
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
    description: 'Grilled chicken, BBQ sauce, onions, and smoky cheddar.',
    price: 229,
    category: 'Pizza',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
    is_featured: false,
  },
  {
    food_name: 'Hakka Noodles',
    description: 'Stir-fried noodles with vegetables and savory Indo-Chinese sauce.',
    price: 129,
    category: 'Chinese',
    image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&q=80',
    is_featured: true,
  },
  {
    food_name: 'Chilli Paneer',
    description: 'Diced paneer stir-fried with capsicum, onions, and chilli sauce.',
    price: 149,
    category: 'Chinese',
    image: 'https://images.unsplash.com/photo-1551881192-002d027b20f9?w=600&q=80',
    is_featured: true,
  },
  {
    food_name: 'Vegetable Fried Rice',
    description: 'Wok-tossed rice with seasonal vegetables, egg, and soy sauce.',
    price: 119,
    category: 'Chinese',
    image: 'https://images.unsplash.com/photo-1627308595229-7830f5c9100f?w=600&q=80',
    is_featured: false,
  },
  {
    food_name: 'Chocolate Lava Cake',
    description: 'Warm chocolate cake with a gooey molten centre.',
    price: 89,
    category: 'Desserts',
    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&q=80',
    is_featured: true,
  },
  {
    food_name: 'Gulab Jamun',
    description: 'Soft milk-solid dumplings soaked in rose-flavoured sugar syrup.',
    price: 59,
    category: 'Desserts',
    image: 'https://images.unsplash.com/photo-1589114471223-fa0041261d71?w=600&q=80',
    is_featured: false,
  },
  {
    food_name: 'Cold Brew Coffee',
    description: 'Smooth, low-acidity cold brew steeped for 16 hours.',
    price: 89,
    category: 'Drinks',
    image: 'https://images.unsplash.com/photo-1461023058943-07cb1ce8e121?w=600&q=80',
    is_featured: true,
  },
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
];

async function upsertUser({ name, email, password, role, phone }) {
  const hashed = await bcrypt.hash(password, 10);
  return User.findOneAndUpdate(
    { email },
    { name, email, password: hashed, role, phone: phone || '' },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
}

async function seed() {
  try {
    await mongoose.connect(config.mongoUri);
    // eslint-disable-next-line no-console
    console.log('MongoDB connected');

    await Cart.deleteMany({});
    await FoodItem.deleteMany({});

    const admin = await upsertUser({
      name: 'Admin',
      email: 'admin@food.com',
      password: 'admin123',
      role: 'admin',
    });

    const customer = await upsertUser({
      name: 'Demo Customer',
      email: 'customer@quickbite.com',
      password: 'password123',
      role: 'user',
      phone: '9876543210',
    });

    const restaurantPassword = await bcrypt.hash('password123', 10);
    const restaurant = await Restaurant.findOneAndUpdate(
      { email: 'kitchen@quickbite.com' },
      {
        restaurantName: 'QuickBite Kitchen',
        branchName: 'Downtown',
        email: 'kitchen@quickbite.com',
        password: restaurantPassword,
        isLoggedIn: true,
        isActive: true,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    const deliveryPassword = await bcrypt.hash('password123', 10);
    const partner = await DeliveryPartner.findOneAndUpdate(
      { email: 'rider@quickbite.com' },
      {
        name: 'Demo Rider',
        email: 'rider@quickbite.com',
        phone: '9123456780',
        password: deliveryPassword,
        vehicle_type: 'Bike',
        is_online: true,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    const foods = sampleFoods.map((food) => ({
      ...food,
      restaurantId: restaurant._id,
      availability: true,
    }));
    await FoodItem.insertMany(foods);

    // eslint-disable-next-line no-console
    console.log('Seed complete');
    // eslint-disable-next-line no-console
    console.log('─────────────────────────────────────────');
    // eslint-disable-next-line no-console
    console.log('Demo accounts (password: password123 unless noted)');
    // eslint-disable-next-line no-console
    console.log(`  Admin:      admin@food.com / admin123  (${admin._id})`);
    // eslint-disable-next-line no-console
    console.log(`  Customer:   customer@quickbite.com     (${customer._id})`);
    // eslint-disable-next-line no-console
    console.log(`  Restaurant: kitchen@quickbite.com      (${restaurant._id})`);
    // eslint-disable-next-line no-console
    console.log(`  Delivery:   rider@quickbite.com        (${partner._id})`);
    // eslint-disable-next-line no-console
    console.log(`  Food items: ${foods.length}`);
    // eslint-disable-next-line no-console
    console.log('─────────────────────────────────────────');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Seed error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
