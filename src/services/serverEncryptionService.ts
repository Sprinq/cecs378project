// src/services/serverEncryptionService.ts

import { supabase } from '../lib/supabase';

// Get the master encryption key from environment variable 
// (in a real production app, this would be securely stored)
const MASTER_KEY = import.meta.env.VITE_ENCRYPTION_MASTER_KEY || 'default-master-key-for-development';

/**
 * Generate a secure encryption key for a specific channel or conversation
 * @param entityId The ID of the channel or conversation
 * @returns A string to use as an encryption key
 */
export async function getEntityEncryptionKey(entityId: string): Promise<string> {
  try {
    // Check if a key already exists for this entity
    const { data, error } = await supabase
      .from('encryption_keys')
      .select('key_value')
      .eq('entity_id', entityId)
      .single();
    
    if (error) {
      // If no key exists, generate a new one
      if (error.code === 'PGRST116') { // No rows found
        return generateAndStoreNewKey(entityId);
      }
      throw error;
    }
    
    // Decrypt the key using the master key
    return decryptWithMasterKey(data.key_value);
  } catch (err) {
    console.error('Error fetching encryption key:', err);
    // Fall back to a derived key in case of error
    return deriveKeyFromEntity(entityId);
  }
}

/**
 * Generate a new encryption key for an entity and store it in the database
 */
async function generateAndStoreNewKey(entityId: string): Promise<string> {
  // Generate a random key
  const keyArray = new Uint8Array(32);
  window.crypto.getRandomValues(keyArray);
  const newKey = btoa(String.fromCharCode(...keyArray));
  
  // Encrypt the key with the master key
  const encryptedKey = encryptWithMasterKey(newKey);
  
  // Store the encrypted key in the database
  const { error } = await supabase
    .from('encryption_keys')
    .insert({
      entity_id: entityId,
      key_value: encryptedKey,
      created_at: new Date().toISOString()
    });
  
  if (error) {
    console.error('Error storing encryption key:', error);
    // Fall back to a derived key if we can't store it
    return deriveKeyFromEntity(entityId);
  }
  
  return newKey;
}

/**
 * Encrypt a message for a channel or direct message
 */
export async function encryptMessage(entityId: string, message: string): Promise<{ encrypted: string; iv: string }> {
  try {
    // Get the entity encryption key
    const keyString = await getEntityEncryptionKey(entityId);
    
    // Convert the key string to a CryptoKey
    const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
    const key = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Generate a new IV (Initialization Vector)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the message
    const encoded = new TextEncoder().encode(message);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    
    // Return the encrypted message and IV as base64 strings
    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv))
    };
  } catch (error) {
    console.error('Encryption error:', error);
    // In case of any error, return the message unencrypted
    return { 
      encrypted: message,
      iv: 'unencrypted'
    };
  }
}

/**
 * Decrypt a message from a channel or direct message
 */
export async function decryptMessage(entityId: string, encryptedContent: string, iv: string): Promise<string> {
  // If the message is not encrypted, return as is
  if (iv === 'unencrypted') {
    return encryptedContent;
  }
  
  try {
    // Get the entity encryption key
    const keyString = await getEntityEncryptionKey(entityId);
    
    // Convert the key string to a CryptoKey
    const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
    const key = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt the message
    const encryptedData = Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0));
    const ivData = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivData },
      key,
      encryptedData
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return `🔒 [Encrypted message - cannot decrypt]`;
  }
}

// Helper functions for master key operations

/**
 * Simple function to encrypt a value with the master key
 * In a production app, this would use a proper key derivation and encryption
 */
function encryptWithMasterKey(value: string): string {
  // Simple XOR encryption with the master key (for demonstration only)
  // In production, use a proper encryption algorithm
  const result = [];
  for (let i = 0; i < value.length; i++) {
    result.push(String.fromCharCode(
      value.charCodeAt(i) ^ MASTER_KEY.charCodeAt(i % MASTER_KEY.length)
    ));
  }
  return btoa(result.join(''));
}

/**
 * Simple function to decrypt a value with the master key
 */
function decryptWithMasterKey(encryptedValue: string): string {
  // Simple XOR decryption (for demonstration only)
  const value = atob(encryptedValue);
  const result = [];
  for (let i = 0; i < value.length; i++) {
    result.push(String.fromCharCode(
      value.charCodeAt(i) ^ MASTER_KEY.charCodeAt(i % MASTER_KEY.length)
    ));
  }
  return result.join('');
}

/**
 * Derive a deterministic key from an entity ID
 * This is used as a fallback in case database operations fail
 */
async function deriveKeyFromEntity(entityId: string): Promise<string> {
  // Create a key using PBKDF2 derivation from the entity ID and master key
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(entityId + MASTER_KEY),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode('SecureChat Salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
}