-- Create admin_invites table
CREATE TABLE IF NOT EXISTS admin_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT, -- Optional: restrict to specific email
    role TEXT NOT NULL DEFAULT 'readonly',
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_by UUID REFERENCES auth.users(id),
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_admin_invites_token ON admin_invites(token);

-- RLS: Only admins can view/create invites
ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view invites" ON admin_invites
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'ops') -- Only super_admin/ops can invite
        )
    );

CREATE POLICY "Admins can create invites" ON admin_invites
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'ops')
        )
    );
