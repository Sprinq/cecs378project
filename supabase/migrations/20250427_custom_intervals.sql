-- Migration file: supabase/migrations/20250427_custom_intervals.sql

-- Update server_invites table to store the original duration string
ALTER TABLE public.server_invites ADD COLUMN IF NOT EXISTS raw_expiry_duration TEXT;
ALTER TABLE public.server_invites ADD COLUMN IF NOT EXISTS raw_temporary_duration TEXT;

-- Function to parse and validate custom duration inputs
CREATE OR REPLACE FUNCTION validate_duration_string(duration_text TEXT)
RETURNS INTERVAL
LANGUAGE plpgsql
AS $function$
DECLARE
  valid_duration INTERVAL;
  num_value INTEGER;
  unit_text TEXT;
  error_message TEXT;
BEGIN
  -- Basic validation for empty input
  IF duration_text IS NULL OR duration_text = '' THEN
    RAISE EXCEPTION 'Duration cannot be empty';
  END IF;
  
  -- Try to parse as interval directly
  BEGIN
    valid_duration := duration_text::INTERVAL;
    RETURN valid_duration;
  EXCEPTION WHEN OTHERS THEN
    -- Failed to parse as interval directly, continue with custom parsing
  END;
  
  -- Extract the numeric part and the unit part
  num_value := substring(duration_text from '^([0-9]+)');
  unit_text := trim(substring(duration_text from '([a-zA-Z]+)$'));
  
  -- Validate numeric part
  IF num_value IS NULL OR num_value <= 0 THEN
    RAISE EXCEPTION 'Invalid duration value: %', duration_text;
  END IF;
  
  -- Convert unit to PostgreSQL interval format
  CASE lower(unit_text)
    WHEN 'minute' THEN unit_text := 'minutes';
    WHEN 'hour' THEN unit_text := 'hours';
    WHEN 'day' THEN unit_text := 'days';
    WHEN 'week' THEN unit_text := 'weeks';
    WHEN 'month' THEN unit_text := 'months';
    WHEN 'year' THEN unit_text := 'years';
    ELSE
      -- Already plural or unknown, keep as is
  END CASE;
  
  -- Try to validate the result
  BEGIN
    error_message := format('%s %s', num_value, unit_text);
    valid_duration := error_message::INTERVAL;
    RETURN valid_duration;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid duration unit: %', unit_text;
  END;
END;
$function$;

