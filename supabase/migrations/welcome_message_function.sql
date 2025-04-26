-- Migration file: supabase/migrations/20250502_add_welcome_message_function_fixed.sql

-- Function to send a welcome message when a user joins a server
CREATE OR REPLACE FUNCTION send_welcome_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  welcome_channel_id UUID;
  welcome_message TEXT;
  new_user_name TEXT;
  new_user_display_name TEXT;
  system_user_id UUID;
BEGIN
  -- Find the welcome channel for this server
  SELECT id INTO welcome_channel_id
  FROM public.channels
  WHERE server_id = NEW.server_id
  AND name = 'welcome'
  LIMIT 1;
  
  -- If no welcome channel exists, create one
  IF welcome_channel_id IS NULL THEN
    INSERT INTO public.channels (server_id, name, description)
    VALUES (NEW.server_id, 'welcome', 'Welcome new members')
    RETURNING id INTO welcome_channel_id;
  END IF;
  
  -- Get the user's information
  SELECT username, display_name INTO new_user_name, new_user_display_name
  FROM public.users
  WHERE id = NEW.user_id;
  
  -- Construct the welcome message
  welcome_message := 'Welcome to the server, ' || COALESCE(new_user_display_name, new_user_name) || '! 👋';
  
  -- Use the server owner as the sender for the welcome message
  -- This avoids the need for a system user and prevents foreign key constraint issues
  SELECT owner_id INTO system_user_id
  FROM public.servers
  WHERE id = NEW.server_id;
  
  -- Insert the welcome message
  INSERT INTO public.messages (
    channel_id,
    sender_id,
    encrypted_content,
    iv,
    is_encrypted,
    encryption_version,
    created_at
  ) VALUES (
    welcome_channel_id,
    system_user_id,  -- Use server owner as sender
    welcome_message,
    'unencrypted',
    false,
    1,
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to send welcome message on server join
DROP TRIGGER IF EXISTS send_welcome_message_trigger ON public.server_members;
CREATE TRIGGER send_welcome_message_trigger
AFTER INSERT ON public.server_members
FOR EACH ROW
EXECUTE FUNCTION send_welcome_message();

-- Option 2: Simple welcome message function that creates a more obvious system message
CREATE OR REPLACE FUNCTION send_welcome_message_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  welcome_channel_id UUID;
  welcome_message TEXT;
  new_user_name TEXT;
  new_user_display_name TEXT;
BEGIN
  -- Find the welcome channel for this server
  SELECT id INTO welcome_channel_id
  FROM public.channels
  WHERE server_id = NEW.server_id
  AND name = 'welcome'
  LIMIT 1;
  
  -- If no welcome channel exists, create one
  IF welcome_channel_id IS NULL THEN
    INSERT INTO public.channels (server_id, name, description)
    VALUES (NEW.server_id, 'welcome', 'Welcome new members')
    RETURNING id INTO welcome_channel_id;
  END IF;
  
  -- Get the user's information
  SELECT username, display_name INTO new_user_name, new_user_display_name
  FROM public.users
  WHERE id = NEW.user_id;
  
  -- Construct the welcome message with system notation
  welcome_message := '🤖 [SYSTEM] ' || COALESCE(new_user_display_name, new_user_name) || ' has joined the server! Welcome aboard! 👋';
  
  -- Insert the welcome message using the joining user as sender
  -- This is a workaround to avoid foreign key constraint issues
  INSERT INTO public.messages (
    channel_id,
    sender_id,
    encrypted_content,
    iv,
    is_encrypted,
    encryption_version,
    created_at
  ) VALUES (
    welcome_channel_id,
    NEW.user_id,  -- Use the joining user as sender but mark as system message
    welcome_message,
    'unencrypted',
    false,
    1,
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger with v2 function
DROP TRIGGER IF EXISTS send_welcome_message_trigger ON public.server_members;
CREATE TRIGGER send_welcome_message_trigger
AFTER INSERT ON public.server_members
FOR EACH ROW
EXECUTE FUNCTION send_welcome_message_v2();