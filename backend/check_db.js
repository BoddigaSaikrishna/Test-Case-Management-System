require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_schema_info');
  // wait, RPC 'get_schema_info' might not exist.
  // Instead, let's just do a wrong insert and log the error!
  
  const { data: user } = await supabase.from('users').select('id').limit(1);
  const { data: project } = await supabase.from('projects').select('id').limit(1);
  
  console.log('Project:', project);
  
  if (project && project.length > 0) {
    const { data: ins, error: insErr } = await supabase
      .from('test_cases')
      .insert([
        {
          test_case_id: 'TC-0001',
          project_id: project[0].id,
          title: 'Test',
          priority: 'medium',
          type: 'functional',
          status: 'draft',
        }
      ]);
      
    console.log('Insert Error:', insErr);
  } else {
    // If no project exists, insert one
    const { data: newProj, error: pErr } = await supabase.from('projects').insert([{ name: 'Test Proj', description: 'desc' }]).select();
    console.log('Proj insert error:', pErr);
    
    if (newProj) {
        const { data: ins, error: insErr } = await supabase
          .from('test_cases')
          .insert([
            {
              test_case_id: 'TC-0001',
              project_id: newProj[0].id,
              title: 'Test',
              priority: 'medium',
              type: 'functional',
              status: 'draft',
            }
          ]);
        console.log('Insert Error:', insErr);
    }
  }
}

check();
