const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../app');

const prisma = new PrismaClient();

describe('Auth Endpoints', () => {
  let userId;
  let token;
  const unique = Math.floor(Math.random() * 1000000); // always < 20 chars
  const email = `t${unique}@ex.com`;
  const username = `t${unique}`; // e.g. t123456
  const password = 'password123';

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username,
        email,
        password,
      });
    console.log('Register response:', res.body);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('userId');
    userId = res.body.userId;
  });

  it('should simulate email verification in DB', async () => {
    if (!userId) throw new Error('No userId from registration');
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true, emailVerificationToken: null },
    });
    expect(user.isEmailVerified).toBe(true);
  });

  it('should login after email verification', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    console.log('Login response:', res.body);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });
});
