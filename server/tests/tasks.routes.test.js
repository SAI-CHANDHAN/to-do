process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const app = require('../server');

describe('Task routes', () => {
  it('returns 401 when no auth token is provided for GET /api/tasks', async () => {
    const res = await request(app).get('/api/tasks');

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        data: null,
        message: 'No token, authorization denied',
        errors: null
      })
    );
  });
});
