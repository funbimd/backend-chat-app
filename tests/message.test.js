const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../app');

const prisma = new PrismaClient();

describe('Message Endpoints', () => {
  let userToken;
  let friendToken;
  let friendId;
  let friendUsername;

  beforeAll(async () => {
    const unique = Math.floor(Math.random() * 1000000); // always < 20 chars
    // Register User A
    const usernameA = `t${unique}`;
    const emailA = `t${unique}@ex.com`;
    const regResA = await request(app)
      .post('/api/auth/register')
      .send({
        username: usernameA,
        email: emailA,
        password: 'password123',
      });
    console.log('User A registration:', regResA.body);
    expect([200, 201]).toContain(regResA.statusCode);
    const userAId = regResA.body.userId;
    // Simulate email verification for User A
    await prisma.user.update({
      where: { id: userAId },
      data: { isEmailVerified: true, emailVerificationToken: null },
    });

    const userRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: emailA,
        password: 'password123',
      });
    console.log('User A login:', userRes.body);
    expect(userRes.statusCode).toBe(200);
    userToken = userRes.body.token;

    // Register User B (friend)
    friendUsername = `f${unique}`;
    const emailB = `f${unique}@ex.com`;
    const regResB = await request(app)
      .post('/api/auth/register')
      .send({
        username: friendUsername,
        email: emailB,
        password: 'password123',
      });
    console.log('User B registration:', regResB.body);
    expect([200, 201]).toContain(regResB.statusCode);
    const userBId = regResB.body.userId;
    // Simulate email verification for User B
    await prisma.user.update({
      where: { id: userBId },
      data: { isEmailVerified: true, emailVerificationToken: null },
    });

    const friendLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: emailB,
        password: 'password123',
      });
    console.log('User B login:', friendLoginRes.body);
    expect(friendLoginRes.statusCode).toBe(200);
    friendToken = friendLoginRes.body.token;
    expect(friendLoginRes.body.user).toBeDefined();
    friendId = friendLoginRes.body.user.id;

    // User A sends friend request to User B
    const reqRes = await request(app)
      .post('/api/friends/request')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ username: friendUsername });
    console.log('Friend request:', reqRes.body);
    expect([200, 201]).toContain(reqRes.statusCode);

    // User B gets pending friend requests
    const pendingReqRes = await request(app)
      .get('/api/friends/requests')
      .set('Authorization', `Bearer ${friendToken}`);
    console.log('Pending friend requests:', pendingReqRes.body);
    expect(pendingReqRes.statusCode).toBe(200);
    const requestId = pendingReqRes.body[0]?.id;
    expect(requestId).toBeDefined();

    // User B accepts the friend request
    const acceptRes = await request(app)
      .patch(`/api/friends/request/${requestId}`)
      .set('Authorization', `Bearer ${friendToken}`)
      .send({ action: 'accept' });
    console.log('Accept friend request:', acceptRes.body);
    expect(acceptRes.statusCode).toBe(200);
  });

  it('should send a message to a friend', async () => {
    const res = await request(app)
      .post('/api/messages/send')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ receiverId: friendId, content: 'Hello, friend!' });
    console.log('Send message:', res.body);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.content).toBe('Hello, friend!');
  });

  it('should get chat history with a friend', async () => {
    const res = await request(app)
      .get(`/api/messages/conversation/${friendId}`)
      .set('Authorization', `Bearer ${userToken}`);
    console.log('Get chat history:', res.body);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('messages');
    expect(Array.isArray(res.body.messages)).toBe(true);
  });
});
