-- Migration file: supabase/migrations/20250502_direct_cleanup_test.sql

-- Create a simple function to test direct cleanup
CREATE OR REPLACE FUNCTION test_expire_member(
  p_server_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Directly set access_expires_at to be in the past for testing
  UPDATE public.server_members
  SET access_expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute'
  WHERE server_id = p_server_id
    AND user_id = p_user_id
    AND temporary_access = true;
    
  -- Run the cleanup function
  PERFORM cleanup_expired_members();
  
  -- Check if the member was removed
  RETURN NOT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = p_server_id
      AND user_id = p_user_id
  );
END;
$$;

-- Create a function to manually expire and cleanup a specific user
CREATE OR REPLACE FUNCTION expire_and_cleanup_user(
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER := 0;
BEGIN
  -- Set all temporary memberships for this user to expired
  UPDATE public.server_members
  SET access_expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute'
  WHERE user_id = p_user_id
    AND temporary_access = true
    AND access_expires_at > CURRENT_TIMESTAMP;
    
  -- Get count of expired memberships
  SELECT COUNT(*) INTO expired_count
  FROM public.server_members
  WHERE user_id = p_user_id
    AND temporary_access = true
    AND access_expires_at < CURRENT_TIMESTAMP;
  
  -- Run the cleanup function
  PERFORM cleanup_expired_members();
  
  RETURN expired_count;
END;
$$;