-- Update the function to generate a server invite with custom options and interval handling
CREATE OR REPLACE FUNCTION generate_server_invite_with_options(
  server_id UUID,
  expires_in TEXT DEFAULT '7 days',
  hide_history BOOLEAN DEFAULT false,
  temporary_access BOOLEAN DEFAULT false,
  temporary_duration TEXT DEFAULT '24 hours',
  max_uses INTEGER DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_invite_code TEXT;
  expires_at TIMESTAMPTZ;
  expiry_interval INTERVAL;
  temp_interval INTERVAL;
BEGIN
  -- Check if the current user is the owner or admin of the server
  IF NOT EXISTS (
    SELECT 1 FROM public.server_members sm
    WHERE sm.server_id = $1
    AND sm.user_id = auth.uid()
    AND sm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only server owners and admins can generate invite codes';
  END IF;
  
  -- Generate a unique invite code
  new_invite_code := generate_random_code(8);
  
  -- Validate and convert expiration interval
  BEGIN
    expiry_interval := validate_duration_string(expires_in);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid expiration duration: %', expires_in;
  END;
  
  -- Calculate expiration date
  expires_at := CURRENT_TIMESTAMP + expiry_interval;
  
  -- Validate temporary duration if needed
  IF temporary_access AND temporary_duration IS NOT NULL THEN
    BEGIN
      temp_interval := validate_duration_string(temporary_duration);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid temporary duration: %', temporary_duration;
    END;
  END IF;
  
  -- Insert the new invite
  INSERT INTO public.server_invites (
    server_id,
    code,
    creator_id,
    expires_at,
    max_uses,
    hide_history,
    temporary_access,
    temporary_duration,
    raw_expiry_duration,
    raw_temporary_duration
  ) VALUES (
    $1,
    new_invite_code,
    auth.uid(),
    expires_at,
    max_uses,
    hide_history,
    temporary_access,
    temporary_duration,
    expires_in,
    temporary_duration
  );
  
  -- Also set the invite code in the servers table for backward compatibility
  UPDATE public.servers
  SET 
    invite_code = new_invite_code,
    invite_expires_at = expires_at
  WHERE id = $1;
  
  RETURN new_invite_code;
END;
$function$;

-- Update the join function to handle custom durations
CREATE OR REPLACE FUNCTION join_server_by_invite_code(
  invite_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  invite_record RECORD;
  server_id UUID;
  already_member BOOLEAN;
  access_expires_at TIMESTAMPTZ;
  temp_interval INTERVAL;
BEGIN
  -- Find the invite by code
  SELECT 
    i.*, 
    s.id as server_id 
  INTO invite_record
  FROM public.server_invites i
  JOIN public.servers s ON i.server_id = s.id
  WHERE i.code = $1;
  
  -- If not found in server_invites, check the legacy invite system
  IF invite_record IS NULL THEN
    SELECT id, invite_expires_at INTO server_id, access_expires_at
    FROM public.servers
    WHERE invite_code = $1;
    
    IF server_id IS NULL THEN
      RAISE EXCEPTION 'Invalid invite code';
    END IF;
    
    -- Check if the invite has expired
    IF access_expires_at IS NOT NULL AND access_expires_at < CURRENT_TIMESTAMP THEN
      RAISE EXCEPTION 'Invite code has expired';
    END IF;
  ELSE
    -- Use data from the invite record
    server_id := invite_record.server_id;
    
    -- Check if the invite has expired
    IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < CURRENT_TIMESTAMP THEN
      RAISE EXCEPTION 'Invite code has expired';
    END IF;
    
    -- Check if the invite has reached max uses
    IF invite_record.max_uses IS NOT NULL AND invite_record.uses >= invite_record.max_uses THEN
      RAISE EXCEPTION 'Invite code has reached maximum uses';
    END IF;
    
    -- Calculate when temporary access expires, if applicable
    IF invite_record.temporary_access AND invite_record.temporary_duration IS NOT NULL THEN
      BEGIN
        temp_interval := validate_duration_string(invite_record.temporary_duration);
        access_expires_at := CURRENT_TIMESTAMP + temp_interval;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid temporary duration in invite: %', invite_record.temporary_duration;
      END;
    END IF;
  END IF;
  
  -- Check if the user is already a member
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = server_id
    AND user_id = auth.uid()
  ) INTO already_member;
  
  IF already_member THEN
    -- If already a member, just return the server ID
    RETURN server_id;
  END IF;
  
  -- Add the user to the server with invite restrictions if applicable
  INSERT INTO public.server_members (
    server_id,
    user_id,
    role,
    hide_history,
    temporary_access,
    temporary_duration,
    access_expires_at
  ) VALUES (
    server_id,
    auth.uid(),
    'member',
    COALESCE(invite_record.hide_history, false),
    COALESCE(invite_record.temporary_access, false),
    invite_record.temporary_duration,
    access_expires_at
  );
  
  -- Increment the number of uses for the invite
  IF invite_record.id IS NOT NULL THEN
    UPDATE public.server_invites
    SET uses = uses + 1
    WHERE id = invite_record.id;
  END IF;
  
  RETURN server_id;
END;
$function$;

-- Function to increment invite uses when using the manual join fallback
CREATE OR REPLACE FUNCTION increment_invite_uses(
  invite_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.server_invites
  SET uses = uses + 1
  WHERE code = $1;
  
  RETURN FOUND;
END;
$function$;