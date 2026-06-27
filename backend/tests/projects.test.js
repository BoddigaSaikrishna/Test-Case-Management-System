/**
 * Integration tests for the /api/projects endpoints.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

const { mockSupabaseClient } = require('./setup');
const app = require('../src/app');

const JWT_SECRET = process.env.JWT_SECRET;

// Helper to generate a valid auth token for protected routes
function generateToken(overrides = {}) {
  return jwt.sign(
    {
      id: 'user-uuid-123',
      email: 'tester@example.com',
      name: 'Tester',
      role: 'user',
      ...overrides,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('GET /api/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 without a token', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.statusCode).toBe(401);
  });

  it('should return a list of projects', async () => {
    const mockProjects = [
      {
        id: 'proj-1',
        name: 'Project Alpha',
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
        created_by_profile: { name: 'Admin', email: 'admin@example.com' },
        project_members: [{ count: 3 }],
        test_cases: [{ count: 12 }],
      },
      {
        id: 'proj-2',
        name: 'Project Beta',
        status: 'inactive',
        created_at: '2026-02-01T00:00:00Z',
        created_by_profile: { name: 'Manager', email: 'manager@example.com' },
        project_members: [{ count: 1 }],
        test_cases: [{ count: 5 }],
      },
    ];

    // Mock: supabase.from('projects').select(...).order(...)
    mockSupabaseClient.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: mockProjects, error: null }),
      }),
    });

    const token = generateToken();
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('projects');
    expect(res.body.projects).toHaveLength(2);
    expect(res.body.projects[0]).toHaveProperty('name', 'Project Alpha');
    expect(res.body.projects[0]).toHaveProperty('members', 3);
    expect(res.body.projects[0]).toHaveProperty('totalCases', 12);
  });

  it('should return 500 if Supabase returns an error', async () => {
    mockSupabaseClient.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    });

    const token = generateToken();
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('error', 'Failed to fetch projects');
  });
});

describe('POST /api/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if project name is missing', async () => {
    const token = generateToken();
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No name provided' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Project name is required');
  });

  it('should create a project successfully', async () => {
    const mockProject = {
      id: 'proj-new',
      name: 'New Project',
      description: 'A test project',
      status: 'active',
      created_by: 'user-uuid-123',
      created_at: '2026-06-01T00:00:00Z',
    };

    // Mock: supabase.from('projects').insert([...]).select().single()
    mockSupabaseClient.from.mockReturnValueOnce({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockProject, error: null }),
        }),
      }),
    });

    // Mock: supabase.from('project_members').insert([...])
    mockSupabaseClient.from.mockReturnValueOnce({
      insert: jest.fn().mockResolvedValue({ error: null }),
    });

    const token = generateToken();
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Project', description: 'A test project' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message', 'Project created successfully');
    expect(res.body.project).toHaveProperty('name', 'New Project');
  });
});

describe('PUT /api/projects/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update a project successfully', async () => {
    const mockUpdated = {
      id: 'proj-1',
      name: 'Updated Project',
      status: 'active',
    };

    // Mock: supabase.from('projects').update({...}).eq('id', ...).select().single()
    mockSupabaseClient.from.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockUpdated, error: null }),
          }),
        }),
      }),
    });

    const token = generateToken();
    const res = await request(app)
      .put('/api/projects/proj-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Project' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Project updated successfully');
    expect(res.body.project).toHaveProperty('name', 'Updated Project');
  });
});

describe('DELETE /api/projects/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete a project successfully', async () => {
    // Mock: supabase.from('projects').delete().eq('id', ...)
    mockSupabaseClient.from.mockReturnValueOnce({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const token = generateToken();
    const res = await request(app)
      .delete('/api/projects/proj-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Project deleted successfully');
  });

  it('should return 500 if delete fails', async () => {
    mockSupabaseClient.from.mockReturnValueOnce({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
      }),
    });

    const token = generateToken();
    const res = await request(app)
      .delete('/api/projects/proj-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('error', 'Failed to delete project');
  });
});
