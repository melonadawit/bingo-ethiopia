const { createClient } = require('@supabase/supabase-js');

// Config - Hardcoded for reliability since we just verified them
const SUPABASE_URL = 'https://hthvotvtkqggbdpfrryb.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function createAdmin() {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.error('Usage: node create_dashboard_user.js <email> <password>');
        process.exit(1);
    }

    console.log(`Creating Admin User: ${email}...`);

    // 1. Create in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
    });

    if (authError) {
        console.error('Auth Error:', authError.message);
        // Continue if user already exists
    }

    const userId = authData.user?.id;
    if (!userId) {
        // Try to get existing user ID if create failed
        // For simplicity, let's assume if it failed, we can't get ID easily without signin
        // But verifyAdmin uses email lookup in admin_users, so ID strictly doesn't matter for the table check 
        // unless logic changes. checking auth.ts... it uses email.
        console.log('User might already exist in Auth, proceeding to DB check...');
    }

    // 2. Insert into admin_users table
    const { error: dbError } = await supabase
        .from('admin_users')
        .upsert({
            email: email,
            role: 'super_admin',
            full_name: 'Admin User',
            password_hash: 'managed_by_supabase_auth'
        }, { onConflict: 'email' });

    if (dbError) {
        console.error('Database Error:', dbError.message);
        console.log('HINT: Does the admin_users table exist?');
    } else {
        console.log('✅ Success! Admin user created/updated.');
        console.log(`Login at: ${SUPABASE_URL}/login (or your dashboard URL)`);
    }
}

createAdmin();
