-- Admin User Management & RBAC

-- 1. Ensure Role Column Exists (Already done in previous migration, but safe to verify)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='admin_users' AND column_name='role') THEN
        ALTER TABLE admin_users ADD COLUMN role TEXT DEFAULT 'ops' CHECK (role IN ('super_admin', 'ops', 'finance', 'marketing', 'readonly'));
    END IF;
END $$;

-- 2. Add Last Login IP (Security)
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login_ip TEXT;

-- 3. Policy for Super Admin to manage other admins
CREATE POLICY "Super Admins can manage all admins" ON admin_users
    FOR ALL
    USING (auth.jwt() ->> 'email' = 'admin@bingo.eth' OR (SELECT role FROM admin_users WHERE id = auth.uid()) = 'super_admin');

-- 4. View for active admin list (excludes sensitive hashes)
CREATE OR REPLACE VIEW admin_users_view AS
SELECT 
    id,
    email,
    role,
    full_name,
    is_active,
    last_login,
    created_at
FROM admin_users;

GRANT SELECT ON admin_users_view TO authenticated;
GRANT SELECT ON admin_users_view TO service_role;
