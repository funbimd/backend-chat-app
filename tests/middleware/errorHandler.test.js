const request = require("supertest");
const express = require("express");
const errorHandler = require("../../middleware/errorHandler");

describe("Error Handler Middleware", () => {
  let app;

  beforeEach(() => {
    app = express();
    // Dummy route to trigger errors
    app.get("/error", (req, res, next) => {
      const err = new Error("Custom error message");
      err.status = 418;
      next(err);
    });
    app.get("/default-error", (req, res, next) => {
      next(new Error());
    });
    app.use(errorHandler);
  });

  it("should handle custom error status and message", async () => {
    const res = await request(app).get("/error");
    expect(res.status).toBe(418);
    expect(res.body.error.message).toBe("Custom error message");
  });

  it("should handle default 500 error and message", async () => {
    const res = await request(app).get("/default-error");
    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe("Internal Server Error");
  });
});
