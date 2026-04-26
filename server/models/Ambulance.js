const mongoose = require("mongoose");

const LEVEL_EQUIPMENT = {
  basic: ["First Aid Kit", "Oxygen Cylinder", "BP Monitor", "Stretcher"],
  advanced: [
    "First Aid Kit",
    "Oxygen Cylinder",
    "BP Monitor",
    "Stretcher",
    "Cardiac Monitor",
    "Portable Suction",
    "Nebulizer",
  ],
  critical_care: [
    "First Aid Kit",
    "Oxygen Cylinder",
    "BP Monitor",
    "Stretcher",
    "Cardiac Monitor",
    "Portable Suction",
    "Nebulizer",
    "Ventilator",
    "Defibrillator",
    "Infusion Pump",
  ],
};

const ambulanceSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: [true, "Vehicle number is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    driverName: {
      type: String,
      required: [true, "Driver name is required"],
      trim: true,
    },
    driverPhone: {
      type: String,
      required: [true, "Driver phone is required"],
      trim: true,
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    status: {
      type: String,
      enum: [
        "available",
        "dispatched",
        "en_route",
        "at_scene",
        "returning",
        "offline",
      ],
      default: "available",
    },
    currentEmergency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Emergency",
      default: null,
    },
    equipmentLevel: {
      type: String,
      enum: ["basic", "advanced", "critical_care"],
      default: "basic",
    },
    equipmentInventory: {
      type: [String],
      default: [],
    },
    // Link to the User account for this driver
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    ratingSummary: {
      average: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      totalRatings: {
        type: Number,
        min: 0,
        default: 0,
      },
      totalScore: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  },
);

// Geospatial index for nearest-ambulance queries
ambulanceSchema.index({ location: "2dsphere" });
ambulanceSchema.index({ status: 1 });

ambulanceSchema.pre("validate", function (next) {
  const level = this.equipmentLevel || "basic";
  if (
    !Array.isArray(this.equipmentInventory) ||
    this.equipmentInventory.length === 0
  ) {
    this.equipmentInventory = LEVEL_EQUIPMENT[level] || LEVEL_EQUIPMENT.basic;
  }
  next();
});

module.exports = mongoose.model("Ambulance", ambulanceSchema);
