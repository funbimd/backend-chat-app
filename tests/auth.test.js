const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

jest.mock('../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(),
}));
const request = require('supertest');
const app = require('../app');

describe('Auth Endpoints', () => {
  const unique = Date.now();
  const user = {
    username: `test${unique}`,
    email: `test${unique}@example.com`,
    password: 'password123',
  };

  beforeAll(async () => {
    const regRes = await request(app).post('/api/auth/register').send(user);
    // Mark user as verified in Postgres
    await prisma.user.update({
      where: { email: user.email },
      data: { isEmailVerified: true },
    });
    console.log('Registration response:', regRes.statusCode, regRes.body);
  });

  it('should login a registered user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: user.password,
      });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
  });
});
