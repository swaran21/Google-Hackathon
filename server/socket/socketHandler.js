const Ambulance = require('../models/Ambulance');

/**
 * Socket.io event handler setup.
 * Manages real-time communication for ambulance tracking,
 * emergency updates, and dashboard live feeds.
 */
const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join a specific emergency room for targeted updates
    socket.on('emergency:join', (emergencyId) => {
      socket.join(`emergency:${emergencyId}`);
      console.log(`📡 Socket ${socket.id} joined room emergency:${emergencyId}`);
    });

    // Leave emergency room
    socket.on('emergency:leave', (emergencyId) => {
      socket.leave(`emergency:${emergencyId}`);
      console.log(`📡 Socket ${socket.id} left room emergency:${emergencyId}`);
    });

    // Ambulance sends location update (from driver device / simulation)
    socket.on('ambulance:location-update', async (data) => {
      try {
        const { ambulanceId, latitude, longitude } = data;

        // Update ambulance location in DB
        const ambulance = await Ambulance.findByIdAndUpdate(
          ambulanceId,
          {
            location: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
          },
          { new: true }
        );

        if (ambulance) {
          // Broadcast to all clients
          io.emit('ambulance:location-update', {
            ambulanceId: ambulance._id,
            location: ambulance.location,
            vehicleNumber: ambulance.vehicleNumber,
            status: ambulance.status,
          });

          // Also emit to specific emergency room if assigned
          if (ambulance.currentEmergency) {
            io.to(`emergency:${ambulance.currentEmergency}`).emit(
              'ambulance:tracking',
              {
                ambulanceId: ambulance._id,
                location: ambulance.location,
                vehicleNumber: ambulance.vehicleNumber,
              }
            );
          }
        }
      } catch (error) {
        console.error('❌ Socket ambulance update error:', error.message);
        socket.emit('error', { message: 'Failed to update ambulance location' });
      }
    });

    // Join admin dashboard room for live stats
    socket.on('admin:join', () => {
      socket.join('admin');
      console.log(`📊 Socket ${socket.id} joined admin dashboard`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupSocket;
