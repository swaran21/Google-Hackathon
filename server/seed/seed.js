/**
 * Seed script for ResQNet AI - Hyderabad.
 * Generates large random datasets for hospitals, ambulances, and linked users.
 *
 * Run: npm run seed
 */
require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { faker } = require("@faker-js/faker");

const Ambulance = require("../models/Ambulance");
const Hospital = require("../models/Hospital");
const User = require("../models/User");

const MONGODB_URI = process.env.MONGODB_URI;

const HOSPITAL_COUNT = 300;
const AMBULANCE_COUNT = 500;
const GLOBAL_PASSWORD = "12345678";

const HYD_BOUNDS = {
  latMin: 17.23,
  latMax: 17.62,
  lngMin: 78.22,
  lngMax: 78.68,
};

const HYD_LOCALITIES = [
  "Banjara Hills",
  "Jubilee Hills",
  "Kukatpally",
  "Miyapur",
  "Gachibowli",
  "Hitech City",
  "Madhapur",
  "Ameerpet",
  "Secunderabad",
  "LB Nagar",
  "Dilsukhnagar",
  "Uppal",
  "Nagole",
  "Malakpet",
  "Kothapet",
  "Habsiguda",
  "Nallakunta",
  "Begumpet",
  "Mehdipatnam",
  "Tolichowki",
  "Nampally",
  "Charminar",
  "Attapur",
  "Shamshabad",
  "Kompally",
  "Manikonda",
  "Kondapur",
  "Serilingampally",
  "Sainikpuri",
  "Moosapet",
];

const SPECIALTIES = [
  "Trauma",
  "Cardiology",
  "Neurology",
  "Emergency Medicine",
  "Orthopedics",
  "Pulmonology",
  "Nephrology",
  "General Surgery",
  "Critical Care",
  "Respiratory Care",
  "Burns",
  "General Medicine",
  "Pediatrics",
  "Infectious Disease",
  "Anesthesiology",
];

const TREATMENT_LIBRARY = [
  {
    name: "Primary Cardiac Stabilization",
    emergencyTypes: ["cardiac"],
    avgCost: 65000,
  },
  {
    name: "Stroke Thrombolysis Package",
    emergencyTypes: ["stroke"],
    avgCost: 120000,
  },
  {
    name: "Accident Trauma Surgery",
    emergencyTypes: ["accident"],
    avgCost: 140000,
  },
  {
    name: "Critical Burn Management",
    emergencyTypes: ["fire"],
    avgCost: 180000,
  },
  {
    name: "Respiratory Distress Support",
    emergencyTypes: ["breathing"],
    avgCost: 42000,
  },
  {
    name: "Disaster Acute Care",
    emergencyTypes: ["flood"],
    avgCost: 30000,
  },
  {
    name: "Emergency ICU Admission",
    emergencyTypes: ["cardiac", "stroke", "breathing"],
    avgCost: 85000,
  },
  {
    name: "General Emergency Observation",
    emergencyTypes: ["other", "flood"],
    avgCost: 20000,
  },
  {
    name: "Polytrauma Stabilization",
    emergencyTypes: ["accident", "fire"],
    avgCost: 95000,
  },
];

const randomPointInHyderabad = () => {
  const latitude = faker.number.float({
    min: HYD_BOUNDS.latMin,
    max: HYD_BOUNDS.latMax,
    fractionDigits: 6,
  });
  const longitude = faker.number.float({
    min: HYD_BOUNDS.lngMin,
    max: HYD_BOUNDS.lngMax,
    fractionDigits: 6,
  });

  return {
    type: "Point",
    coordinates: [Number(longitude.toFixed(6)), Number(latitude.toFixed(6))],
  };
};

const getUniqueCode = (prefix, index) => {
  const code = (index + 1).toString(36).padStart(4, "0").toUpperCase();
  return `${prefix}${code}`;
};

