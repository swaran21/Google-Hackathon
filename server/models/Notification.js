const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['sms', 'push', 'email', 'in_app'],
      required: [true, 'Notification type is required'],
    },
    channel: {
      type: String,
      enum: ['patient', 'driver', 'hospital', 'emergency_contact', 'admin'],
      required: true,
    },
    recipient: {
      type: String,
      required: [true, 'Recipient identifier is required'],
      trim: true,
    },
    recipientUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    emergency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Emergency',
      default: null,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    message: {
      type: String,
      required: [true, 'Message content is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending',
    },
    provider: {
      type: String,
      default: 'simulated', // 'twilio', 'firebase', 'sendgrid', etc.
    },
    sentAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
notificationSchema.index({ emergency: 1 });
notificationSchema.index({ recipientUser: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
