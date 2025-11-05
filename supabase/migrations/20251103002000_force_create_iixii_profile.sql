-- Force create profile for iixiiartist user with explicit values
-- Using a direct INSERT with hard-coded email from auth.users

DO $$
DECLARE
    user_email TEXT;
BEGIN
    -- Get the email from auth.users
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = 'd6591678-7d3d-46c3-8854-99410fa8786e';
    
    -- Insert profile if it doesn't exist
    IF user_email IS NOT NULL THEN
        INSERT INTO profiles (id, email, full_name, created_at, updated_at)
        VALUES (
            'd6591678-7d3d-46c3-8854-99410fa8786e',
            user_email,
            user_email, -- Use email as full_name for now
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            email = EXCLUDED.email,
            full_name = COALESCE(profiles.full_name, EXCLUDED.email),
            updated_at = NOW();
        
        RAISE NOTICE 'Profile created/updated for user: %', user_email;
    ELSE
        RAISE NOTICE 'User not found in auth.users table';
    END IF;
END $$;

