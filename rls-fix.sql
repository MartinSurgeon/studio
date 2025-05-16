-- OPTION 1: Temporarily disable RLS on users table for testing
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Note: In production, you should re-enable this once your app is working
-- and implement proper RLS policies instead.

-- OPTION 2: Alternative - create a policy allowing unrestricted insertion
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'Allow insert during signup'
    ) THEN
        CREATE POLICY "Allow insert during signup"
        ON users FOR INSERT
        WITH CHECK (true);  -- Allow all inserts
    END IF;
END
$$;

-- OPTION 3: Create a more permissive RLS policy for signup
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'Allow authenticated users to insert'
    ) THEN
        CREATE POLICY "Allow authenticated users to insert"
        ON users FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
    END IF;
END
$$;

-- Make sure we add the missing columns if they're not present
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS index_number TEXT,
ADD COLUMN IF NOT EXISTS institution_code TEXT;

-- Create a policy to allow any authenticated user to insert a row into the users table
-- This is needed for sign-up functionality
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'Allow users to insert their own profile'
    ) THEN
        CREATE POLICY "Allow users to insert their own profile"
        ON users FOR INSERT
        WITH CHECK (auth.uid() = id);
    END IF;
END
$$;

-- Create an "All access for service role" policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'All access for service role'
    ) THEN
        CREATE POLICY "All access for service role"
        ON users
        USING (auth.jwt() ->> 'role' = 'service_role')
        WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
    END IF;
END
$$;

-- Create policy to enable handling new users through the service role
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'Enable service role to handle user data'
    ) THEN
        CREATE POLICY "Enable service role to handle user data"
        ON users FOR ALL
        USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
END
$$; 