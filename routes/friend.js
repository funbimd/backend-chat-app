const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

// Send friend request
router.post(
  "/request",
  [body("username").isLength({ min: 3, max: 20 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
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
        return res.status(409).json({ error: "Friend request already exists" });
      }

      const friendRequest = await prisma.friendRequest.create({
        data: {
          senderId: req.user.id,
          receiverId: targetUser.id,
        },
        include: {
          sender: {
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

      res.status(201).json({
        message: "Friend request sent successfully",
        request: friendRequest,
      });
    } catch (error) {
      console.error("Send friend request error:", error);
      res.status(500).json({ error: "Failed to send friend request" });
    }
  }
);

// Get pending friend requests
router.get("/requests", async (req, res) => {
  try {
    const requests = await prisma.friendRequest.findMany({
      where: {
        receiverId: req.user.id,
        status: "pending",
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(requests);
  } catch (error) {
    console.error("Get friend requests error:", error);
    res.status(500).json({ error: "Failed to fetch friend requests" });
  }
});

// Respond to friend request
router.patch(
  "/request/:requestId",
  [body("action").isIn(["accept", "reject"])],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
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
  }
);

// Get friends list
router.get("/", async (req, res) => {
  try {
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

    const friends = friendships.map((friendship) => {
      return friendship.user1Id === req.user.id
        ? friendship.user2
        : friendship.user1;
    });

    res.json(friends);
  } catch (error) {
    console.error("Get friends error:", error);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

module.exports = router;
