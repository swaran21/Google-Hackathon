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
    severity: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
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
