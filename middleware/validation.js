const { body, param, query } = require("express-validator");

const validationRules = {
  // Auth validations
  register: [
    body("username")
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage("Username must be between 3 and 20 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage(
        "Username can only contain letters, numbers, and underscores"
      ),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "Password must contain at least one lowercase letter, one uppercase letter, and one number"
      ),
    body("firstName")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("First name cannot exceed 50 characters"),
    body("lastName")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Last name cannot exceed 50 characters"),
  ],

  login: [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],

  // User validations
  updateProfile: [
    body("username")
      .optional()
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage("Username must be between 3 and 20 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage(
        "Username can only contain letters, numbers, and underscores"
      ),
    body("firstName")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("First name cannot exceed 50 characters"),
    body("lastName")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Last name cannot exceed 50 characters"),
    body("bio")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Bio cannot exceed 500 characters"),
  ],

  changePassword: [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "New password must contain at least one lowercase letter, one uppercase letter, and one number"
      ),
  ],

  // Friend validations
  sendFriendRequest: [
    body("username")
      .trim()
      .notEmpty()
      .withMessage("Username is required")
      .isLength({ min: 3, max: 20 })
      .withMessage("Invalid username format"),
  ],

  respondToRequest: [
    param("requestId").notEmpty().withMessage("Request ID is required"),
    body("action")
      .isIn(["accept", "reject"])
      .withMessage("Action must be either 'accept' or 'reject'"),
  ],

  // Message validations
  sendMessage: [
    body("receiverId").notEmpty().withMessage("Receiver ID is required"),
    body("content")
      .trim()
      .notEmpty()
      .withMessage("Message content is required")
      .isLength({ min: 1, max: 1000 })
      .withMessage("Message content must be between 1 and 1000 characters"),
    body("messageType")
      .optional()
      .isIn(["text", "image"])
      .withMessage("Message type must be either 'text' or 'image'"),
  ],

  // Query validations
  pagination: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],

  search: [
    query("query")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Search query must be between 2 and 50 characters"),
  ],
};

module.exports = validationRules;
