const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Backend Socket Integration API",
    version: "1.0.0",
    description: "Real-time chat API with user management and friend system",
  },
  servers: [
    {
      url:
        process.env.NODE_ENV === "production"
          ? "https://your-api-domain.com"
          : "http://localhost:3000",
      description:
        process.env.NODE_ENV === "production"
          ? "Production server"
          : "Development server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          username: { type: "string" },
          email: { type: "string" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          profilePicture: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      FriendRequest: {
        type: "object",
        properties: {
          id: { type: "string" },
          senderId: { type: "string" },
          receiverId: { type: "string" },
          status: { type: "string", enum: ["pending", "accepted", "rejected"] },
          createdAt: { type: "string", format: "date-time" },
          sender: { $ref: "#/components/schemas/User" },
        },
      },
      Message: {
        type: "object",
        properties: {
          id: { type: "string" },
          senderId: { type: "string" },
          receiverId: { type: "string" },
          content: { type: "string" },
          messageType: { type: "string", enum: ["text", "image"] },
          isRead: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check endpoint",
        responses: {
          200: {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    timestamp: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "email", "password"],
                properties: {
                  username: { type: "string", minLength: 3, maxLength: 20 },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                  firstName: { type: "string", maxLength: 50 },
                  lastName: { type: "string", maxLength: 50 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    userId: { type: "string" },
                  },
                },
              },
            },
          },
          400: {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          409: {
            description: "User already exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          401: {
            description: "Invalid credentials or email not verified",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Logout user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Logout successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/auth/verify-email/{token}": {
      get: {
        tags: ["Authentication"],
        summary: "Verify email address",
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Email verified successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid or expired token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/user/profile": {
      get: {
        tags: ["User"],
        summary: "Get user profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "User profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["User"],
        summary: "Update user profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  firstName: { type: "string", maxLength: 50 },
                  lastName: { type: "string", maxLength: 50 },
                  username: { type: "string", minLength: 3, maxLength: 20 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Profile updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
      },
    },
    "/api/user/profile-picture": {
      post: {
        tags: ["User"],
        summary: "Upload profile picture",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  profilePicture: {
                    type: "string",
                    format: "binary",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Profile picture uploaded successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
      },
    },
    "/api/user/account": {
      delete: {
        tags: ["User"],
        summary: "Delete user account",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Account deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/friends/request": {
      post: {
        tags: ["Friends"],
        summary: "Send friend request",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username"],
                properties: {
                  username: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Friend request sent successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    request: { $ref: "#/components/schemas/FriendRequest" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/friends/requests": {
      get: {
        tags: ["Friends"],
        summary: "Get pending friend requests",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "List of pending friend requests",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/FriendRequest" },
                },
              },
            },
          },
        },
      },
    },
    "/api/friends/request/{requestId}": {
      patch: {
        tags: ["Friends"],
        summary: "Accept or reject friend request",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "requestId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: {
                  action: { type: "string", enum: ["accept", "reject"] },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Friend request processed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/friends": {
      get: {
        tags: ["Friends"],
        summary: "Get friends list",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "List of friends",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/User" },
                },
              },
            },
          },
        },
      },
    },
  },
};

const setupSwagger = (app) => {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customCss: ".swagger-ui .topbar { display: none }",
      customCssUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css",
    })
  );
};

module.exports = setupSwagger;