const createEmailFromName = (name, usedEmails) => {
  const clean = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const firstFive = clean.slice(0, 5).padEnd(5, "x");
  let email = `${firstFive}123@gmail.com`;

  if (!usedEmails.has(email)) {
    usedEmails.add(email);
    return email;
  }

  let suffix = 1;
  while (usedEmails.has(email)) {
    email = `${firstFive}${suffix}123@gmail.com`;
    suffix += 1;
  }

  usedEmails.add(email);
  return email;
};

const randomIndianPhone = () => `+91 9${faker.string.numeric(9)}`;

const buildTreatments = () => {
  const selected = faker.helpers.arrayElements(
    TREATMENT_LIBRARY,
    faker.number.int({ min: 3, max: 5 }),
  );

  return selected.map((template) => {
    const avg = Math.max(
      8000,
      template.avgCost + faker.number.int({ min: -8000, max: 12000 }),
    );
    const variance = faker.number.float({
      min: 0.15,
      max: 0.35,
      fractionDigits: 2,
    });

    const costMin = Math.max(5000, Math.round(avg * (1 - variance)));
    const costMax = Math.max(costMin + 1000, Math.round(avg * (1 + variance)));

    return {
      name: template.name,
      emergencyTypes: template.emergencyTypes,
      costMin,
      costMax,
      currency: "INR",
      notes: `Average cost around INR ${avg.toLocaleString("en-IN")}`,
    };
  });
};

const buildHospitals = (count, usedEmails) => {
  const hospitals = [];
  const hospitalUsers = [];

  for (let i = 0; i < count; i += 1) {
    const code = getUniqueCode("H", i);
    const careLabel = faker.helpers.arrayElement([
      "Emergency",
      "LifeCare",
      "CityCare",
      "Prime",
      "Advanced",
      "Critical",
      "Metro",
    ]);

    const name = `${code} ${careLabel} Hospital`;
    const locality = faker.helpers.arrayElement(HYD_LOCALITIES);
    const pincode = `500${faker.number
      .int({ min: 1, max: 99 })
      .toString()
      .padStart(2, "0")}`;

    const totalBeds = faker.number.int({ min: 90, max: 900 });
    const icuTotal = faker.number.int({
      min: Math.max(10, Math.floor(totalBeds * 0.08)),
      max: Math.max(20, Math.floor(totalBeds * 0.25)),
    });

    const availableBeds = faker.number.int({
      min: Math.max(5, Math.floor(totalBeds * 0.08)),
      max: Math.max(10, Math.floor(totalBeds * 0.8)),
    });

    const icuAvailable = faker.number.int({
      min: Math.max(0, Math.floor(icuTotal * 0.05)),
      max: Math.max(1, Math.floor(icuTotal * 0.75)),
    });

    const email = createEmailFromName(name, usedEmails);

    hospitals.push({
      name,
      email,
      address: `${faker.location.streetAddress()}, ${locality}, Hyderabad, Telangana ${pincode}`,
      phone: randomIndianPhone(),
      location: randomPointInHyderabad(),
      totalBeds,
      availableBeds,
      icuTotal,
      icuAvailable,
      specialties: faker.helpers.arrayElements(
        SPECIALTIES,
        faker.number.int({ min: 3, max: 6 }),
      ),
      treatments: buildTreatments(),
      emergencyDepartment: true,
      isActive: true,
    });

    hospitalUsers.push({
      name: `${code} Admin`,
      email,
      password: GLOBAL_PASSWORD,
      phone: randomIndianPhone(),
      role: "hospital",
      _hospitalIndex: i,
    });
  }

  return { hospitals, hospitalUsers };
};

