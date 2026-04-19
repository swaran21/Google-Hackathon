/**
 * Seed script for ResQNet AI — Hyderabad.
 * Seeds ambulances, hospitals, and default user accounts.
 * Idempotent — clears and re-seeds.
 *
 * Run: npm run seed
 */
require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});
const mongoose = require("mongoose");
const Ambulance = require("../models/Ambulance");
const Hospital = require("../models/Hospital");
const User = require("../models/User");

const MONGODB_URI = process.env.MONGODB_URI;

// ─── Test-area Ambulances (around 17.314347, 78.533894) ─────────
const ambulances = [
  {
    vehicleNumber: "TS09EA1234",
    driverName: "Rajesh Kumar",
    driverPhone: "+91 9876543210",
    location: { type: "Point", coordinates: [78.5329, 17.3148] },
    status: "available",
    equipmentLevel: "advanced",
  },
  {
    vehicleNumber: "TS09EB5678",
    driverName: "Mohammed Irfan",
    driverPhone: "+91 9876543211",
    location: { type: "Point", coordinates: [78.5387, 17.3094] },
    status: "available",
    equipmentLevel: "critical_care",
  },
  {
    vehicleNumber: "TS09EC9012",
    driverName: "Venkat Reddy",
    driverPhone: "+91 9876543212",
    location: { type: "Point", coordinates: [78.5262, 17.3205] },
    status: "available",
    equipmentLevel: "basic",
  },
  {
    vehicleNumber: "TS09ED3456",
    driverName: "Srinivas Rao",
    driverPhone: "+91 9876543213",
    location: { type: "Point", coordinates: [78.5478, 17.3041] },
    status: "available",
    equipmentLevel: "advanced",
  },
  {
    vehicleNumber: "TS09EE7890",
    driverName: "Anil Sharma",
    driverPhone: "+91 9876543214",
    location: { type: "Point", coordinates: [78.5208, 17.3273] },
    status: "available",
    equipmentLevel: "basic",
  },
  {
    vehicleNumber: "TS09EF2345",
    driverName: "Prasad Goud",
    driverPhone: "+91 9876543215",
    location: { type: "Point", coordinates: [78.5562, 17.3189] },
    status: "available",
    equipmentLevel: "critical_care",
  },
  {
    vehicleNumber: "TS09EG6789",
    driverName: "Kiran Naik",
    driverPhone: "+91 9876543216",
    location: { type: "Point", coordinates: [78.5411, 17.3338] },
    status: "available",
    equipmentLevel: "advanced",
  },
  {
    vehicleNumber: "TS09EH0123",
    driverName: "Ravi Teja",
    driverPhone: "+91 9876543217",
    location: { type: "Point", coordinates: [78.5149, 17.3012] },
    status: "available",
    equipmentLevel: "basic",
  },
];

