// utils/crypto.js - Frontend encryption utilities
import { Buffer } from 'buffer';

/**
 * Generates a new RSA key pair for asymmetric encryption
 * @returns {Promise<{publicKey: string, privateKey: string}>}
 */
export async function generateKeyPair() {
  try {
    // Generate a new key pair
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]), // 65537
        hash: "SHA-256",
      },
      true, // extractable
      ["encrypt", "decrypt"] // key usages
    );

    // Export the public key as spki format
    const publicKeyExport = await window.crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey
    );

    // Export the private key as pkcs8 format
    const privateKeyExport = await window.crypto.subtle.exportKey(
      "pkcs8",
      keyPair.privateKey
    );

    // Convert to base64 for storage and transmission
    const publicKeyBase64 = arrayBufferToBase64(publicKeyExport);
    const privateKeyBase64 = arrayBufferToBase64(privateKeyExport);

    return {
      publicKey: publicKeyBase64,
      privateKey: privateKeyBase64
    };
  } catch (error) {
    console.error("Error generating key pair:", error);
    throw error;
  }
}

/**
 * Imports a public key from base64 string format
 * @param {string} publicKeyBase64 - Base64 encoded public key
 * @returns {Promise<CryptoKey>}
 */
export async function importPublicKey(publicKeyBase64) {
  try {
    const publicKeyBuffer = base64ToArrayBuffer(publicKeyBase64);
    
    return await window.crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"]
    );
  } catch (error) {
    console.error("Error importing public key:", error);
    throw error;
  }
}

/**
 * Imports a private key from base64 string format
 * @param {string} privateKeyBase64 - Base64 encoded private key
 * @returns {Promise<CryptoKey>}
 */
export async function importPrivateKey(privateKeyBase64) {
  try {
    const privateKeyBuffer = base64ToArrayBuffer(privateKeyBase64);
    
    return await window.crypto.subtle.importKey(
      "pkcs8",
      privateKeyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt"]
    );
  } catch (error) {
    console.error("Error importing private key:", error);
    throw error;
  }
}

/**
 * Generates a random symmetric key for AES-GCM encryption
 * @returns {Promise<CryptoKey>}
 */
export async function generateSymmetricKey() {
  try {
    return await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    console.error("Error generating symmetric key:", error);
    throw error;
  }
}

/**
 * Exports a symmetric key to base64 format
 * @param {CryptoKey} key - The symmetric key to export
 * @returns {Promise<string>} Base64 encoded key
 */
export async function exportSymmetricKey(key) {
  try {
    const rawKey = await window.crypto.subtle.exportKey("raw", key);
    return arrayBufferToBase64(rawKey);
  } catch (error) {
    console.error("Error exporting symmetric key:", error);
    throw error;
  }
}

/**
 * Imports a symmetric key from base64 format
 * @param {string} keyBase64 - Base64 encoded symmetric key
 * @returns {Promise<CryptoKey>}
 */
export async function importSymmetricKey(keyBase64) {
  try {
    const keyBuffer = base64ToArrayBuffer(keyBase64);
    
    return await window.crypto.subtle.importKey(
      "raw",
      keyBuffer,
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    console.error("Error importing symmetric key:", error);
    throw error;
  }
}

/**
 * Encrypts a message with RSA-OAEP (asymmetric encryption)
 * @param {string} message - The message to encrypt
 * @param {CryptoKey} publicKey - The recipient's public key
 * @returns {Promise<string>} Base64 encoded encrypted message
 */
export async function encryptWithRSA(message, publicKey) {
  try {
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message);
    
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
      },
      publicKey,
      messageBuffer
    );
    
    return arrayBufferToBase64(encryptedBuffer);
  } catch (error) {
    console.error("Error encrypting with RSA:", error);
    throw error;
  }
}

/**
 * Decrypts a message with RSA-OAEP (asymmetric encryption)
 * @param {string} encryptedBase64 - Base64 encoded encrypted message
 * @param {CryptoKey} privateKey - The recipient's private key
 * @returns {Promise<string>} Decrypted message
 */
export async function decryptWithRSA(encryptedBase64, privateKey) {
  try {
    const encryptedBuffer = base64ToArrayBuffer(encryptedBase64);
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP"
      },
      privateKey,
      encryptedBuffer
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error("Error decrypting with RSA:", error);
    throw error;
  }
}

/**
 * Generates a random initialization vector for AES-GCM encryption
 * @returns {Uint8Array} The initialization vector
 */
export function generateIV() {
  return window.crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Encrypts a message with AES-GCM (symmetric encryption)
 * @param {string} message - The message to encrypt
 * @param {CryptoKey} key - The symmetric key
 * @param {Uint8Array} iv - The initialization vector
 * @returns {Promise<string>} Base64 encoded encrypted message
 */
export async function encryptWithAES(message, key, iv) {
  try {
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message);
    
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
        tagLength: 128, // authentication tag length in bits
      },
      key,
      messageBuffer
    );
    
    return arrayBufferToBase64(encryptedBuffer);
  } catch (error) {
    console.error("Error encrypting with AES:", error);
    throw error;
  }
}

