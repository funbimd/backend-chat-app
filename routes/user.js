const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { uploadImage } = require("../services/cloudinaryService");
const multer = require("multer");

const router = express.Router();
const prisma = new PrismaClient();

// Multer configuration for file uploads
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Get profile
router.get("/profile", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update profile
router.patch(
  "/profile",
  [
    body("firstName").optional().isLength({ min: 1, max: 50 }),
    body("lastName").optional().isLength({ min: 1, max: 50 }),
    body("username")
      .optional()
      .isLength({ min: 3, max: 20 })
      .matches(/^[a-zA-Z0-9_]+$/),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName, username } = req.body;
      const updateData = {};

      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;

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
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          createdAt: true,
        },
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  }
);

// Upload profile picture
router.post(
  "/profile-picture",
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const imageUrl = await uploadImage(req.file.buffer);

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { profilePicture: imageUrl },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          createdAt: true,
        },
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Profile picture upload error:", error);
      res.status(500).json({ error: "Failed to upload profile picture" });
    }
  }
);

// Delete account
router.delete("/account", async (req, res) => {
  try {
    await prisma.user.delete({
      where: { id: req.user.id },
    });

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

module.exports = router;