// ─── Test-area Hospitals (all within ~5km) ──────────────────────
const hospitals = [
  {
    name: "LB Nagar Emergency Center",
    address: "LB Nagar, Hyderabad, Telangana 500074",
    phone: "+91 40 23390202",
    location: { type: "Point", coordinates: [78.5371, 17.3179] },
    totalBeds: 420,
    availableBeds: 116,
    icuTotal: 48,
    icuAvailable: 11,
    specialties: ["Trauma", "Cardiology", "Neurology", "Emergency Medicine"],
    treatments: [
      {
        name: "Primary Cardiac Stabilization",
        emergencyTypes: ["cardiac"],
        costMin: 25000,
        costMax: 65000,
        currency: "INR",
        notes: "Includes ECG, emergency medication, monitored bed",
      },
      {
        name: "Stroke Thrombolysis Package",
        emergencyTypes: ["stroke"],
        costMin: 70000,
        costMax: 145000,
        currency: "INR",
      },
      {
        name: "Polytrauma Emergency Surgery",
        emergencyTypes: ["accident", "fire"],
        costMin: 85000,
        costMax: 220000,
        currency: "INR",
      },
    ],
    emergencyDepartment: true,
  },
  {
    name: "Saroornagar Trauma Hospital",
    address: "Saroornagar, Hyderabad, Telangana 500035",
    phone: "+91 40 27505566",
    location: { type: "Point", coordinates: [78.5248, 17.3098] },
    totalBeds: 360,
    availableBeds: 92,
    icuTotal: 40,
    icuAvailable: 8,
    specialties: ["Trauma", "General Surgery", "Orthopedics", "Pulmonology"],
    treatments: [
      {
        name: "Accident Trauma Bundle",
        emergencyTypes: ["accident"],
        costMin: 60000,
        costMax: 180000,
        currency: "INR",
      },
      {
        name: "Respiratory Distress Support",
        emergencyTypes: ["breathing"],
        costMin: 18000,
        costMax: 52000,
        currency: "INR",
      },
      {
        name: "Flood Infection Emergency Care",
        emergencyTypes: ["flood"],
        costMin: 12000,
        costMax: 38000,
        currency: "INR",
      },
    ],
    emergencyDepartment: true,
  },
  {
    name: "Dilsukhnagar MultiSpeciality",
    address: "Dilsukhnagar, Hyderabad, Telangana 500060",
    phone: "+91 40 24600146",
    location: { type: "Point", coordinates: [78.5455, 17.3261] },
    totalBeds: 300,
    availableBeds: 74,
    icuTotal: 36,
    icuAvailable: 7,
    specialties: ["Cardiology", "Neurology", "General Medicine", "Emergency"],
    treatments: [
      {
        name: "Rapid Cardiac Response",
        emergencyTypes: ["cardiac"],
        costMin: 22000,
        costMax: 78000,
        currency: "INR",
      },
      {
        name: "Neuro Stroke Imaging + Care",
        emergencyTypes: ["stroke"],
        costMin: 55000,
        costMax: 130000,
        currency: "INR",
      },
      {
        name: "General Emergency Observation",
        emergencyTypes: ["other", "flood"],
        costMin: 8000,
        costMax: 26000,
        currency: "INR",
      },
    ],
    emergencyDepartment: true,
  },
  {
    name: "Champapet Critical Care",
    address: "Champapet, Hyderabad, Telangana 500079",
    phone: "+91 40 23607777",
    location: { type: "Point", coordinates: [78.5303, 17.2986] },
    totalBeds: 280,
    availableBeds: 68,
    icuTotal: 42,
    icuAvailable: 9,
    specialties: ["Critical Care", "Burns", "Cardiology", "Emergency Surgery"],
    treatments: [
      {
        name: "Critical Burn Management",
        emergencyTypes: ["fire"],
        costMin: 90000,
        costMax: 260000,
        currency: "INR",
      },
      {
        name: "Advanced Ventilator Support",
        emergencyTypes: ["breathing"],
        costMin: 35000,
        costMax: 98000,
        currency: "INR",
      },
      {
        name: "Emergency Cardiac ICU Admission",
        emergencyTypes: ["cardiac"],
        costMin: 45000,
        costMax: 120000,
        currency: "INR",
      },
    ],
    emergencyDepartment: true,
  },
  {
    name: "Kothapet LifeCare",
    address: "Kothapet, Hyderabad, Telangana 500035",
    phone: "+91 40 45674567",
    location: { type: "Point", coordinates: [78.5523, 17.3131] },
    totalBeds: 340,
    availableBeds: 88,
    icuTotal: 44,
    icuAvailable: 10,
    specialties: ["Cardiology", "Nephrology", "Pulmonology", "Emergency"],
    treatments: [
      {
        name: "Cardiac Emergency Care Plus",
        emergencyTypes: ["cardiac"],
        costMin: 28000,
        costMax: 90000,
        currency: "INR",
      },
      {
        name: "Pulmonary Acute Rescue",
        emergencyTypes: ["breathing"],
        costMin: 20000,
        costMax: 60000,
        currency: "INR",
      },
      {
        name: "Emergency Dialysis + Stabilization",
        emergencyTypes: ["other"],
        costMin: 24000,
        costMax: 75000,
        currency: "INR",
      },
    ],
    emergencyDepartment: true,
  },
  {
    name: "Malakpet City Hospital",
    address: "Malakpet, Hyderabad, Telangana 500036",
    phone: "+91 40 44885000",
    location: { type: "Point", coordinates: [78.5189, 17.3224] },
    totalBeds: 260,
    availableBeds: 61,
    icuTotal: 30,
    icuAvailable: 6,
    specialties: [
      "General Medicine",
      "Trauma",
      "Respiratory Care",
      "Orthopedics",
    ],
    treatments: [
      {
        name: "Fracture + Trauma Stabilization",
        emergencyTypes: ["accident"],
        costMin: 35000,
        costMax: 125000,
        currency: "INR",
      },
      {
        name: "Respiratory Emergency Package",
        emergencyTypes: ["breathing"],
        costMin: 16000,
        costMax: 48000,
        currency: "INR",
      },
      {
        name: "General Acute Care",
        emergencyTypes: ["other", "flood"],
        costMin: 7000,
        costMax: 24000,
        currency: "INR",
      },
    ],
    emergencyDepartment: true,
  },
];

const seedDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB for seeding");

    // Clear existing data
    await Ambulance.deleteMany({});
    await Hospital.deleteMany({});
    await User.deleteMany({});
    console.log("🗑️  Cleared existing data");

    // Insert ambulances and hospitals
    const insertedAmbulances = await Ambulance.insertMany(ambulances);
    const insertedHospitals = await Hospital.insertMany(hospitals);

    console.log(`🚑 Seeded ${insertedAmbulances.length} ambulances`);
    console.log(`🏥 Seeded ${insertedHospitals.length} hospitals`);

    // ─── Create default user accounts ────────────────────────────
    const users = [
      {
        name: "Admin User",
        email: "admin@resqnet.ai",
        password: "admin123",
        phone: "+91 9000000001",
        role: "admin",
      },
      {
        name: "Rajesh Kumar",
        email: "driver1@resqnet.ai",
        password: "driver123",
        phone: "+91 9876543210",
        role: "driver",
        assignedAmbulance: insertedAmbulances[0]._id,
      },
      {
        name: "Mohammed Irfan",
        email: "driver2@resqnet.ai",
        password: "driver123",
        phone: "+91 9876543211",
        role: "driver",
        assignedAmbulance: insertedAmbulances[1]._id,
      },
      {
        name: "NIMS Hospital Admin",
        email: "nims@resqnet.ai",
        password: "hospital123",
        phone: "+91 40 23390202",
        role: "hospital",
        assignedHospital: insertedHospitals[0]._id,
      },
      {
        name: "Gandhi Hospital Admin",
        email: "gandhi@resqnet.ai",
        password: "hospital123",
        phone: "+91 40 27505566",
        role: "hospital",
        assignedHospital: insertedHospitals[1]._id,
      },
      {
        name: "Test User",
        email: "user@resqnet.ai",
        password: "user123",
        phone: "+91 9000000002",
        role: "user",
      },
    ];

    // Create users one by one (to trigger pre-save password hashing)
    for (const userData of users) {
      await User.create(userData);
    }

    console.log(`👤 Seeded ${users.length} user accounts`);

    // ─── Link drivers back to ambulances (assignedDriver) ────────
    const driverUsers = await User.find({ role: "driver" });
    for (const driver of driverUsers) {
      if (driver.assignedAmbulance) {
        await Ambulance.findByIdAndUpdate(driver.assignedAmbulance, {
          assignedDriver: driver._id,
        });
      }
    }
    console.log("🔗 Linked driver users to ambulances");

    console.log("\n📋 Default Login Credentials:");
    console.log("   Admin:    admin@resqnet.ai / admin123");
    console.log("   Driver:   driver1@resqnet.ai / driver123");
    console.log("   Hospital: nims@resqnet.ai / hospital123");
    console.log("   User:     user@resqnet.ai / user123");

    console.log("\n✅ Database seeding complete!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error.message);
    process.exit(1);
  }
};

seedDB();
