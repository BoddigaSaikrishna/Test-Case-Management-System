require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { id: '12822a36-7c9b-4309-8d8a-9a00a35db9d6', email: 'test@example.com' }, // random UUID for testing, might fail FK if users table has FK constraint
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('Token:', token);

// Now let's try calling the API
const url = 'http://localhost:3000/api/testcases';

async function test() {
  try {
    // get a valid user id from profiles
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: users } = await supabase.from('profiles').select('id, email').limit(1);
    const { data: projects } = await supabase.from('projects').select('id').limit(1);
    
    if (!users || users.length === 0) return console.log('No users found');
    if (!projects || projects.length === 0) return console.log('No projects found');
    
    const validToken = jwt.sign(
      { id: users[0].id, email: users[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`
      },
      body: JSON.stringify({
        project_id: projects[0].id,
        title: 'API Test Case',
        description: '',
        preconditions: '',
        module: '',
        priority: 'medium',
        type: 'functional',
        expected_result: '',
        feature_url: '',
        steps: [
          { action: 'Test Action', expected_result: 'Test Result', test_code: '' }
        ]
      })
    });
    
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

test();
