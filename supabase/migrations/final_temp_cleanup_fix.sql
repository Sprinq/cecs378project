-- Migration file: supabase/migrations/20250504_fix_temp_cleanup_no_recursion.sql

-- First, drop the problematic trigger
DROP TRIGGER IF EXISTS auto_cleanup_expired_members ON public.server_members;
DROP FUNCTION IF EXISTS trigger_cleanup_on_access();

-- Drop existing cleanup functions
DROP FUNCTION IF EXISTS remove_expired_temporary_members();
DROP FUNCTION IF EXISTS cleanup_expired_members();
DROP FUNCTION IF EXISTS test_expire_member(UUID, UUID);
DROP FUNCTION IF EXISTS expire_and_cleanup_user(UUID);

-- Create a simpler cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_members()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  removed_count INTEGER;
BEGIN
  -- Delete expired temporary members
  DELETE FROM public.server_members
  WHERE temporary_access = true
    AND access_expires_at IS NOT NULL
    AND access_expires_at <= CURRENT_TIMESTAMP;
  
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  
  RETURN COALESCE(removed_count, 0);
END;
$$;

-- Create a function to test expiration without the complex logic
CREATE OR REPLACE FUNCTION test_expire_member(
  p_server_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the member to be expired
  UPDATE public.server_members
  SET access_expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute'
  WHERE server_id = p_server_id
    AND user_id = p_user_id
    AND temporary_access = true;
  
  -- Return success
  RETURN FOUND;
END;
$$;

-- Create a trigger that only sets access_expires_at on INSERT or UPDATE
CREATE OR REPLACE FUNCTION set_access_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only proceed if this is a temporary access member
  IF NEW.temporary_access AND NEW.temporary_duration IS NOT NULL THEN
    -- If access_expires_at is not already set, calculate it
    IF NEW.access_expires_at IS NULL THEN
      -- Set joined_at if not already set
      IF NEW.joined_at IS NULL THEN
        NEW.joined_at := CURRENT_TIMESTAMP;
      END IF;
      
      -- Set the access_expires_at based on joined_at plus the duration
      NEW.access_expires_at := NEW.joined_at + (
        CASE 
          WHEN NEW.temporary_duration = '1h' THEN INTERVAL '1 hour'
          WHEN NEW.temporary_duration = '24h' THEN INTERVAL '24 hours'
          WHEN NEW.temporary_duration = '7d' THEN INTERVAL '7 days'
          WHEN NEW.temporary_duration = '30d' THEN INTERVAL '30 days'
          ELSE NEW.temporary_duration::INTERVAL
        END
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger only for INSERT and UPDATE
DROP TRIGGER IF EXISTS server_members_expiry_trigger ON public.server_members;
CREATE TRIGGER server_members_expiry_trigger
BEFORE INSERT OR UPDATE ON public.server_members
FOR EACH ROW
EXECUTE FUNCTION set_access_expiry();

-- Ensure all temporary members have access_expires_at set
UPDATE public.server_members
SET 
  joined_at = COALESCE(joined_at, CURRENT_TIMESTAMP),
  access_expires_at = COALESCE(
    access_expires_at,
    CASE 
      WHEN temporary_duration = '1h' THEN COALESCE(joined_at, CURRENT_TIMESTAMP) + INTERVAL '1 hour'
      WHEN temporary_duration = '24h' THEN COALESCE(joined_at, CURRENT_TIMESTAMP) + INTERVAL '24 hours'
      WHEN temporary_duration = '7d' THEN COALESCE(joined_at, CURRENT_TIMESTAMP) + INTERVAL '7 days'
      WHEN temporary_duration = '30d' THEN COALESCE(joined_at, CURRENT_TIMESTAMP) + INTERVAL '30 days'
      WHEN temporary_duration IS NOT NULL THEN COALESCE(joined_at, CURRENT_TIMESTAMP) + temporary_duration::INTERVAL
      ELSE NULL
    END
  )
WHERE temporary_access = true
  AND temporary_duration IS NOT NULL
  AND access_expires_at IS NULL;

-- Create a scheduled job if pg_cron is available
DO $$
BEGIN
  -- Check if pg_cron extension is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Unschedule existing job if it exists
    PERFORM cron.unschedule('remove-expired-members');
    
    -- Create new scheduled job to run every 5 minutes
    PERFORM cron.schedule(
      'remove-expired-members',
      '*/5 * * * *',  -- Every 5 minutes
      'SELECT cleanup_expired_members()'
    );
    
    RAISE NOTICE 'Scheduled cron job to run every 5 minutes';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Please set up an external scheduler to call cleanup_expired_members() regularly.';
  END IF;
END
$$;