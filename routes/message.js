const express = require("express");
const { body } = require("express-validator");
const messageController = require("../controllers/messageController");

const router = express.Router();

// Validation middleware
const sendMessageValidation = [
  body("receiverId")
    .notEmpty()
    .withMessage("Receiver ID is required")
    .isLength({ min: 1 })
    .withMessage("Invalid receiver ID"),
  body("content")
    .notEmpty()
    .withMessage("Message content is required")
    .isLength({ max: 1000 })
    .withMessage("Message content cannot exceed 1000 characters"),
  body("messageType")
    .optional()
    .isIn(["text", "image"])
    .withMessage("Invalid message type"),
];

// Send message
router.post("/send", sendMessageValidation, messageController.sendMessage);

// Get messages with a specific user
router.get("/conversation/:userId", messageController.getMessages);

// Mark messages as read
router.patch("/read/:userId", messageController.markAsRead);

// Get unread message count
router.get("/unread/count", messageController.getUnreadCount);

// Get conversations list
router.get("/conversations", messageController.getConversations);

// Delete a message
router.delete("/:messageId", messageController.deleteMessage);

module.exports = router;
