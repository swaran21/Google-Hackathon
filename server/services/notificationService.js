/**
 * Notification Service — Simulates real-world notifications.
 *
 * In production, this would integrate with:
 * - Twilio / MSG91 for SMS
 * - Firebase Cloud Messaging for push notifications
 * - SendGrid for email
 *
 * For the hackathon, we log all "sent" notifications and
 * store them in memory for the admin dashboard to display.
 */

// In-memory notification log (in production → DB or message queue)
const notificationLog = [];
const MAX_LOG_SIZE = 100;

/**
 * Simulate sending an SMS notification.
 */
const sendSMS = (to, message) => {
  const notification = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    type: 'sms',
    to,
    message,
    status: 'delivered', // simulated
    timestamp: new Date().toISOString(),
    // In production: const result = await twilio.messages.create({ body: message, to, from: TWILIO_NUMBER });
    provider: 'Simulated (Twilio-ready)',
  };

  notificationLog.unshift(notification);
  if (notificationLog.length > MAX_LOG_SIZE) notificationLog.pop();

  console.log(`📱 SMS → ${to}: ${message.substring(0, 60)}...`);
  return notification;
};

/**
 * Simulate sending a push notification to driver.
 */
const sendDriverPush = (driverName, title, body) => {
  const notification = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    type: 'push',
    to: driverName,
    title,
    message: body,
    status: 'delivered',
    timestamp: new Date().toISOString(),
    provider: 'Simulated (FCM-ready)',
  };

  notificationLog.unshift(notification);
  if (notificationLog.length > MAX_LOG_SIZE) notificationLog.pop();

  console.log(`🔔 Push → ${driverName}: ${title}`);
  return notification;
};

/**
 * Send all notifications for a new emergency dispatch.
 * Called when an ambulance is assigned to an emergency.
 */
const notifyDispatch = (emergency, ambulance, eta, hospital) => {
  const notifications = [];

  // SMS to patient
  notifications.push(
    sendSMS(
      emergency.patientPhone,
      `🚑 ResQNet AI: Ambulance ${ambulance.vehicleNumber} dispatched to your location. ` +
      `Driver: ${ambulance.driverName} (${ambulance.driverPhone}). ` +
      `ETA: ${eta} minutes. ` +
      (hospital ? `Hospital: ${hospital.name}. ` : '') +
      `Emergency ID: ${emergency._id.toString().slice(-8).toUpperCase()}`
    )
  );

  // Push notification to driver
  notifications.push(
    sendDriverPush(
      ambulance.driverName,
      '🚨 New Emergency Dispatch',
      `Type: ${emergency.type.toUpperCase()} | ` +
      `Patient: ${emergency.patientName} | ` +
      `ETA: ${eta} min | ` +
      `Navigate to: ${emergency.location.coordinates[1].toFixed(4)}, ${emergency.location.coordinates[0].toFixed(4)}`
    )
  );

  // SMS to emergency contacts (simulated)
  notifications.push(
    sendSMS(
      '+91 9999999999', // simulated emergency contact
      `⚠️ ResQNet AI Alert: ${emergency.patientName} has triggered an emergency SOS (${emergency.type}). ` +
      `Ambulance dispatched. ETA: ${eta} min. Track at: resqnet.ai/track/${emergency._id}`
    )
  );

  return notifications;
};

/**
 * Get all notification logs (for admin dashboard).
 */
const getNotificationLog = () => notificationLog;

/**
 * Clear notification log.
 */
const clearNotificationLog = () => {
  notificationLog.length = 0;
};

module.exports = { sendSMS, sendDriverPush, notifyDispatch, getNotificationLog, clearNotificationLog };
