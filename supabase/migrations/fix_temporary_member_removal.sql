-- Migration file: supabase/migrations/20250501_fix_temporary_member_removal_v2.sql

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS remove_expired_temporary_members();

-- Drop the existing cleanup function if it exists
DROP FUNCTION IF EXISTS cleanup_expired_members();

-- Create a new, simplified function that directly removes expired members
CREATE OR REPLACE FUNCTION cleanup_expired_members()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  removed_count INTEGER;
BEGIN
  -- Delete all expired temporary members
  WITH deleted_members AS (
    DELETE FROM public.server_members
    WHERE temporary_access = true
      AND access_expires_at IS NOT NULL
      AND access_expires_at < CURRENT_TIMESTAMP
    RETURNING *
  )
  SELECT COUNT(*) INTO removed_count FROM deleted_members;
  
  -- Log the removal count for debugging
  IF removed_count > 0 THEN
    RAISE NOTICE 'Removed % expired temporary members', removed_count;
  END IF;
  
  RETURN removed_count;
END;
$$;

-- Update the trigger to ensure access_expires_at is always set for temporary members
CREATE OR REPLACE FUNCTION update_access_expiry()
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

DROP TRIGGER IF EXISTS server_members_expiry_trigger ON public.server_members;
CREATE TRIGGER server_members_expiry_trigger
BEFORE INSERT OR UPDATE ON public.server_members
FOR EACH ROW
EXECUTE FUNCTION update_access_expiry();

-- Fix any existing temporary members without access_expires_at
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
      ELSE COALESCE(joined_at, CURRENT_TIMESTAMP) + temporary_duration::INTERVAL
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
    
    -- Create new scheduled job to run every minute for testing (change to longer interval in production)
    PERFORM cron.schedule(
      'remove-expired-members',
      '* * * * *',  -- Every minute
      'SELECT cleanup_expired_members()'
    );
    
    RAISE NOTICE 'Scheduled cron job to run every minute';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Please set up an external scheduler to call cleanup_expired_members() regularly.';
  END IF;
END
$$;