const Ambulance = require("../models/Ambulance");
const Emergency = require("../models/Emergency");

/**
 * Socket.io event handler setup.
 * Manages real-time communication for ambulance tracking,
 * emergency updates, and dashboard live feeds.
 */
const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on("user:join", (payload) => {
      const userId = typeof payload === "string" ? payload : payload?.userId;
      if (!userId) return;
      socket.join(`user:${userId}`);
      console.log(`👤 Socket ${socket.id} joined user:${userId}`);
    });

    socket.on("user:leave", (payload) => {
      const userId = typeof payload === "string" ? payload : payload?.userId;
      if (!userId) return;
      socket.leave(`user:${userId}`);
      console.log(`👤 Socket ${socket.id} left user:${userId}`);
    });

    socket.on("hospital:join", (payload) => {
      const hospitalId =
        typeof payload === "string" ? payload : payload?.hospitalId;
      if (!hospitalId) return;
      socket.join(`hospital:${hospitalId}`);
      console.log(`🏥 Socket ${socket.id} joined hospital:${hospitalId}`);
    });

    socket.on("hospital:leave", (payload) => {
      const hospitalId =
        typeof payload === "string" ? payload : payload?.hospitalId;
      if (!hospitalId) return;
      socket.leave(`hospital:${hospitalId}`);
      console.log(`🏥 Socket ${socket.id} left hospital:${hospitalId}`);
    });

    // Join a specific emergency room for targeted updates
    socket.on("emergency:join", (emergencyId) => {
      socket.join(`emergency:${emergencyId}`);
      console.log(
        `📡 Socket ${socket.id} joined room emergency:${emergencyId}`,
      );
    });

    // Leave emergency room
    socket.on("emergency:leave", (emergencyId) => {
      socket.leave(`emergency:${emergencyId}`);
      console.log(`📡 Socket ${socket.id} left room emergency:${emergencyId}`);
    });

    socket.on("emergency:chat-send", async (data) => {
      try {
        const {
          emergencyId,
          message,
          senderRole = "user",
          senderName = "",
          senderId = null,
        } = data || {};

        const normalizedMessage = String(message || "").trim();

        if (!emergencyId || !normalizedMessage) {
          socket.emit("error", {
            message: "emergencyId and message are required for chat",
          });
          return;
        }

        const emergency = await Emergency.findByIdAndUpdate(
          emergencyId,
          {
            $push: {
              chatThread: {
                senderRole,
                senderName,
                senderId,
                message: normalizedMessage,
                createdAt: new Date(),
              },
            },
          },
          { new: true },
        )
          .populate("assignedHospital")
          .populate("reportedBy");

        if (!emergency) {
          socket.emit("error", { message: "Emergency not found for chat" });
          return;
        }

        const latestMessage =
          emergency.chatThread[emergency.chatThread.length - 1];
        const payload = {
          emergencyId,
          message: latestMessage,
        };

        io.to(`emergency:${emergencyId}`).emit(
          "emergency:chat-message",
          payload,
        );

        if (emergency.reportedBy?._id) {
          io.to(`user:${emergency.reportedBy._id}`).emit(
            "emergency:chat-message",
            payload,
          );
        }

        if (emergency.assignedHospital?._id) {
          io.to(`hospital:${emergency.assignedHospital._id}`).emit(
            "emergency:chat-message",
            payload,
          );
        }
      } catch (error) {
        console.error("❌ Socket chat error:", error.message);
        socket.emit("error", { message: "Failed to send chat message" });
      }
    });

    // Ambulance sends location update (from driver device / simulation)
    socket.on("ambulance:location-update", async (data) => {
      try {
        const { ambulanceId, latitude, longitude } = data;

        // Update ambulance location in DB
        const ambulance = await Ambulance.findByIdAndUpdate(
          ambulanceId,
          {
            location: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
          },
          { new: true },
        );

        if (ambulance) {
          // Broadcast to all clients
          io.emit("ambulance:location-update", {
            ambulanceId: ambulance._id,
            location: ambulance.location,
            vehicleNumber: ambulance.vehicleNumber,
            status: ambulance.status,
          });

          // Also emit to specific emergency room if assigned
          if (ambulance.currentEmergency) {
            io.to(`emergency:${ambulance.currentEmergency}`).emit(
              "ambulance:tracking",
              {
                ambulanceId: ambulance._id,
                location: ambulance.location,
                vehicleNumber: ambulance.vehicleNumber,
              },
            );
          }
        }
      } catch (error) {
        console.error("❌ Socket ambulance update error:", error.message);
        socket.emit("error", {
          message: "Failed to update ambulance location",
        });
      }
    });

    // Join admin dashboard room for live stats
    socket.on("admin:join", () => {
      socket.join("admin");
      console.log(`📊 Socket ${socket.id} joined admin dashboard`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupSocket;
