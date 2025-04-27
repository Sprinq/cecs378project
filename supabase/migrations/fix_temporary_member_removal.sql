-- Migration file: supabase/migrations/20250501_fix_temporary_member_removal.sql

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS remove_expired_temporary_members();

-- Recreated simplified version that handles all cases properly
CREATE OR REPLACE FUNCTION remove_expired_temporary_members()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  removed_count INTEGER := 0;
BEGIN
  -- Handle members with explicit expiration times
  WITH deleted_members AS (
    DELETE FROM public.server_members
    WHERE temporary_access = true
      AND access_expires_at IS NOT NULL
      AND access_expires_at < CURRENT_TIMESTAMP
    RETURNING *
  )
  SELECT COUNT(*) INTO removed_count FROM deleted_members;
  
  -- Handle members with duration-based expiration (without explicit access_expires_at)
  -- First, ensure all temporary members have access_expires_at set
  UPDATE public.server_members
  SET access_expires_at = (
    CASE 
      WHEN temporary_duration = '1h' THEN joined_at + INTERVAL '1 hour'
      WHEN temporary_duration = '24h' THEN joined_at + INTERVAL '24 hours'
      WHEN temporary_duration = '7d' THEN joined_at + INTERVAL '7 days'
      WHEN temporary_duration = '30d' THEN joined_at + INTERVAL '30 days'
      ELSE joined_at + temporary_duration::INTERVAL
    END
  )
  WHERE temporary_access = true
    AND access_expires_at IS NULL
    AND temporary_duration IS NOT NULL
    AND joined_at IS NOT NULL;
  
  -- Now delete those whose time has expired
  WITH duration_based_deletes AS (
    DELETE FROM public.server_members
    WHERE temporary_access = true
      AND access_expires_at IS NOT NULL
      AND access_expires_at < CURRENT_TIMESTAMP
    RETURNING *
  )
  SELECT removed_count + COUNT(*) INTO removed_count FROM duration_based_deletes;
  
  RETURN removed_count;
END;
$$;

-- Ensure the trigger is set up correctly
DROP TRIGGER IF EXISTS server_members_expiry_trigger ON public.server_members;

CREATE OR REPLACE FUNCTION update_access_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only proceed if this is a temporary access member
  IF NEW.temporary_access AND NEW.temporary_duration IS NOT NULL THEN
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
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER server_members_expiry_trigger
BEFORE INSERT OR UPDATE ON public.server_members
FOR EACH ROW
EXECUTE FUNCTION update_access_expiry();

-- Fix any existing temporary members without access_expires_at
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  UPDATE public.server_members
  SET access_expires_at = (
    CASE 
      WHEN temporary_duration = '1h' THEN joined_at + INTERVAL '1 hour'
      WHEN temporary_duration = '24h' THEN joined_at + INTERVAL '24 hours'
      WHEN temporary_duration = '7d' THEN joined_at + INTERVAL '7 days'
      WHEN temporary_duration = '30d' THEN joined_at + INTERVAL '30 days'
      ELSE joined_at + temporary_duration::INTERVAL
    END
  )
  WHERE temporary_access = true
    AND access_expires_at IS NULL
    AND temporary_duration IS NOT NULL
    AND joined_at IS NOT NULL;
    
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE 'Updated % temporary members with expiration timestamps', fixed_count;
END
$$;

-- Create a function that can be called manually or via cron
CREATE OR REPLACE FUNCTION cleanup_expired_members()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  removed_count INTEGER;
BEGIN
  SELECT remove_expired_temporary_members() INTO removed_count;
  RETURN removed_count;
END;
$$;

-- Try to set up cron job if pg_cron is available
DO $$
BEGIN
  -- Check if pg_cron extension is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Drop existing job if it exists
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