/**
 * Test setup file - mocks Supabase client for all tests.
 * 
 * This prevents tests from hitting the live Supabase database.
 * Each test file can override specific mock return values as needed.
 */

// Set test environment variables so dotenv/supabase config doesn't fail
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.PORT = '0'; // Use random port in tests

// ---- Supabase Mock Builder ----
// Builds a chainable mock that simulates the Supabase query builder pattern:
//   supabase.from('table').select('*').eq('col', val).single()

function createQueryBuilderMock(resolvedValue = { data: [], error: null }) {
  const mock = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolvedValue),
    maybeSingle: jest.fn().mockResolvedValue(resolvedValue),
    then: function (resolve) {
      return resolve(resolvedValue);
    },
  };

  // Make every chainable method also act as a thenable (returns data when awaited directly)
  const chainableMethods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'in', 'is',
    'gte', 'lte', 'like', 'ilike',
    'order', 'limit', 'range',
  ];

  chainableMethods.forEach(method => {
    mock[method].mockImplementation(function () {
      return {
        ...mock,
        then: (resolve) => resolve(resolvedValue),
      };
    });
  });

  return mock;
}

// Create the mock supabase client
const mockSupabaseClient = {
  from: jest.fn(() => createQueryBuilderMock()),
  auth: {
    signUp: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    admin: {
      createUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  },
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
};

// Mock the supabase config module
jest.mock('../src/config/supabase', () => ({
  supabase: mockSupabaseClient,
  supabaseAdmin: mockSupabaseClient,
}));

// Export helpers for use in individual test files
module.exports = {
  mockSupabaseClient,
  createQueryBuilderMock,
};
