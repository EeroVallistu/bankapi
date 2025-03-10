const request = require('supertest');
const app = require('../src/index');
const User = require('../models/User');
const { sequelize } = require('../src/models/db');

// Mock user for testing
const testUser = {
  username: 'testuser',
  password: 'password123',
  fullName: 'Test User',
  email: 'test@example.com'
};

let authToken;

beforeAll(async () => {
  // Sync database for testing - use force true to drop tables first
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  // Close database connection
  await sequelize.close();
});

describe('Authentication Routes', () => {
  
  describe('POST /users', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/users')
        .send(testUser);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toEqual('success');
    });

    it('should reject duplicate username', async () => {
      const res = await request(app)
        .post('/users')
        .send(testUser);
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual('error');
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/users')
        .send({
          username: 'incomplete'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('POST /sessions', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/sessions')
        .send({
          username: testUser.username,
          password: testUser.password
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      
      // Save token for other tests
      authToken = res.body.token;
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/sessions')
        .send({
          username: testUser.username,
          password: 'wrongpassword'
        });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toEqual('error');
    });
  });

  describe('GET /users/me', () => {
    it('should get user profile with valid token', async () => {
      const res = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.username).toEqual(testUser.username);
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/users/me');
      
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('DELETE /sessions/:token', () => {
    it('should logout successfully', async () => {
      const res = await request(app)
        .delete(`/sessions/${authToken}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toEqual(200);
    });

    it('should reject requests with the expired token', async () => {
      const res = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('DELETE /api/v1/users/logout', () => {
    it('should logout successfully with DELETE', async () => {
      // First login to get a token
      const loginRes = await request(app)
        .post('/api/v1/sessions')
        .send({
          username: testUser.username,
          password: testUser.password
        });
      
      const token = loginRes.body.token;
      
      // Then logout using DELETE
      const res = await request(app)
        .delete(`/api/v1/sessions/${token}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
    });

    it('should reject requests with expired tokens', async () => {
      // Try to access protected route with previously invalidated token
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toEqual(401);
    });
  });

  // Keep the POST logout test for backward compatibility
  describe('POST /api/v1/users/logout', () => {
    it('should logout successfully with POST (deprecated)', async () => {
      // First login to get a token
      const loginRes = await request(app)
        .post('/api/v1/sessions')
        .send({
          username: testUser.username,
          password: testUser.password
        });
      
      const token = loginRes.body.token;
      
      // Then logout using POST
      const res = await request(app)
        .post('/api/v1/users/logout')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
    });
  });
});
