const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const Message = require("../models/Message");

const prisma = new PrismaClient();

const setupSocket = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error"));
      }

      // Check if token is blacklisted
      const blacklistedToken = await prisma.blacklistedToken.findUnique({
        where: { token },
      });

      if (blacklistedToken) {
        return next(new Error("Token has been invalidated"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
        },
      });

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User ${socket.user.username} connected`);

    // Join personal room
    socket.join(socket.userId);

    // Handle sending messages
    socket.on("send_message", async (data) => {
      try {
        const { receiverId, content, messageType = "text" } = data;

        // Verify friendship exists
        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { user1Id: socket.userId, user2Id: receiverId },
              { user1Id: receiverId, user2Id: socket.userId },
            ],
          },
        });

        if (!friendship) {
          socket.emit("error", { message: "Can only message friends" });
          return;
        }

        // Save message to MongoDB
        const message = new Message({
          senderId: socket.userId,
          receiverId,
          content,
          messageType,
        });

        await message.save();

        // Emit to receiver
        io.to(receiverId).emit("new_message", {
          id: message._id,
          senderId: socket.userId,
          senderInfo: {
            username: socket.user.username,
            firstName: socket.user.firstName,
            lastName: socket.user.lastName,
            profilePicture: socket.user.profilePicture,
          },
          content,
          messageType,
          createdAt: message.createdAt,
        });

        // Confirm to sender
        socket.emit("message_sent", {
          id: message._id,
          receiverId,
          content,
          messageType,
          createdAt: message.createdAt,
        });
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle getting chat history
    socket.on("get_chat_history", async (data) => {
      try {
        const { friendId, page = 1, limit = 50 } = data;

        // Verify friendship
        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { user1Id: socket.userId, user2Id: friendId },
              { user1Id: friendId, user2Id: socket.userId },
            ],
          },
        });

        if (!friendship) {
          socket.emit("error", {
            message: "Can only view chat history with friends",
          });
          return;
        }

        // Get messages from MongoDB
        const messages = await Message.find({
          $or: [
            { senderId: socket.userId, receiverId: friendId },
            { senderId: friendId, receiverId: socket.userId },
          ],
        })
          .sort({ createdAt: -1 })
          .limit(limit * page)
          .skip((page - 1) * limit);

        // Get friend info
        const friend = await prisma.user.findUnique({
          where: { id: friendId },
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        });

        socket.emit("chat_history", {
          messages: messages.reverse(),
          friend,
          page,
          hasMore: messages.length === limit,
        });
      } catch (error) {
        console.error("Get chat history error:", error);
        socket.emit("error", { message: "Failed to get chat history" });
      }
    });

    // Handle marking messages as read
    socket.on("mark_messages_read", async (data) => {
      try {
        const { friendId } = data;

        await Message.updateMany(
          {
            senderId: friendId,
            receiverId: socket.userId,
            isRead: false,
          },
          { isRead: true }
        );

        socket.emit("messages_marked_read", { friendId });
      } catch (error) {
        console.error("Mark messages read error:", error);
        socket.emit("error", { message: "Failed to mark messages as read" });
      }
    });

    // Handle typing indicators
    socket.on("typing_start", (data) => {
      const { receiverId } = data;
      io.to(receiverId).emit("user_typing", {
        userId: socket.userId,
        username: socket.user.username,
      });
    });

    socket.on("typing_stop", (data) => {
      const { receiverId } = data;
      io.to(receiverId).emit("user_stopped_typing", {
        userId: socket.userId,
      });
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.user.username} disconnected`);
    });
  });
};

module.exports = { setupSocket };
