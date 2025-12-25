import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Admin-only client (uses Service Role, only available server-side)
export const getAdminSupabase = () => {
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!adminKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
    return createClient(supabaseUrl, adminKey);
};
