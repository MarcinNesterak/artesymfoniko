import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import session from "express-session";
import MongoStore from "connect-mongo";
import webpush from "web-push";

// Middleware
import { apiLimiter } from "./middleware/rateLimiter.js";

// Routes
import usersRoutes from "./routes/users.js";
import authRoutes from "./routes/auth.js";
import eventsRoutes from "./routes/events.js";
import privateMessageRoutes from "./routes/privateMessages.js"; // IMPORT
import notificationRoutes from "./routes/notifications.js";

// Import models
import User from "./models/User.js";
import Event from "./models/Event.js";
import Invitation from "./models/Invitation.js";
import Participation from "./models/Participation.js";

// Load environment variables
dotenv.config();

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
  console.error(
    "VAPID keys are not configured. Please set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT in your .env file."
  );
} else {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  console.log("✅ VAPID keys configured for web-push");
}

const app = express();
const PORT = process.env.PORT || 3002;

// Trust proxy - potrzebne dla rate limiting na Railway
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());

// Nowa, bardziej elastyczna konfiguracja CORS
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://artesymfoniko.vercel.app",
  /^https:\/\/artesymfoniko-.*\.vercel\.app$/,
  "http://artesymfoniko.pl",
  "https://artesymfoniko.pl",
  "http://www.artesymfoniko.pl",
  "https://www.artesymfoniko.pl",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Zezwalaj na żądania bez 'origin' (np. aplikacje mobilne, Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.some(pattern => {
        if (pattern instanceof RegExp) {
          return pattern.test(origin);
        }
        return pattern === origin;
      })) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting dla wszystkich endpointów API
app.use("/api/", apiLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Konfiguracja sesji z MongoDB
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60, // 14 dni
      autoRemove: "native",
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 14 * 24 * 60 * 60 * 1000,
    },
  })
);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/private-messages", privateMessageRoutes); // UŻYCIE
app.use("/api/notifications", notificationRoutes);

// Health check routes
app.get("/", (req, res) => {
  res.status(200).json({
    message: "🎼 Orchestra Backend API",
    status: "running",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "Orchestra Backend",
    port: PORT,
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    database: mongoose.connection.name,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Test database connection
app.get("/api/test-db", async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const eventCount = await Event.countDocuments();
    const invitationCount = await Invitation.countDocuments();
    const participationCount = await Participation.countDocuments();

    res.json({
      message: "Database connection test successful!",
      collections: {
        users: userCount,
        events: eventCount,
        invitations: invitationCount,
        participations: participationCount,
      },
      mongodb: {
        state: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Database test failed",
      message: error.message,
    });
  }
});

// Tymczasowy endpoint do sprawdzenia zmiennych środowiskowych
app.get("/api/debug/env", (req, res) => {
  res.json({
    REDIS_URL: process.env.REDIS_URL ? "Set" : "Not set",
    NODE_ENV: process.env.NODE_ENV,
    MONGODB_URI: process.env.MONGODB_URI ? "Set" : "Not set",
  });
});

// Debugowanie zmiennych środowiskowych
console.log("Environment variables check:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "Set" : "Not set");
console.log("REDIS_URL:", process.env.REDIS_URL ? "Set" : "Not set");
if (process.env.REDIS_URL) {
  console.log(
    "Redis URL format:",
    process.env.REDIS_URL.substring(0, 20) + "..."
  );
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: err.message,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log("\n🚀 Orchestra Backend Server Started");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test DB: http://localhost:${PORT}/api/test-db`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/*`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received, shutting down gracefully");
  mongoose.connection.close(() => {
    console.log("📊 MongoDB connection closed");
    process.exit(0);
  });
});