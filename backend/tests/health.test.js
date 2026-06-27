/**
 * Integration tests for the /api/health endpoint.
 */
const request = require('supertest');

// Setup mocks before importing app
require('./setup');
const app = require('../src/app');

describe('GET /api/health', () => {
  it('should return status ok with a timestamp', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
    // Verify timestamp is a valid ISO string
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});

describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent-route');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error', 'Route not found');
  });
});
