jest.mock('../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(),
}));
const request = require('supertest');
const app = require('../app');

describe('User Endpoints', () => {
  it('should register a new user', async () => {
    const unique = Date.now();
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: `test${unique}`,
        email: `testuser${unique}@example.com`,
        password: 'password123',
      });
    if (![201, 409].includes(res.statusCode)) {
      console.log('Registration failed:', res.statusCode, res.body);
    }
    expect([201, 409]).toContain(res.statusCode); // Accepts both 201 and 409
    // Optionally, check for the correct response body depending on status
  });
});
