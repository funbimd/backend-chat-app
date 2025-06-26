const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Import routes and middleware
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const friendRoutes = require("./routes/friend");
const messageRoutes = require("./routes/message");
const { authenticateToken } = require("./middleware/auth");
const { setupSocket } = require("./socket/socketHandler");
const connectMongoDB = require("./config/mongodb");
// const swaggerSetup = require("./config/swagger");

const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    error: "Too many login attempts, please try again later.",
  },
});

app.use(limiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Swagger documentation
// swaggerSetup(app);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", authenticateToken, userRoutes);
app.use("/api/friends", authenticateToken, friendRoutes);
app.use("/api/messages", authenticateToken, messageRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Socket.IO setup
const io = socketIo(server, {
  cors: corsOptions,
});

setupSocket(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    ...(process.env.NODE_ENV === "development" && { details: err.message }),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectMongoDB();
    console.log("MongoDB connected successfully");

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(
        `API Documentation available at http://localhost:${PORT}/api-docs`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
