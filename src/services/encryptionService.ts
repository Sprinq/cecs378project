import { supabase } from '../lib/supabase';

// Get the encryption key for a user
export async function getUserEncryptionKey(userId: string) {
  try {
    // Get user's private key from session storage
    const privateKeyString = sessionStorage.getItem('privateKey');
    if (!privateKeyString) {
      throw new Error('Private key not found');
    }
    
    return JSON.parse(privateKeyString);
  } catch (error) {
    console.error('Error getting encryption key:', error);
    return null;
  }
}

// Encrypt a message for a channel
export async function encryptChannelMessage(channelId: string, message: string) {
  try {
    // For channel messages, we'll use a channel-specific key
    // This is a simplified approach - in a production app, you'd encrypt
    // for all channel members individually
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(message);
    
    // Generate a simple key for demo purposes
    const channelKey = await deriveChannelKey(channelId);
    
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      channelKey,
      encoded
    );
    
    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
      isEncrypted: true
    };
  } catch (error) {
    console.error('Encryption error:', error);
    // Fall back to unencrypted message
    return { 
      encrypted: message,
      iv: 'unencrypted',
      isEncrypted: false
    };
  }
}

// Decrypt a channel message
export async function decryptChannelMessage(channelId: string, encryptedContent: string, iv: string) {
  try {
    if (iv === 'unencrypted') {
      return encryptedContent;
    }
    
    const channelKey = await deriveChannelKey(channelId);
    const encryptedData = Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0));
    const ivData = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivData },
      channelKey,
      encryptedData
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return `🔒 [Encrypted message - cannot decrypt]`;
  }
}

// Derive a channel-specific key
async function deriveChannelKey(channelId: string) {
  // In a real implementation, you'd want to create a unique key for each channel
  // and encrypt it for each member using their public key
  const encoder = new TextEncoder();
  const data = encoder.encode(`channel-key-${channelId}`);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  
  return window.crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt a direct message for a specific user
export async function encryptDirectMessage(receiverId: string, message: string) {
  try {
    // Get the private key from session storage
    const privateKeyString = sessionStorage.getItem('privateKey');
    if (!privateKeyString) {
      throw new Error('Private key not found');
    }
    
    // Get receiver's public key
    const { data: receiverKey, error } = await supabase
      .from('user_keys')
      .select('public_key')
      .eq('user_id', receiverId)
      .single();
    
    if (error || !receiverKey) {
      throw error || new Error('Receiver public key not found');
    }
    
    // Derive shared secret from private key and receiver's public key
    const privateKeyData = JSON.parse(privateKeyString);
    const privateKey = await window.crypto.subtle.importKey(
      'jwk',
      privateKeyData,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveKey']
    );
    
    // Import receiver's public key
    const publicKeyData = Uint8Array.from(atob(receiverKey.public_key), c => c.charCodeAt(0));
    const publicKey = await window.crypto.subtle.importKey(
      'raw',
      publicKeyData,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    );
    
    // Derive shared secret
    const sharedSecret = await window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: publicKey },
      privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    // Encrypt the message
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(message);
    
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      sharedSecret,
      encoded
    );
    
    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
      isEncrypted: true
    };
  } catch (error) {
    console.error('Direct message encryption error:', error);
    // Fall back to unencrypted message
    return { 
      encrypted: message,
      iv: 'unencrypted',
      isEncrypted: false
    };
  }
}

// Decrypt a direct message
export async function decryptDirectMessage(senderId: string, encryptedContent: string, iv: string) {
  try {
    if (iv === 'unencrypted') {
      return encryptedContent;
    }
    
    // Get the private key from session storage
    const privateKeyString = sessionStorage.getItem('privateKey');
    if (!privateKeyString) {
      throw new Error('Private key not found');
    }
    
    // Get sender's public key
    const { data: senderKey, error } = await supabase
      .from('user_keys')
      .select('public_key')
      .eq('user_id', senderId)
      .single();
    
    if (error || !senderKey) {
      throw error || new Error('Sender public key not found');
    }
    
    // Import private key
    const privateKeyData = JSON.parse(privateKeyString);
    const privateKey = await window.crypto.subtle.importKey(
      'jwk',
      privateKeyData,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveKey']
    );
    
    // Import sender's public key
    const publicKeyData = Uint8Array.from(atob(senderKey.public_key), c => c.charCodeAt(0));
    const publicKey = await window.crypto.subtle.importKey(
      'raw',
      publicKeyData,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    );
    
    // Derive shared secret
    const sharedSecret = await window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: publicKey },
      privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    // Decrypt the message
    const encryptedData = Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0));
    const ivData = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivData },
      sharedSecret,
      encryptedData
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Direct message decryption error:', error);
    return `🔒 [Encrypted message - cannot decrypt]`;
  }
}

// Migrate existing messages to encrypted format
export async function migrateExistingMessages(userId: string) {
  try {
    // Get all unencrypted messages sent by this user
    const { data: channelMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('is_encrypted', false)
      .eq('sender_id', userId);
    
    // Get all unencrypted direct messages
    const { data: directMessages } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('is_encrypted', false)
      .eq('sender_id', userId);
    
    // Process channel messages
    if (channelMessages && channelMessages.length > 0) {
      for (const message of channelMessages) {
        const { encrypted, iv, isEncrypted } = await encryptChannelMessage(
          message.channel_id, 
          message.encrypted_content
        );
        
        // Update the message
        await supabase
          .from('messages')
          .update({
            encrypted_content: encrypted,
            iv: iv,
            is_encrypted: isEncrypted
          })
          .eq('id', message.id);
      }
    }
    
    // Process direct messages
    if (directMessages && directMessages.length > 0) {
      for (const message of directMessages) {
        const { encrypted, iv, isEncrypted } = await encryptDirectMessage(
          message.receiver_id,
          message.encrypted_content
        );
        
        // Update the message
        await supabase
          .from('direct_messages')
          .update({
            encrypted_content: encrypted,
            iv: iv,
            is_encrypted: isEncrypted
          })
          .eq('id', message.id);
      }
    }
    
    return {
      success: true,
      channelCount: channelMessages?.length || 0,
      directCount: directMessages?.length || 0
    };
  } catch (error) {
    console.error('Migration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}