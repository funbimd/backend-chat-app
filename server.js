const http = require("http");
const socketIo = require("socket.io");
const app = require("./app");
const { setupSocket } = require("./socket/socketHandler");
const connectMongoDB = require("./config/mongodb");

const server = http.createServer(app);

// CORS configuration (should match app.js)
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Socket.IO setup
const io = socketIo(server, {
  cors: corsOptions,
});

setupSocket(io);

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
