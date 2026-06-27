/**
 * Integration tests for the /api/auth endpoints.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

const { mockSupabaseClient } = require('./setup');
const app = require('../src/app');

const JWT_SECRET = process.env.JWT_SECRET;

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ password: 'password123' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Email and password are required');
  });

  it('should return 400 if password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Email and password are required');
  });

  it('should return 400 if password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', password: '123' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Password must be at least 6 characters');
  });

  it('should create a user successfully via admin API', async () => {
    const mockUser = {
      id: 'user-uuid-123',
      email: 'newuser@example.com',
    };

    mockSupabaseClient.auth.admin.createUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    // Mock profile update (from('profiles').update(...).eq(...))
    mockSupabaseClient.from.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'newuser@example.com', password: 'password123', name: 'New User' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message', 'User created successfully');
    expect(res.body.user).toHaveProperty('email', 'newuser@example.com');
    expect(res.body.user).toHaveProperty('name', 'New User');
  });

  it('should return 400 if Supabase returns an auth error', async () => {
    mockSupabaseClient.auth.admin.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'User already registered' },
    });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'existing@example.com', password: 'password123' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'User already registered');
  });
});

describe('POST /api/auth/signin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if email or password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'test@example.com' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Email and password are required');
  });

  it('should return 401 for invalid credentials', async () => {
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'wrong@example.com', password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid credentials');
  });

  it('should sign in successfully and return a JWT token', async () => {
    const mockUser = {
      id: 'user-uuid-123',
      email: 'user@example.com',
    };
    const mockSession = { access_token: 'supabase-access-token' };

    mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    // Mock profile fetch: from('profiles').select('*').eq('id', ...).single()
    mockSupabaseClient.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'user-uuid-123', name: 'Test User', role: 'user', email: 'user@example.com' },
            error: null,
          }),
        }),
      }),
    });

    // Mock last_login update: from('profiles').update(...).eq(...)
    mockSupabaseClient.from.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Signed in successfully');
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('supabaseToken', 'supabase-access-token');
    expect(res.body.user).toHaveProperty('email', 'user@example.com');

    // Verify the returned JWT is valid
    const decoded = jwt.verify(res.body.token, JWT_SECRET);
    expect(decoded).toHaveProperty('id', 'user-uuid-123');
    expect(decoded).toHaveProperty('email', 'user@example.com');
  });
});

describe('GET /api/auth/me', () => {
  it('should return 401 if no token is provided', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error', 'No token provided');
  });

  it('should return 401 for an invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-here');

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid or expired token');
  });

  it('should return the current user profile with a valid token', async () => {
    const token = jwt.sign(
      { id: 'user-uuid-123', email: 'user@example.com', name: 'Test User', role: 'user' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Mock profile fetch
    mockSupabaseClient.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'user-uuid-123',
              email: 'user@example.com',
              name: 'Test User',
              role: 'user',
              avatar_url: null,
              created_at: '2026-01-01T00:00:00Z',
            },
            error: null,
          }),
        }),
      }),
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toHaveProperty('email', 'user@example.com');
    expect(res.body.user).toHaveProperty('name', 'Test User');
  });
});

describe('POST /api/auth/logout', () => {
  it('should return success message on logout', async () => {
    mockSupabaseClient.auth.signOut.mockResolvedValueOnce({ error: null });

    const res = await request(app).post('/api/auth/logout');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Logged out successfully');
  });
});
