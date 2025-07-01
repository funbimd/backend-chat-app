const { validationResult } = require("express-validator");
const Message = require("../models/Message");
const { PrismaClient } = require("@prisma/client");

// Initialize Prisma client with error handling
let prisma;
try {
  prisma = new PrismaClient();
} catch (error) {
  console.error("Failed to initialize Prisma client:", error);
}

const messageController = {
  // Send a message
  sendMessage: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          errors: errors.array(),
        });
      }

      const { receiverId, content, messageType = "text" } = req.body;

      // Check if Prisma is available
      if (!prisma) {
        return res.status(500).json({
          error: "Database connection error",
        });
      }

      // Check if receiver exists and is a friend
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user1Id: req.user.id, user2Id: receiverId },
            { user1Id: receiverId, user2Id: req.user.id },
          ],
        },
      });

      if (!friendship) {
        return res.status(403).json({
          error: "You can only send messages to friends",
        });
      }

      // Check if user is blocked
      const isBlocked = await prisma.blockedUser.findFirst({
        where: {
          OR: [
            { blockerId: receiverId, blockedId: req.user.id },
            { blockerId: req.user.id, blockedId: receiverId },
          ],
        },
      });

      if (isBlocked) {
        return res.status(403).json({
          error: "Cannot send message to this user",
        });
      }

      const message = new Message({
        senderId: req.user.id,
        receiverId,
        content,
        messageType,
      });

      await message.save();

      res.status(201).json({
        message: "Message sent successfully",
        data: message,
      });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  },

  // Get messages between two users
  getMessages: async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const skip = (page - 1) * parseInt(limit);

      // Check if Prisma is available
      if (!prisma) {
        return res.status(500).json({
          error: "Database connection error",
        });
      }

      // Verify friendship
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user1Id: req.user.id, user2Id: userId },
            { user1Id: userId, user2Id: req.user.id },
          ],
        },
      });

      if (!friendship) {
        return res.status(403).json({
          error: "You can only view messages with friends",
        });
      }

      const messages = await Message.find({
        $or: [
          { senderId: req.user.id, receiverId: userId },
          { senderId: userId, receiverId: req.user.id },
        ],
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const totalMessages = await Message.countDocuments({
        $or: [
          { senderId: req.user.id, receiverId: userId },
          { senderId: userId, receiverId: req.user.id },
        ],
      });

      res.json({
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalMessages / parseInt(limit)),
          count: totalMessages,
        },
      });
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  },

  // Mark messages as read
  markAsRead: async (req, res) => {
    try {
      const { userId } = req.params;

      await Message.updateMany(
        {
          senderId: userId,
          receiverId: req.user.id,
          isRead: false,
        },
        {
          isRead: true,
        }
      );

      res.json({ message: "Messages marked as read" });
    } catch (error) {
      console.error("Mark as read error:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  },

  // Get unread message count
  getUnreadCount: async (req, res) => {
    try {
      const unreadCount = await Message.countDocuments({
        receiverId: req.user.id,
        isRead: false,
      });

      res.json({ unreadCount });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  },

  // Get conversations list
  getConversations: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * parseInt(limit);

      // Check if Prisma is available
      if (!prisma) {
        return res.status(500).json({
          error: "Database connection error",
        });
      }

      // Get all friends
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }],
        },
        include: {
          user1: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
            },
          },
          user2: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
            },
          },
        },
      });

      const conversations = [];

      for (const friendship of friendships) {
        const friend =
          friendship.user1Id === req.user.id
            ? friendship.user2
            : friendship.user1;

        // Get last message
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: req.user.id, receiverId: friend.id },
            { senderId: friend.id, receiverId: req.user.id },
          ],
        })
          .sort({ createdAt: -1 })
          .lean();

        // Get unread count
        const unreadCount = await Message.countDocuments({
          senderId: friend.id,
          receiverId: req.user.id,
          isRead: false,
        });

        if (lastMessage) {
          conversations.push({
            friend,
            lastMessage,
            unreadCount,
            updatedAt: lastMessage.createdAt,
          });
        }
      }

      // Sort by last message time
      conversations.sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );

      const paginatedConversations = conversations.slice(
        skip,
        skip + parseInt(limit)
      );

      res.json({
        conversations: paginatedConversations,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(conversations.length / parseInt(limit)),
          count: conversations.length,
        },
      });
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  },

  // Delete a message
  deleteMessage: async (req, res) => {
    try {
      const { messageId } = req.params;

      const message = await Message.findOne({
        _id: messageId,
        senderId: req.user.id,
      });

      if (!message) {
        return res.status(404).json({
          error: "Message not found or you don't have permission to delete it",
        });
      }

      await Message.findByIdAndDelete(messageId);

      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      console.error("Delete message error:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  },
};

module.exports = messageController;
