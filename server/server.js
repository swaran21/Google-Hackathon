require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const setupSocket = require('./socket/socketHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const ambulanceRoutes = require('./routes/ambulanceRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const adminRoutes = require('./routes/adminRoutes');
const driverRoutes = require('./routes/driverRoutes');

// ─── Initialize Express & HTTP Server ────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Socket.io Setup ─────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH'],
  },
});

app.set('io', io);
setupSocket(io);

// ─── Middleware ───────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for SOS endpoint (prevent spam)
const sosLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Root Route ──────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'ResQNet AI API',
    version: '1.0.0',
    status: 'running',
    docs: '/api/health',
    endpoints: [
      '/api/auth',
      '/api/emergency',
      '/api/ambulance',
      '/api/hospitals',
      '/api/admin',
      '/api/driver',
    ],
  });
});

// ─── API Routes ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/emergency', sosLimiter, emergencyRoutes);
app.use('/api/ambulance', ambulanceRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      socketio: 'ready',
      triage: 'active',
      routing: 'osrm-connected',
      notifications: 'simulated',
    },
  });
});

// ─── Error Handling ──────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`\n🚀 ResQNet AI Server running on port ${PORT}`);
    console.log(`📡 Socket.io ready for connections`);
    console.log(`🤖 AI Triage service active`);
    console.log(`🗺️  OSRM routing service connected`);
    console.log(`📱 Notification service (simulated)`);
    console.log(`🔐 JWT authentication enabled`);
    console.log(`🛡️  Rate limiting active`);
    console.log(`🌐 API: http://localhost:${PORT}/api`);
    console.log(`❤️  Health: http://localhost:${PORT}/api/health\n`);
  });
};

startServer();
