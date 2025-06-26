const multer = require("multer");
const path = require("path");

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.fieldname === "profilePicture" || file.fieldname === "image") {
    // Accept images only
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  } else {
    cb(new Error("Invalid field name"), false);
  }
};

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory for Cloudinary
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only one file at a time
  },
  fileFilter,
});

// Middleware for profile picture upload
const uploadProfilePicture = upload.single("profilePicture");

// Middleware for message image upload
const uploadMessageImage = upload.single("image");

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File too large",
        message: "File size cannot exceed 5MB",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        error: "Too many files",
        message: "Only one file is allowed",
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: "Invalid field name",
        message: "Unexpected field in file upload",
      });
    }
  }

  if (error.message === "Only image files are allowed") {
    return res.status(400).json({
      error: "Invalid file type",
      message: "Only image files (PNG, JPEG, GIF, etc.) are allowed",
    });
  }

  next(error);
};

module.exports = {
  uploadProfilePicture,
  uploadMessageImage,
  handleUploadError,
};
