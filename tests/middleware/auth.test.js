const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../../middleware/auth");

jest.mock("@prisma/client");
const { PrismaClient } = require("@prisma/client");

const app = express();
app.use(express.json());

// Dummy protected route for testing
app.get("/protected", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

describe("Auth Middleware", () => {
  let prismaMock;
  let validToken;
  let user;

  beforeAll(() => {
    user = {
      id: "user123",
      username: "testuser",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      profilePicture: null,
      isEmailVerified: true,
    };
    process.env.JWT_SECRET = "testsecret";
    validToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
  });

  beforeEach(() => {
    prismaMock = {
      blacklistedToken: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    PrismaClient.mockImplementation(() => prismaMock);
  });

  it("should return 401 if no token is provided", async () => {
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Access token required");
  });

  it("should return 401 if token is blacklisted", async () => {
    prismaMock.blacklistedToken.findUnique.mockResolvedValue({
      token: validToken,
    });
    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${validToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Token has been invalidated");
  });

  it("should return 403 if token is invalid", async () => {
    prismaMock.blacklistedToken.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer invalidtoken");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Invalid token");
  });

  it("should return 401 if token is expired", async () => {
    prismaMock.blacklistedToken.findUnique.mockResolvedValue(null);
    const expiredToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "-1s",
    });
    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Token expired");
  });

  it("should return 401 if user not found", async () => {
    prismaMock.blacklistedToken.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${validToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("User not found");
  });

  it("should call next and attach user if token is valid", async () => {
    prismaMock.blacklistedToken.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(user);
    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: user.id,
      username: user.username,
    });
  });
});
