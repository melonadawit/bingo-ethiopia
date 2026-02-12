import { handleAdminRequest } from './admin/routes';
import type { Env } from './types';
import { corsHeaders } from './utils';

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: corsHeaders(),
            });
        }

        // Forward all requests to Admin routes
        return handleAdminRequest(request, env);
    }
};