/**
 * Decrypts a message with AES-GCM (symmetric encryption)
 * @param {string} encryptedBase64 - Base64 encoded encrypted message
 * @param {CryptoKey} key - The symmetric key
 * @param {Uint8Array} iv - The initialization vector used for encryption
 * @returns {Promise<string>} Decrypted message
 */
export async function decryptWithAES(encryptedBase64, key, iv) {
  try {
    const encryptedBuffer = base64ToArrayBuffer(encryptedBase64);
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
        tagLength: 128, // authentication tag length in bits
      },
      key,
      encryptedBuffer
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error("Error decrypting with AES:", error);
    throw error;
  }
}

/**
 * Encrypts a message for a channel (used for group messaging)
 * @param {string} message - The message to encrypt
 * @param {CryptoKey} channelKey - The symmetric key for the channel
 * @returns {Promise<{content: string, iv: string}>} Encrypted message and IV
 */
export async function encryptChannelMessage(message, channelKey) {
  try {
    const iv = generateIV();
    const encryptedContent = await encryptWithAES(message, channelKey, iv);
    
    return {
      content: encryptedContent,
      iv: arrayBufferToBase64(iv)
    };
  } catch (error) {
    console.error("Error encrypting channel message:", error);
    throw error;
  }
}

/**
 * Decrypts a message from a channel
 * @param {string} encryptedContent - Base64 encoded encrypted message
 * @param {string} ivBase64 - Base64 encoded initialization vector
 * @param {CryptoKey} channelKey - The symmetric key for the channel
 * @returns {Promise<string>} Decrypted message
 */
export async function decryptChannelMessage(encryptedContent, ivBase64, channelKey) {
  try {
    const iv = base64ToArrayBuffer(ivBase64);
    return await decryptWithAES(encryptedContent, channelKey, iv);
  } catch (error) {
    console.error("Error decrypting channel message:", error);
    throw error;
  }
}

/**
 * Converts an ArrayBuffer to a Base64 string
 * @param {ArrayBuffer} buffer - The buffer to convert
 * @returns {string} Base64 encoded string
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64 string to an ArrayBuffer
 * @param {string} base64 - The Base64 string to convert
 * @returns {ArrayBuffer} The resulting buffer
 */
export function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts a Base64 string to a Uint8Array
 * @param {string} base64 - The Base64 string to convert
 * @returns {Uint8Array} The resulting array
 */
export function base64ToUint8Array(base64) {
  return new Uint8Array(base64ToArrayBuffer(base64));
}

/**
 * Stores the user's encryption keys in IndexedDB
 * @param {string} userId - The user's ID
 * @param {Object} keys - Object containing publicKey and privateKey
 * @returns {Promise<void>}
 */
export async function storeUserKeys(userId, keys) {
  // This would use IndexedDB to securely store keys on the client
  // Implementation would depend on your IndexedDB wrapper/library of choice
  localStorage.setItem(`${userId}_public_key`, keys.publicKey);
  // In a real app, you'd want to encrypt this with a derived key from the user's password
  localStorage.setItem(`${userId}_private_key`, keys.privateKey);
}

/**
 * Retrieves the user's encryption keys from IndexedDB
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} Object containing publicKey and privateKey
 */
export async function retrieveUserKeys(userId) {
  // This would retrieve keys from IndexedDB
  // Implementation would depend on your IndexedDB wrapper/library of choice
  const publicKey = localStorage.getItem(`${userId}_public_key`);
  const privateKey = localStorage.getItem(`${userId}_private_key`);
  
  if (!publicKey || !privateKey) {
    throw new Error("User keys not found");
  }
  
  return { publicKey, privateKey };
}

/**
 * Stores a channel encryption key in IndexedDB
 * @param {string} channelId - The channel ID
 * @param {string} keyBase64 - Base64 encoded symmetric key
 * @returns {Promise<void>}
 */
export async function storeChannelKey(channelId, keyBase64) {
  // Store in local storage (in a real app, use IndexedDB with encryption)
  localStorage.setItem(`channel_key_${channelId}`, keyBase64);
}

/**
 * Retrieves a channel encryption key from IndexedDB
 * @param {string} channelId - The channel ID
 * @returns {Promise<string>} Base64 encoded symmetric key
 */
export async function retrieveChannelKey(channelId) {
  // Retrieve from local storage (in a real app, use IndexedDB with encryption)
  const keyBase64 = localStorage.getItem(`channel_key_${channelId}`);
  
  if (!keyBase64) {
    throw new Error(`Channel key not found for channel ${channelId}`);
  }
  
  return keyBase64;
}