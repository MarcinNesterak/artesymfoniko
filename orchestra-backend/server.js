import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';
import eventsRoutes from './routes/events.js';


// Import models
import User from './models/User.js';
import Event from './models/Event.js';
import Invitation from './models/Invitation.js';
import Participation from './models/Participation.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection - bez deprecated options
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/events', eventsRoutes);

// Health check routes
app.get('/', (req, res) => {
  res.status(200).json({
    message: '🎼 Orchestra Backend API',
    status: 'running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Orchestra Backend',
    port: PORT,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    database: mongoose.connection.name,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const eventCount = await Event.countDocuments();
    const invitationCount = await Invitation.countDocuments();
    const participationCount = await Participation.countDocuments();
    
    res.json({
      message: 'Database connection test successful!',
      collections: {
        users: userCount,
        events: eventCount,
        invitations: invitationCount,
        participations: participationCount
      },
      mongodb: {
        state: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database test failed',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 Orchestra Backend Server Started');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test DB: http://localhost:${PORT}/api/test-db`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/*`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('📊 MongoDB connection closed');
    process.exit(0);
  });
});