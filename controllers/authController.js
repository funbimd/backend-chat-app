const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { sendVerificationEmail } = require("../services/emailService");
const {
  createToken,
  generateVerificationToken,
} = require("../utils/tokenUtils");
const { hashPassword } = require("../utils/passwordUtils");

const prisma = new PrismaClient();

const authController = {
  // Register a new user
  register: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          errors: errors.array(),
        });
      }

      const { username, email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        return res.status(409).json({
          error:
            existingUser.email === email
              ? "Email already registered"
              : "Username already taken",
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Generate verification token
      const verificationToken = generateVerificationToken();

      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          firstName,
          lastName,
          emailVerificationToken: verificationToken,
        },
      });

      // Send verification email
      await sendVerificationEmail(email, verificationToken);

      res.status(201).json({
        message:
          "User registered successfully. Please check your email for verification.",
        userId: user.id,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  },

  // Verify email address
  verifyEmail: async (req, res) => {
    try {
      const { token } = req.params;

      const user = await prisma.user.findFirst({
        where: { emailVerificationToken: token },
      });

      if (!user) {
        return res
          .status(400)
          .json({ error: "Invalid or expired verification token" });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          emailVerificationToken: null,
        },
      });

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Email verification failed" });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.isEmailVerified) {
        return res
          .status(401)
          .json({ error: "Please verify your email before logging in" });
      }

      const token = createToken(user.id);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  },

  // Logout user
  logout: async (req, res) => {
    try {
      const decoded = jwt.decode(req.token);
      const expiresAt = new Date(decoded.exp * 1000);

      await prisma.blacklistedToken.create({
        data: {
          token: req.token,
          userId: req.user.id,
          expiresAt,
        },
      });

      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  },

  // Refresh token
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: "Refresh token required" });
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          isEmailVerified: true,
        },
      });

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const newToken = createToken(user.id);

      res.json({
        token: newToken,
        user,
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(401).json({ error: "Invalid refresh token" });
    }
  },

  // Forgot password
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Don't reveal if user exists
        return res.json({
          message:
            "If an account with that email exists, a password reset link has been sent.",
        });
      }

      const resetToken = generateVerificationToken();
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpiry: resetTokenExpiry,
        },
      });

      // Send password reset email (implement this in emailService)
      // await sendPasswordResetEmail(email, resetToken);

      res.json({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res
        .status(500)
        .json({ error: "Failed to process password reset request" });
    }
  },

  // Reset password
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpiry: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        return res
          .status(400)
          .json({ error: "Invalid or expired reset token" });
      }

      const hashedPassword = await hashPassword(newPassword);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
        },
      });

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  },
};

module.exports = authController;
