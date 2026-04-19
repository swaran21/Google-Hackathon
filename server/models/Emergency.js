const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['accident', 'cardiac', 'fire', 'flood', 'breathing', 'stroke', 'other'],
      required: [true, 'Emergency type is required'],
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Location coordinates are required'],
      },
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      maxlength: 500,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'dispatched', 'en_route', 'at_scene', 'resolved', 'cancelled'],
      default: 'pending',
    },
    // Who reported this emergency
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    patientPhone: {
      type: String,
      required: [true, 'Patient phone is required'],
      trim: true,
    },
    emergencyContact: {
      name: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      relation: { type: String, trim: true, default: '' },
    },
    severity: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    // Full triage result from the AI / rule-based classifier
    triageResult: {
      severityLabel: { type: String, default: '' },
      confidence: { type: Number, default: 0 },
      reasoning: { type: String, default: '' },
      recommendedEquipment: { type: String, enum: ['basic', 'advanced', 'critical_care', ''], default: '' },
      responseLevel: { type: String, enum: ['STANDARD', 'URGENT', 'IMMEDIATE', ''], default: '' },
      matchedIndicators: { type: [String], default: [] },
      aiModel: { type: String, default: '' },
    },
    assignedAmbulance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ambulance',
      default: null,
    },
    assignedHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    eta: {
      type: Number, // in minutes
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index for location-based queries
emergencySchema.index({ location: '2dsphere' });
emergencySchema.index({ status: 1 });
emergencySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Emergency', emergencySchema);
