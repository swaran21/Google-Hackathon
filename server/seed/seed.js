/**
 * Seed script for ResQNet AI — Hyderabad.
 * Seeds ambulances, hospitals, and default user accounts.
 * Idempotent — clears and re-seeds.
 *
 * Run: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Ambulance = require('../models/Ambulance');
const Hospital = require('../models/Hospital');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI;

// ─── Hyderabad Ambulances ────────────────────────────────────────
const ambulances = [
  {
    vehicleNumber: 'TS09EA1234',
    driverName: 'Rajesh Kumar',
    driverPhone: '+91 9876543210',
    location: { type: 'Point', coordinates: [78.4744, 17.3850] },
    status: 'available',
    equipmentLevel: 'advanced',
  },
  {
    vehicleNumber: 'TS09EB5678',
    driverName: 'Mohammed Irfan',
    driverPhone: '+91 9876543211',
    location: { type: 'Point', coordinates: [78.4983, 17.4399] },
    status: 'available',
    equipmentLevel: 'critical_care',
  },
  {
    vehicleNumber: 'TS09EC9012',
    driverName: 'Venkat Reddy',
    driverPhone: '+91 9876543212',
    location: { type: 'Point', coordinates: [78.3872, 17.4400] },
    status: 'available',
    equipmentLevel: 'basic',
  },
  {
    vehicleNumber: 'TS09ED3456',
    driverName: 'Srinivas Rao',
    driverPhone: '+91 9876543213',
    location: { type: 'Point', coordinates: [78.5525, 17.3616] },
    status: 'available',
    equipmentLevel: 'advanced',
  },
  {
    vehicleNumber: 'TS09EE7890',
    driverName: 'Anil Sharma',
    driverPhone: '+91 9876543214',
    location: { type: 'Point', coordinates: [78.4482, 17.4375] },
    status: 'available',
    equipmentLevel: 'basic',
  },
  {
    vehicleNumber: 'TS09EF2345',
    driverName: 'Prasad Goud',
    driverPhone: '+91 9876543215',
    location: { type: 'Point', coordinates: [78.3489, 17.4948] },
    status: 'available',
    equipmentLevel: 'critical_care',
  },
  {
    vehicleNumber: 'TS09EG6789',
    driverName: 'Kiran Naik',
    driverPhone: '+91 9876543216',
    location: { type: 'Point', coordinates: [78.5434, 17.3950] },
    status: 'available',
    equipmentLevel: 'advanced',
  },
  {
    vehicleNumber: 'TS09EH0123',
    driverName: 'Ravi Teja',
    driverPhone: '+91 9876543217',
    location: { type: 'Point', coordinates: [78.4011, 17.3587] },
    status: 'available',
    equipmentLevel: 'basic',
  },
];

// ─── Hyderabad Hospitals ─────────────────────────────────────────
const hospitals = [
  {
    name: 'NIMS Hospital',
    address: 'Panjagutta, Hyderabad, Telangana 500082',
    phone: '+91 40 23390202',
    location: { type: 'Point', coordinates: [78.4482, 17.4218] },
    totalBeds: 1500, availableBeds: 245,
    icuTotal: 120, icuAvailable: 18,
    specialties: ['Trauma', 'Cardiology', 'Neurology', 'Orthopedics', 'Burns'],
    emergencyDepartment: true,
  },
  {
    name: 'Gandhi Hospital',
    address: 'Musheerabad, Hyderabad, Telangana 500003',
    phone: '+91 40 27505566',
    location: { type: 'Point', coordinates: [78.4867, 17.4065] },
    totalBeds: 2200, availableBeds: 350,
    icuTotal: 150, icuAvailable: 25,
    specialties: ['General Medicine', 'Trauma', 'Infectious Diseases', 'Surgery'],
    emergencyDepartment: true,
  },
  {
    name: 'Osmania General Hospital',
    address: 'Afzal Gunj, Hyderabad, Telangana 500012',
    phone: '+91 40 24600146',
    location: { type: 'Point', coordinates: [78.4753, 17.3753] },
    totalBeds: 1100, availableBeds: 180,
    icuTotal: 80, icuAvailable: 12,
    specialties: ['General Surgery', 'Orthopedics', 'ENT', 'Ophthalmology'],
    emergencyDepartment: true,
  },
  {
    name: 'Apollo Hospital Jubilee Hills',
    address: 'Jubilee Hills, Hyderabad, Telangana 500033',
    phone: '+91 40 23607777',
    location: { type: 'Point', coordinates: [78.4093, 17.4232] },
    totalBeds: 350, availableBeds: 65,
    icuTotal: 60, icuAvailable: 10,
    specialties: ['Cardiology', 'Oncology', 'Neurosurgery', 'Transplants', 'Trauma'],
    emergencyDepartment: true,
  },
  {
    name: 'Yashoda Hospital Somajiguda',
    address: 'Raj Bhavan Road, Somajiguda, Hyderabad 500082',
    phone: '+91 40 45674567',
    location: { type: 'Point', coordinates: [78.4571, 17.4271] },
    totalBeds: 500, availableBeds: 90,
    icuTotal: 50, icuAvailable: 8,
    specialties: ['Cardiology', 'Nephrology', 'Gastroenterology', 'Pulmonology'],
    emergencyDepartment: true,
  },
  {
    name: 'KIMS Hospital',
    address: 'Minister Road, Secunderabad, Telangana 500003',
    phone: '+91 40 44885000',
    location: { type: 'Point', coordinates: [78.5003, 17.4401] },
    totalBeds: 400, availableBeds: 72,
    icuTotal: 45, icuAvailable: 7,
    specialties: ['Cardiac Surgery', 'Neuro Sciences', 'Orthopedics', 'Urology'],
    emergencyDepartment: true,
  },
];

const seedDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB for seeding');

    // Clear existing data
    await Ambulance.deleteMany({});
    await Hospital.deleteMany({});
    await User.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Insert ambulances and hospitals
    const insertedAmbulances = await Ambulance.insertMany(ambulances);
    const insertedHospitals = await Hospital.insertMany(hospitals);

    console.log(`🚑 Seeded ${insertedAmbulances.length} ambulances`);
    console.log(`🏥 Seeded ${insertedHospitals.length} hospitals`);

    // ─── Create default user accounts ────────────────────────────
    const users = [
      {
        name: 'Admin User',
        email: 'admin@resqnet.ai',
        password: 'admin123',
        phone: '+91 9000000001',
        role: 'admin',
      },
      {
        name: 'Rajesh Kumar',
        email: 'driver1@resqnet.ai',
        password: 'driver123',
        phone: '+91 9876543210',
        role: 'driver',
        assignedAmbulance: insertedAmbulances[0]._id,
      },
      {
        name: 'Mohammed Irfan',
        email: 'driver2@resqnet.ai',
        password: 'driver123',
        phone: '+91 9876543211',
        role: 'driver',
        assignedAmbulance: insertedAmbulances[1]._id,
      },
      {
        name: 'NIMS Hospital Admin',
        email: 'nims@resqnet.ai',
        password: 'hospital123',
        phone: '+91 40 23390202',
        role: 'hospital',
        assignedHospital: insertedHospitals[0]._id,
      },
      {
        name: 'Gandhi Hospital Admin',
        email: 'gandhi@resqnet.ai',
        password: 'hospital123',
        phone: '+91 40 27505566',
        role: 'hospital',
        assignedHospital: insertedHospitals[1]._id,
      },
      {
        name: 'Test User',
        email: 'user@resqnet.ai',
        password: 'user123',
        phone: '+91 9000000002',
        role: 'user',
      },
    ];

    // Create users one by one (to trigger pre-save password hashing)
    for (const userData of users) {
      await User.create(userData);
    }

    console.log(`👤 Seeded ${users.length} user accounts`);
    console.log('\n📋 Default Login Credentials:');
    console.log('   Admin:    admin@resqnet.ai / admin123');
    console.log('   Driver:   driver1@resqnet.ai / driver123');
    console.log('   Hospital: nims@resqnet.ai / hospital123');
    console.log('   User:     user@resqnet.ai / user123');

    console.log('\n✅ Database seeding complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
};

seedDB();
