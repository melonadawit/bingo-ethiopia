import { Env } from '../types';
import { getSupabase } from '../utils';

export async function logAdminAction(
    env: Env,
    request: Request, // To get IP/User Agent (optional)
    action: string,
    targetResource: string,
    payload: any = {},
    adminId?: string // If we extracted it from JWT
) {
    try {
        const supabase = getSupabase(env);
        if (!supabase) return;

        // In a real app we'd extract IP, User-Agent etc.
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const userAgent = request.headers.get('User-Agent') || 'unknown';

        await supabase.from('admin_audit_logs').insert({
            admin_id: adminId || null, // Nullable if system action or unable to resolve
            action,
            target_resource: targetResource,
            payload,
            ip_address: ip,
            user_agent: userAgent
        });

    } catch (e) {
        console.error('Failed to log admin action:', e);
        // Don't fail the request just because logging failed, but maybe alert
    }
}
