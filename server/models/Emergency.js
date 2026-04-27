const mongoose = require("mongoose");

const emergencySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "accident",
        "cardiac",
        "fire",
        "flood",
        "breathing",
        "stroke",
        "other",
      ],
      required: [true, "Emergency type is required"],
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, "Location coordinates are required"],
      },
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      maxlength: 500,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "dispatched",
        "en_route",
        "at_scene",
        "resolved",
        "cancelled",
      ],
      default: "pending",
    },
    flowType: {
      type: String,
      enum: ["hospital_first", "ambulance_first"],
      default: "hospital_first",
    },
    // Who reported this emergency
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    patientName: {
      type: String,
      required: [true, "Patient name is required"],
      trim: true,
    },
    patientPhone: {
      type: String,
      required: [true, "Patient phone is required"],
      trim: true,
    },
    emergencyContact: {
      name: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      relation: { type: String, trim: true, default: "" },
    },
    severity: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    // Full triage result from the AI / rule-based classifier
    triageResult: {
      severityLabel: { type: String, default: "" },
      confidence: { type: Number, default: 0 },
      reasoning: { type: String, default: "" },
      recommendedEquipment: {
        type: String,
        enum: ["basic", "advanced", "critical_care", ""],
        default: "",
      },
      responseLevel: {
        type: String,
        enum: ["STANDARD", "URGENT", "IMMEDIATE", ""],
        default: "",
      },
      matchedIndicators: { type: [String], default: [] },
      recommendedProtocols: { type: [String], default: [] },
      potentialComplications: { type: [String], default: [] },
      hospitalPreferences: {
        requiredSpecialties: { type: [String], default: [] },
        treatmentCapabilities: { type: [String], default: [] },
        bedType: {
          type: String,
          enum: ["general", "icu", ""],
          default: "",
        },
      },
      roleGuidance: {
        userSteps: { type: [String], default: [] },
        ambulanceChecklist: { type: [String], default: [] },
        hospitalPrep: { type: [String], default: [] },
        requiredDoctorSpecialties: { type: [String], default: [] },
        likelyTreatments: { type: [String], default: [] },
      },
      traceId: { type: String, default: "" },
      aiModel: { type: String, default: "" },
    },
    assignedAmbulance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ambulance",
      default: null,
    },
    assignedHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
    },
    hospitalRequest: {
      status: {
        type: String,
        enum: ["not_requested", "pending", "accepted", "rejected", "released"],
        default: "not_requested",
      },
      requiredBedType: {
        type: String,
        enum: ["general", "icu"],
        default: "general",
      },
      requestedAt: {
        type: Date,
        default: null,
      },
      respondedAt: {
        type: Date,
        default: null,
      },
      releasedAt: {
        type: Date,
        default: null,
      },
      decisionNote: {
        type: String,
        trim: true,
        default: "",
      },
      allocatedGeneralBeds: {
        type: Number,
        min: 0,
        default: 0,
      },
      allocatedIcuBeds: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
    ambulanceBooking: {
      status: {
        type: String,
        enum: ["not_ready", "ready_to_book", "booked", "cancelled"],
        default: "not_ready",
      },
      bookedAt: {
        type: Date,
        default: null,
      },
    },
    chatThread: {
      type: [
        {
          senderRole: {
            type: String,
            enum: ["user", "hospital", "driver", "system"],
            required: true,
          },
          senderName: {
            type: String,
            trim: true,
            default: "",
          },
          senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
          },
          message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 800,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    eta: {
      type: Number, // in minutes
      default: null,
    },
    // User Feedback & Ratings
    feedback: {
      isSubmitted: {
        type: Boolean,
        default: false,
      },
      driverRating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      hospitalRating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      experienceRating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      comments: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },
      submittedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  },
);

// Geospatial index for location-based queries
emergencySchema.index({ location: "2dsphere" });
emergencySchema.index({ status: 1 });
emergencySchema.index({ createdAt: -1 });

module.exports = mongoose.model("Emergency", emergencySchema);
