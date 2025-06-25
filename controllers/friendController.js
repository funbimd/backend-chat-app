const { validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { selectUserFields } = require("../utils/userUtils");

const prisma = new PrismaClient();

const friendController = {
  // Send friend request
  sendFriendRequest: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          errors: errors.array(),
        });
      }

      const { username } = req.body;

      // Find the user to send request to
      const targetUser = await prisma.user.findUnique({
        where: { username },
      });

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (targetUser.id === req.user.id) {
        return res
          .status(400)
          .json({ error: "Cannot send friend request to yourself" });
      }

      // Check if friendship already exists
      const existingFriendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user1Id: req.user.id, user2Id: targetUser.id },
            { user1Id: targetUser.id, user2Id: req.user.id },
          ],
        },
      });

      if (existingFriendship) {
        return res
          .status(409)
          .json({ error: "Already friends with this user" });
      }

      // Check if request already exists
      const existingRequest = await prisma.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: req.user.id, receiverId: targetUser.id },
            { senderId: targetUser.id, receiverId: req.user.id },
          ],
        },
      });

      if (existingRequest) {
        if (existingRequest.status === "pending") {
          return res
            .status(409)
            .json({ error: "Friend request already exists" });
        } else if (existingRequest.status === "rejected") {
          // Update existing rejected request to pending
          const updatedRequest = await prisma.friendRequest.update({
            where: { id: existingRequest.id },
            data: {
              status: "pending",
              senderId: req.user.id,
              receiverId: targetUser.id,
              updatedAt: new Date(),
            },
            include: {
              sender: {
                select: selectUserFields,
              },
            },
          });

          return res.status(201).json({
            message: "Friend request sent successfully",
            request: updatedRequest,
          });
        }
      }

      const friendRequest = await prisma.friendRequest.create({
        data: {
          senderId: req.user.id,
          receiverId: targetUser.id,
        },
        include: {
          sender: {
            select: selectUserFields,
          },
        },
      });

      res.status(201).json({
        message: "Friend request sent successfully",
        request: friendRequest,
      });
    } catch (error) {
      console.error("Send friend request error:", error);
      res.status(500).json({ error: "Failed to send friend request" });
    }
  },

  // Get pending friend requests (received)
  getPendingRequests: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * parseInt(limit);

      const requests = await prisma.friendRequest.findMany({
        where: {
          receiverId: req.user.id,
          status: "pending",
        },
        include: {
          sender: {
            select: selectUserFields,
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      });

      const totalRequests = await prisma.friendRequest.count({
        where: {
          receiverId: req.user.id,
          status: "pending",
        },
      });

      res.json({
        requests,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalRequests / parseInt(limit)),
          count: totalRequests,
        },
      });
    } catch (error) {
      console.error("Get friend requests error:", error);
      res.status(500).json({ error: "Failed to fetch friend requests" });
    }
  },

  // Get sent friend requests
  getSentRequests: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * parseInt(limit);

      const requests = await prisma.friendRequest.findMany({
        where: {
          senderId: req.user.id,
          status: "pending",
        },
        include: {
          receiver: {
            select: selectUserFields,
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      });

      const totalRequests = await prisma.friendRequest.count({
        where: {
          senderId: req.user.id,
          status: "pending",
        },
      });

      res.json({
        requests,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalRequests / parseInt(limit)),
          count: totalRequests,
        },
      });
    } catch (error) {
      console.error("Get sent requests error:", error);
      res.status(500).json({ error: "Failed to fetch sent requests" });
    }
  },

  // Respond to friend request (accept/reject)
  respondToRequest: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          errors: errors.array(),
        });
      }

      const { requestId } = req.params;
      const { action } = req.body;

      const friendRequest = await prisma.friendRequest.findFirst({
        where: {
          id: requestId,
          receiverId: req.user.id,
          status: "pending",
        },
      });

      if (!friendRequest) {
        return res.status(404).json({ error: "Friend request not found" });
      }

      await prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: action === "accept" ? "accepted" : "rejected" },
      });

      if (action === "accept") {
        // Create friendship
        await prisma.friendship.create({
          data: {
            user1Id: friendRequest.senderId,
            user2Id: req.user.id,
          },
        });
      }

      res.json({
        message: `Friend request ${action}ed successfully`,
      });
    } catch (error) {
      console.error("Respond to friend request error:", error);
      res.status(500).json({ error: "Failed to respond to friend request" });
    }
  },

  // Cancel sent friend request
  cancelRequest: async (req, res) => {
    try {
      const { requestId } = req.params;

      const friendRequest = await prisma.friendRequest.findFirst({
        where: {
          id: requestId,
          senderId: req.user.id,
          status: "pending",
        },
      });

      if (!friendRequest) {
        return res.status(404).json({ error: "Friend request not found" });
      }

      await prisma.friendRequest.delete({
        where: { id: requestId },
      });

      res.json({ message: "Friend request cancelled successfully" });
    } catch (error) {
      console.error("Cancel friend request error:", error);
      res.status(500).json({ error: "Failed to cancel friend request" });
    }
  },

  // Get friends list
  getFriends: async (req, res) => {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const skip = (page - 1) * parseInt(limit);

      let whereClause = {
        OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }],
      };

      // Add search functionality
      if (search && search.trim()) {
        whereClause.OR = [
          {
            user1Id: req.user.id,
            user2: {
              OR: [
                { username: { contains: search, mode: "insensitive" } },
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
              ],
            },
          },
          {
            user2Id: req.user.id,
            user1: {
              OR: [
                { username: { contains: search, mode: "insensitive" } },
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        ];
      }

      const friendships = await prisma.friendship.findMany({
        where: whereClause,
        include: {
          user1: {
            select: selectUserFields,
          },
          user2: {
            select: selectUserFields,
          },
        },
        orderBy: {
          user1: { username: "asc" },
        },
        skip,
        take: parseInt(limit),
      });

      const totalFriends = await prisma.friendship.count({
        where: {
          OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }],
        },
      });

      const friends = friendships.map((friendship) => {
        return friendship.user1Id === req.user.id
          ? friendship.user2
          : friendship.user1;
      });

      res.json({
        friends,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalFriends / parseInt(limit)),
          count: totalFriends,
        },
      });
    } catch (error) {
      console.error("Get friends error:", error);
      res.status(500).json({ error: "Failed to fetch friends" });
    }
  },

  // Remove friend
  removeFriend: async (req, res) => {
    try {
      const { friendId } = req.params;

      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user1Id: req.user.id, user2Id: friendId },
            { user1Id: friendId, user2Id: req.user.id },
          ],
        },
      });

      if (!friendship) {
        return res.status(404).json({ error: "Friendship not found" });
      }

      await prisma.friendship.delete({
        where: { id: friendship.id },
      });

      res.json({ message: "Friend removed successfully" });
    } catch (error) {
      console.error("Remove friend error:", error);
      res.status(500).json({ error: "Failed to remove friend" });
    }
  },

  // Block user
  blockUser: async (req, res) => {
    try {
      const { userId } = req.params;

      if (userId === req.user.id) {
        return res.status(400).json({ error: "Cannot block yourself" });
      }

      // Check if already blocked
      const existingBlock = await prisma.blockedUser.findFirst({
        where: {
          blockerId: req.user.id,
          blockedId: userId,
        },
      });

      if (existingBlock) {
        return res.status(409).json({ error: "User already blocked" });
      }

      // Remove friendship if exists
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user1Id: req.user.id, user2Id: userId },
            { user1Id: userId, user2Id: req.user.id },
          ],
        },
      });

      if (friendship) {
        await prisma.friendship.delete({
          where: { id: friendship.id },
        });
      }

      // Delete any pending or accepted friend requests
      await prisma.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: req.user.id, receiverId: userId },
            { senderId: userId, receiverId: req.user.id },
          ],
        },
      });

      // Block the user
      const blocked = await prisma.blockedUser.create({
        data: {
          blockerId: req.user.id,
          blockedId: userId,
        },
      });

      res.status(201).json({
        message: "User blocked successfully",
        blocked,
      });
    } catch (error) {
      console.error("Block user error:", error);
      res.status(500).json({ error: "Failed to block user" });
    }
  },

  // Unblock user
  unblockUser: async (req, res) => {
    try {
      const { userId } = req.params;

      const block = await prisma.blockedUser.findFirst({
        where: {
          blockerId: req.user.id,
          blockedId: userId,
        },
      });

      if (!block) {
        return res.status(404).json({ error: "Block record not found" });
      }

      await prisma.blockedUser.delete({
        where: { id: block.id },
      });

      res.json({ message: "User unblocked successfully" });
    } catch (error) {
      console.error("Unblock user error:", error);
      res.status(500).json({ error: "Failed to unblock user" });
    }
  },
};

module.exports = friendController;
