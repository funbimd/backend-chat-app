const { validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { uploadImage } = require("../services/cloudinaryService");
const { selectUserFields } = require("../utils/userUtils");

const prisma = new PrismaClient();

const userController = {
  // Get user profile
  getProfile: async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: selectUserFields,
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          errors: errors.array(),
        });
      }

      const { firstName, lastName, username, bio } = req.body;
      const updateData = {};

      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (bio !== undefined) updateData.bio = bio;

      if (username !== undefined) {
        // Check if username is already taken
        const existingUser = await prisma.user.findFirst({
          where: {
            username,
            NOT: { id: req.user.id },
          },
        });

        if (existingUser) {
          return res.status(409).json({ error: "Username already taken" });
        }
        updateData.username = username;
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
        select: selectUserFields,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  },

  // Upload profile picture
  uploadProfilePicture: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const imageUrl = await uploadImage(req.file.buffer);

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { profilePicture: imageUrl },
        select: selectUserFields,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Profile picture upload error:", error);
      res.status(500).json({ error: "Failed to upload profile picture" });
    }
  },

  // Search users
  searchUsers: async (req, res) => {
    try {
      const { query, page = 1, limit = 10 } = req.query;

      if (!query || query.trim().length < 2) {
        return res
          .status(400)
          .json({ error: "Search query must be at least 2 characters" });
      }

      const skip = (page - 1) * parseInt(limit);

      const users = await prisma.user.findMany({
        where: {
          AND: [
            {
              OR: [
                { username: { contains: query, mode: "insensitive" } },
                { firstName: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
              ],
            },
            { NOT: { id: req.user.id } }, // Exclude current user
            { isEmailVerified: true }, // Only verified users
          ],
        },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
        },
        skip,
        take: parseInt(limit),
        orderBy: { username: "asc" },
      });

      const totalUsers = await prisma.user.count({
        where: {
          AND: [
            {
              OR: [
                { username: { contains: query, mode: "insensitive" } },
                { firstName: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
              ],
            },
            { NOT: { id: req.user.id } },
            { isEmailVerified: true },
          ],
        },
      });

      res.json({
        users,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalUsers / parseInt(limit)),
          count: totalUsers,
        },
      });
    } catch (error) {
      console.error("Search users error:", error);
      res.status(500).json({ error: "Failed to search users" });
    }
  },

  // Get user by username
  getUserByUsername: async (req, res) => {
    try {
      const { username } = req.params;

      const user = await prisma.user.findUnique({
        where: { username },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          bio: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if they are friends
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user1Id: req.user.id, user2Id: user.id },
            { user1Id: user.id, user2Id: req.user.id },
          ],
        },
      });

      // Check if there's a pending friend request
      const pendingRequest = await prisma.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: req.user.id, receiverId: user.id, status: "pending" },
            { senderId: user.id, receiverId: req.user.id, status: "pending" },
          ],
        },
      });

      res.json({
        ...user,
        isFriend: !!friendship,
        hasPendingRequest: !!pendingRequest,
        requestSentByMe: pendingRequest?.senderId === req.user.id,
      });
    } catch (error) {
      console.error("Get user by username error:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  },

  // Delete user account
  deleteAccount: async (req, res) => {
    try {
      const { password } = req.body;

      if (!password) {
        return res
          .status(400)
          .json({ error: "Password required to delete account" });
      }

      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      const bcrypt = require("bcryptjs");
      if (!(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid password" });
      }

      // Delete user (cascade will handle related records)
      await prisma.user.delete({
        where: { id: req.user.id },
      });

      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          errors: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      const bcrypt = require("bcryptjs");
      if (!(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const { hashPassword } = require("../utils/passwordUtils");
      const hashedNewPassword = await hashPassword(newPassword);

      await prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashedNewPassword },
      });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  },

  // Get user statistics
  getUserStats: async (req, res) => {
    try {
      const friendsCount = await prisma.friendship.count({
        where: {
          OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }],
        },
      });

      const pendingRequestsCount = await prisma.friendRequest.count({
        where: {
          receiverId: req.user.id,
          status: "pending",
        },
      });

      // Get message count from MongoDB
      const Message = require("../models/Message");
      const sentMessagesCount = await Message.countDocuments({
        senderId: req.user.id,
      });

      const receivedMessagesCount = await Message.countDocuments({
        receiverId: req.user.id,
      });

      res.json({
        friendsCount,
        pendingRequestsCount,
        sentMessagesCount,
        receivedMessagesCount,
        totalMessagesCount: sentMessagesCount + receivedMessagesCount,
      });
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ error: "Failed to fetch user statistics" });
    }
  },
};

module.exports = userController;
