require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupFirstAdmin() {
  const email = 'admin@example.com';
  const password = 'adminpassword123';
  const name = 'System Admin';

  console.log(`Setting up the first admin account...`);
  
  // Create user using admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: { name: name }
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
       console.log(`\nAn account already exists with email: ${email}`);
       
       // Force update the profile to admin role just in case
       const { data: user } = await supabase.from('profiles').select('id').eq('email', email).single();
       if (user) {
         await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id);
         console.log('Role verified as admin.');
       }
    } else {
       console.error('Error creating admin user:', authError.message);
    }
    return;
  }

  // Update profile role to admin
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'admin', name: name })
      .eq('id', authData.user.id);
      
    if (profileError) {
      console.error('Error setting admin role:', profileError.message);
    } else {
      console.log('\n✅ First Admin created successfully!');
      console.log('-----------------------------------');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      console.log('-----------------------------------');
      console.log('You can use these credentials to log in now.');
    }
  }
}

setupFirstAdmin();
