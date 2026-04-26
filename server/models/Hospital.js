const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Hospital name is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    address: {
      type: String,
      required: [true, "Hospital address is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Hospital phone is required"],
      trim: true,
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    totalBeds: {
      type: Number,
      required: true,
      min: 0,
    },
    availableBeds: {
      type: Number,
      required: true,
      min: 0,
    },
    icuTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    icuAvailable: {
      type: Number,
      required: true,
      min: 0,
    },
    specialties: {
      type: [String],
      default: [],
    },
    treatments: {
      type: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
          },
          emergencyTypes: {
            type: [String],
            enum: [
              "accident",
              "cardiac",
              "fire",
              "flood",
              "breathing",
              "stroke",
              "other",
            ],
            default: ["other"],
          },
          costMin: {
            type: Number,
            required: true,
            min: 0,
          },
          costMax: {
            type: Number,
            required: true,
            min: 0,
          },
          currency: {
            type: String,
            default: "INR",
            trim: true,
            uppercase: true,
          },
          notes: {
            type: String,
            default: "",
            trim: true,
          },
        },
      ],
      default: [],
    },
    emergencyDepartment: {
      type: Boolean,
      default: true,
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

// Geospatial index for nearby hospital queries
hospitalSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Hospital", hospitalSchema);
