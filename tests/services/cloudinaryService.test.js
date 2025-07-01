const cloudinary = require("cloudinary").v2;
const { uploadImage } = require("../../services/cloudinaryService");

jest.mock("cloudinary");
cloudinary.v2 = cloudinary;

describe("cloudinaryService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should resolve with secure_url on successful upload", async () => {
    const mockStream = { end: jest.fn() };
    cloudinary.uploader = {
      upload_stream: jest.fn((options, cb) => {
        // Simulate cloudinary calling the callback with a result
        setImmediate(() =>
          cb(null, { secure_url: "https://cloudinary.com/fake-image.jpg" })
        );
        return mockStream;
      }),
    };
    const buffer = Buffer.from("fake image data");
    const url = await uploadImage(buffer);
    expect(url).toBe("https://cloudinary.com/fake-image.jpg");
    expect(cloudinary.uploader.upload_stream).toHaveBeenCalled();
    expect(mockStream.end).toHaveBeenCalledWith(buffer);
  });

  it("should reject with error on failed upload", async () => {
    const mockStream = { end: jest.fn() };
    cloudinary.uploader = {
      upload_stream: jest.fn((options, cb) => {
        setImmediate(() => cb(new Error("Upload failed")));
        return mockStream;
      }),
    };
    const buffer = Buffer.from("fake image data");
    await expect(uploadImage(buffer)).rejects.toThrow("Upload failed");
    expect(cloudinary.uploader.upload_stream).toHaveBeenCalled();
    expect(mockStream.end).toHaveBeenCalledWith(buffer);
  });
});
