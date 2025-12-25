import { getSupabase } from '../utils';
import { Env } from '../types';

export async function verifyAdmin(request: Request, env: Env): Promise<boolean> {
    const token = request.headers.get('x-admin-token');
    if (!token) return false;

    // TODO: Verify JWT signature using a shared secret or verify via Supabase Auth
    // For now, we assume the token is the user's session token and we check if they have a role

    // In a real prod environment, you'd decode the JWT and check the role claim.
    // For V1, we can query the DB to check the user role if we have the user ID.
    // Simplifying: The dashboard sends a specific API Key or derived token?

    // Better: We use Supabase Auth getUser()
    const supabase = getSupabase(env);
    if (!supabase) return false;

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return false;

    // Check if user is in admin_users table
    const { data: admin } = await supabase
        .from('admin_users')
        .select('*') // Select all to get id and role
        .eq('email', user.email)
        .single();

    if (admin) {
        (request as any).adminUser = admin;
        return true;
    }

    return false;
}
