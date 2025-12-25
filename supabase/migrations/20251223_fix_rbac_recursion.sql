-- FIX: Resolve Infinite Recursion in Admin RBAC Policies
-- The previous policy tried to query admin_users while checking access to admin_users, causing a 500 error.

-- 1. Drop existing policies to clean slate
DROP POLICY IF EXISTS "Super Admins can manage all admins" ON admin_users;
DROP POLICY IF EXISTS "Admins can view all" ON admin_users;
DROP POLICY IF EXISTS "Admins can read own record" ON admin_users;
DROP POLICY IF EXISTS "Super Admins can do everything" ON admin_users;

-- 2. Create a SECURITY DEFINER function
-- This function runs with elevated privileges (bypassing RLS) to safely fetch the role.
CREATE OR REPLACE FUNCTION get_admin_role_by_email(lookup_email text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public -- Secure the search path
AS $$
  SELECT role FROM admin_users WHERE email = lookup_email LIMIT 1;
$$;

-- 3. Re-create Policies

-- Policy A: Self-Access
-- Every admin must be able to read their OWN row to know their role on login.
CREATE POLICY "Admins can read own record" ON admin_users
    FOR SELECT
    USING (email = auth.jwt() ->> 'email');

-- Policy B: Super Admin Access
-- Super Admins can do anything (SELECT, INSERT, UPDATE, DELETE)
-- We use the helper function to check the role of the CURRENT user (auth.jwt email)
CREATE POLICY "Super Admins can do everything" ON admin_users
    FOR ALL
    USING (get_admin_role_by_email(auth.jwt() ->> 'email') = 'super_admin');

-- 4. Grant access to the function (if needed, usually public by default but good to be explicit for auth users)
GRANT EXECUTE ON FUNCTION get_admin_role_by_email TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_role_by_email TO service_role;
