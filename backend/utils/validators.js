const VEHICLE_TYPES = ['Bike', 'Scooter', 'Bicycle', 'Car'];

const VEHICLE_MAP = {
  bike: 'Bike',
  scooter: 'Scooter',
  bicycle: 'Bicycle',
  cycle: 'Bicycle',
  car: 'Car',
  Bike: 'Bike',
  Scooter: 'Scooter',
  Bicycle: 'Bicycle',
  Car: 'Car',
};

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function isValidPhone(phone) {
  return /^\d{10}$/.test(String(phone || '').trim());
}

function normalizeVehicleType(value) {
  if (!value) return 'Bike';
  return VEHICLE_MAP[value] || VEHICLE_MAP[String(value).toLowerCase()] || null;
}

function isValidObjectId(id) {
  return /^[a-fA-F0-9]{24}$/.test(String(id || ''));
}

module.exports = {
  VEHICLE_TYPES,
  normalizeEmail,
  isValidEmail,
  isValidPhone,
  normalizeVehicleType,
  isValidObjectId,
};