const buildAmbulances = (count, usedEmails) => {
  const ambulances = [];
  const driverUsers = [];

  for (let i = 0; i < count; i += 1) {
    const driverCode = getUniqueCode("D", i);
    const driverName = `${driverCode} ${faker.person.firstName()}`;
    const vehicleSeries = String(i + 1).padStart(4, "0");
    const vehicleSuffix = String.fromCharCode(65 + (i % 26));
    const vehicleNumber = `TS09${vehicleSuffix}${vehicleSeries}`;

    ambulances.push({
      vehicleNumber,
      driverName,
      driverPhone: randomIndianPhone(),
      location: randomPointInHyderabad(),
      status: "available",
      equipmentLevel: faker.helpers.arrayElement([
        "basic",
        "advanced",
        "critical_care",
      ]),
      isActive: true,
    });

    driverUsers.push({
      name: driverName,
      email: createEmailFromName(driverName, usedEmails),
      password: GLOBAL_PASSWORD,
      phone: randomIndianPhone(),
      role: "driver",
      _ambulanceIndex: i,
    });
  }

  return { ambulances, driverUsers };
};

const buildCoreUsers = (usedEmails) => {
  const adminName = "A0001 Admin";
  const patientName = "U0001 Patient";

  return [
    {
      name: adminName,
      email: createEmailFromName(adminName, usedEmails),
      password: GLOBAL_PASSWORD,
      phone: randomIndianPhone(),
      role: "admin",
    },
    {
      name: patientName,
      email: createEmailFromName(patientName, usedEmails),
      password: GLOBAL_PASSWORD,
      phone: randomIndianPhone(),
      role: "user",
    },
  ];
};

const seedDB = async () => {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in server/.env");
    }

    faker.seed(20260420);

    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB for seeding");

    await Ambulance.deleteMany({});
    await Hospital.deleteMany({});
    await User.deleteMany({});
    console.log("Cleared existing data");

    const usedEmails = new Set();

    const { hospitals, hospitalUsers } = buildHospitals(
      HOSPITAL_COUNT,
      usedEmails,
    );
    const { ambulances, driverUsers } = buildAmbulances(
      AMBULANCE_COUNT,
      usedEmails,
    );
    const coreUsers = buildCoreUsers(usedEmails);

    const insertedHospitals = await Hospital.insertMany(hospitals);
    const insertedAmbulances = await Ambulance.insertMany(ambulances);

    console.log(`Seeded ${insertedHospitals.length} hospitals`);
    console.log(`Seeded ${insertedAmbulances.length} ambulances`);

    const hashedPassword = await bcrypt.hash(GLOBAL_PASSWORD, 12);

    const usersToInsert = [
      ...coreUsers.map((user) => ({ ...user, password: hashedPassword })),
      ...hospitalUsers.map((user) => ({
        name: user.name,
        email: user.email,
        password: hashedPassword,
        phone: user.phone,
        role: user.role,
        assignedHospital: insertedHospitals[user._hospitalIndex]._id,
      })),
      ...driverUsers.map((user) => ({
        name: user.name,
        email: user.email,
        password: hashedPassword,
        phone: user.phone,
        role: user.role,
        assignedAmbulance: insertedAmbulances[user._ambulanceIndex]._id,
      })),
    ];

    const insertedUsers = await User.insertMany(usersToInsert);

    const driverAccounts = insertedUsers.filter(
      (user) => user.role === "driver" && user.assignedAmbulance,
    );

    if (driverAccounts.length > 0) {
      const linkOps = driverAccounts.map((driver) => ({
        updateOne: {
          filter: { _id: driver.assignedAmbulance },
          update: { assignedDriver: driver._id },
        },
      }));

      await Ambulance.bulkWrite(linkOps);
    }

    console.log(`Seeded ${insertedUsers.length} user accounts`);
    console.log("Linked driver users to ambulances");

    console.log("\nDefault credentials for all seeded accounts:");
    console.log(`  Password: ${GLOBAL_PASSWORD}`);
    console.log("  Email format: first 5 letters of name + 123@gmail.com");

    const sampleAccounts = insertedUsers.slice(0, 6).map((user) => ({
      role: user.role,
      name: user.name,
      email: user.email,
    }));

    console.log("\nSample accounts:");
    sampleAccounts.forEach((account) => {
      console.log(
        `  ${account.role.padEnd(8)} ${account.name} -> ${account.email}`,
      );
    });

    console.log("\nDatabase seeding complete");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error.message);
    process.exit(1);
  }
};

seedDB();
