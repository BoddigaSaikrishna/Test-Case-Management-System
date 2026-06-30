require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Checking audit_logs table...");
  const { data: insertData, error: insertError } = await supabase.from('audit_logs').insert([
    {
      action: 'TEST',
      entity_type: 'TEST_ENTITY',
      entity_id: '00000000-0000-0000-0000-000000000000',
    }
  ]).select();

  if (insertError) {
    console.error("Insert Error:", insertError);
  } else {
    console.log("Insert Success:", insertData);
  }

  const { data, error } = await supabase.from('audit_logs').select('*').limit(5);
  if (error) {
    console.error("Database Error:", error.message);
  } else {
    console.log("Successfully queried audit_logs.");
    console.log(`Found ${data.length} rows.`);
    console.log("Data:", data);
  }
}

check();
