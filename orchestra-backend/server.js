import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import usersRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';
import eventsRoutes from './routes/events.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';

// Import models
import User from './models/User.js';
import Event from './models/Event.js';
import Invitation from './models/Invitation.js';
import Participation from './models/Participation.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Trust proxy - potrzebne dla rate limiting na Railway
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001',
    'https://artesymfoniko.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting dla wszystkich endpointów API
app.use('/api/', apiLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Konfiguracja sesji z MongoDB
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60, // 14 dni
    autoRemove: 'native' // używa natywnego TTL MongoDB
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true w produkcji
    httpOnly: true,
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 dni
  }
}));

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    createTestAccounts();
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

// Tymczasowy endpoint do sprawdzenia zmiennych środowiskowych
app.get('/api/debug/env', (req, res) => {
  res.json({
    REDIS_URL: process.env.REDIS_URL ? 'Set' : 'Not set',
    NODE_ENV: process.env.NODE_ENV,
    MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set'
  });
});

// Debugowanie zmiennych środowiskowych
console.log('Environment variables check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
console.log('REDIS_URL:', process.env.REDIS_URL ? 'Set' : 'Not set');
if (process.env.REDIS_URL) {
  console.log('Redis URL format:', process.env.REDIS_URL.substring(0, 20) + '...');
}

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

// Funkcja tworząca testowe konta
const createTestAccounts = async () => {
  try {
    const User = (await import('./models/User.js')).default;
    
    // Sprawdź czy testowe konta już istnieją
    let conductor = await User.findOne({ email: 'dyrygent@test.pl' });
    const musician = await User.findOne({ email: 'skrzypce@test.pl' });
    
    if (!conductor) {
      const testConductor = new User({
        email: 'dyrygent@test.pl',
        name: 'Dyrygent Testowy',
        password: 'haslo123',
        role: 'conductor',
        active: true,
        personalData: {
          firstName: 'Dyrygent',
          lastName: 'Testowy'
        }
      });
      conductor = await testConductor.save(); // Zapisz do zmiennej conductor
      console.log('✅ Utworzono testowe konto dyrygenta');
    }
    
    if (!musician) {
      const testMusician = new User({
        email: 'skrzypce@test.pl',
        name: 'Skrzypce Testowe',
        password: 'haslo123', // Zmieniono na standardowe hasło
        role: 'musician',
        instrument: 'skrzypce',
        active: true,
        createdBy: conductor._id, // Teraz conductor na pewno istnieje
        personalData: {
          firstName: 'Skrzypce',
          lastName: 'Testowe'
        }
      });
      await testMusician.save();
      console.log('✅ Utworzono testowe konto muzyka');
    }
  } catch (error) {
    console.error('❌ Błąd tworzenia testowych kont:', error);
  }
};
