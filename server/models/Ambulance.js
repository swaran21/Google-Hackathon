const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    driverName: {
      type: String,
      required: [true, 'Driver name is required'],
      trim: true,
    },
    driverPhone: {
      type: String,
      required: [true, 'Driver phone is required'],
      trim: true,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    status: {
      type: String,
      enum: ['available', 'dispatched', 'en_route', 'at_scene', 'returning'],
      default: 'available',
    },
    currentEmergency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Emergency',
      default: null,
    },
    equipmentLevel: {
      type: String,
      enum: ['basic', 'advanced', 'critical_care'],
      default: 'basic',
    },
    // Link to the User account for this driver
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index for nearest-ambulance queries
ambulanceSchema.index({ location: '2dsphere' });
ambulanceSchema.index({ status: 1 });

module.exports = mongoose.model('Ambulance', ambulanceSchema);
