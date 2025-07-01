const sgMail = require("@sendgrid/mail");
const { sendVerificationEmail } = require("../../services/emailService");

jest.mock("@sendgrid/mail");

describe("emailService", () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
    process.env.FRONTEND_URL = "http://localhost:3000";
    process.env.FROM_EMAIL = "noreply@example.com";
    process.env.SENDGRID_API_KEY = "fake-key";
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("should skip sending email in test environment", async () => {
    process.env.NODE_ENV = "test";
    await expect(
      sendVerificationEmail("test@example.com", "token123")
    ).resolves.toBeUndefined();
    expect(sgMail.send).not.toHaveBeenCalled();
  });

  it("should send verification email successfully", async () => {
    process.env.NODE_ENV = "production";
    sgMail.send.mockResolvedValueOnce();
    await expect(
      sendVerificationEmail("user@example.com", "token456")
    ).resolves.toBeUndefined();
    expect(sgMail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        from: "noreply@example.com",
        subject: expect.any(String),
        html: expect.stringContaining("token456"),
      })
    );
  });

  it("should throw error if sending fails", async () => {
    process.env.NODE_ENV = "production";
    sgMail.send.mockRejectedValueOnce(new Error("Send failed"));
    await expect(
      sendVerificationEmail("fail@example.com", "token789")
    ).rejects.toThrow("Failed to send verification email");
    expect(sgMail.send).toHaveBeenCalled();
  });
});
