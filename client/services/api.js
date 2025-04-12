// services/api.js - Frontend API service
import axios from 'axios';
import * as cryptoUtils from '../../utils/crypto';

// Create axios instance with base URL and credentials
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add response interceptor for handling errors
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // If error is 401 Unauthorized and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        await refreshToken();
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  // Register a new user
  async register(username, email, password) {
    try {
      // Generate a key pair for the user
      const keyPair = await cryptoUtils.generateKeyPair();
      
      // Generate a unique device ID
      const deviceId = crypto.randomUUID();
      
      const response = await api.post('/auth/register', {
        username,
        email,
        password,
        publicKey: keyPair.publicKey,
        deviceId
      });
      
      // Store the keys in the browser
      await cryptoUtils.storeUserKeys(response.data.user._id, keyPair);
      
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  // Log in a user
  async login(username, password) {
    try {
      // Generate a unique device ID or retrieve existing one
      const deviceId = localStorage.getItem('device_id') || crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
      
      const response = await api.post('/auth/login', {
        username,
        password,
        deviceId
      });
      
      // Check if we already have keys for this user
      try {
        await cryptoUtils.retrieveUserKeys(response.data.user._id);
      } catch (keyError) {
        // If not, this is a new device, so we should generate new keys
        // In a real app, we would get the private key from the user's backup
        // or do a key exchange with their other devices
        // For now, we'll just generate a new key pair
        const keyPair = await cryptoUtils.generateKeyPair();
        await cryptoUtils.storeUserKeys(response.data.user._id, keyPair);
        
        // Update the public key on the server
        await api.put('/auth/update-key', {
          publicKey: keyPair.publicKey,
          deviceId
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  // Refresh the access token
  async refreshToken() {
    try {
      const response = await api.post('/auth/refresh-token');
      return response.data;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  },
  
  // Log out the user
  async logout() {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },
  
  // Get the current user
  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }
};

// Server Services
export const serverService = {
  // Create a new server
  async createServer(name, icon = '') {
    try {
      const response = await api.post('/servers', { name, icon });
      
      // For each server, we need to create and store a symmetric key
      // for encrypting messages
      for (const channel of response.data.channels) {
        const channelKey = await cryptoUtils.generateSymmetricKey();
        const channelKeyBase64 = await cryptoUtils.exportSymmetricKey(channelKey);
        await cryptoUtils.storeChannelKey(channel._id, channelKeyBase64);
      }
      
      return response.data;
    } catch (error) {
      console.error('Create server error:', error);
      throw error;
    }
  },
  
  // Get all servers for the current user
  async getServers() {
    try {
      const response = await api.get('/servers');
      return response.data;
    } catch (error) {
      console.error('Get servers error:', error);
      throw error;
    }
  },
  
  // Get a specific server
  async getServer(serverId) {
    try {
      const response = await api.get(`/servers/${serverId}`);
      return response.data;
    } catch (error) {
      console.error('Get server error:', error);
      throw error;
    }
  },
  
  // Join a server
  async joinServer(serverId) {
    try {
      const response = await api.post(`/servers/${serverId}/join`);
      return response.data;
    } catch (error) {
      console.error('Join server error:', error);
      throw error;
    }
  },
  
  // Leave a server
  async leaveServer(serverId) {
    try {
      const response = await api.post(`/servers/${serverId}/leave`);
      return response.data;
    } catch (error) {
      console.error('Leave server error:', error);
      throw error;
    }
  },
  
  // Delete a server
  async deleteServer(serverId) {
    try {
      const response = await api.delete(`/servers/${serverId}`);
      return response.data;
    } catch (error) {
      console.error('Delete server error:', error);
      throw error;
    }
  }
};

// Channel Services
export const channelService = {
  // Create a new channel
  async createChannel(name, serverId, type = 'text') {
    try {
      const response = await api.post('/channels', { name, serverId, type });
      
      // Create and store a symmetric key for the new channel
      const channelKey = await cryptoUtils.generateSymmetricKey();
      const channelKeyBase64 = await cryptoUtils.exportSymmetricKey(channelKey);
      await cryptoUtils.storeChannelKey(response.data._id, channelKeyBase64);
      
      return response.data;
    } catch (error) {
      console.error('Create channel error:', error);
      throw error;
    }
  },
  
  // Get all channels in a server
  async getChannels(serverId) {
    try {
      const response = await api.get(`/channels/server/${serverId}`);
      return response.data;
    } catch (error) {
      console.error('Get channels error:', error);
      throw error;
    }
  },
  
  // Get a specific channel
  async getChannel(channelId) {
    try {
      const response = await api.get(`/channels/${channelId}`);
      return response.data;
    } catch (error) {
      console.error('Get channel error:', error);
      throw error;
    }
  },
  
  // Delete a channel
  async deleteChannel(channelId) {
    try {
      const response = await api.delete(`/channels/${channelId}`);
      return response.data;
    } catch (error) {
      console.error('Delete channel error:', error);
      throw error;
    }
  }
};

// Message Services
export const messageService = {
  // Send a message to a channel
  async sendMessage(content, channelId, replyTo = null) {
    try {
      // Get the channel encryption key
      const channelKeyBase64 = await cryptoUtils.retrieveChannelKey(channelId);
      const channelKey = await cryptoUtils.importSymmetricKey(channelKeyBase64);
      
      // Encrypt the message content
      const iv = cryptoUtils.generateIV();
      const encryptedContent = await cryptoUtils.encryptWithAES(content, channelKey, iv);
      const ivBase64 = cryptoUtils.arrayBufferToBase64(iv);
      
      // Send the encrypted message to the server
      const response = await api.post('/messages', {
        content: encryptedContent,
        channelId,
        iv: ivBase64,
        replyTo
      });
      
      return {
        ...response.data,
        // Add the decrypted content for the UI
        decryptedContent: content
      };
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  },
  
  // Get messages from a channel
  async getMessages(channelId, limit = 50, before = null) {
    try {
      // Build the query params
      let queryParams = `?limit=${limit}`;
      if (before) {
        queryParams += `&before=${before}`;
      }
      
      const response = await api.get(`/messages/channel/${channelId}${queryParams}`);
      
      // Get the channel encryption key
      const channelKeyBase64 = await cryptoUtils.retrieveChannelKey(channelId);
      const channelKey = await cryptoUtils.importSymmetricKey(channelKeyBase64);
      
      // Decrypt each message
      const decryptedMessages = await Promise.all(
        response.data.map(async (message) => {
          try {
            const decryptedContent = await cryptoUtils.decryptChannelMessage(
              message.content,
              message.iv,
              channelKey
            );
            
            return {
              ...message,
              decryptedContent
            };
          } catch (decryptError) {
            console.error(`Error decrypting message ${message._id}:`, decryptError);
            return {
              ...message,
              decryptedContent: '[Encryption error: Could not decrypt message]'
            };
          }
        })
      );
      
      return decryptedMessages;
    } catch (error) {
      console.error('Get messages error:', error);
      throw error;
    }
  },
  
  // Delete a message
  async deleteMessage(messageId) {
    try {
      const response = await api.delete(`/messages/${messageId}`);
      return response.data;
    } catch (error) {
      console.error('Delete message error:', error);
      throw error;
    }
  },
  
  // Edit a message
  async editMessage(messageId, content, channelId) {
    try {
      // Get the channel encryption key
      const channelKeyBase64 = await cryptoUtils.retrieveChannelKey(channelId);
      const channelKey = await cryptoUtils.importSymmetricKey(channelKeyBase64);
      
      // Encrypt the new message content
      const iv = cryptoUtils.generateIV();
      const encryptedContent = await cryptoUtils.encryptWithAES(content, channelKey, iv);
      const ivBase64 = cryptoUtils.arrayBufferToBase64(iv);
      
      // Send the encrypted message to the server
      const response = await api.put(`/messages/${messageId}`, {
        content: encryptedContent,
        iv: ivBase64
      });
      
      return {
        ...response.data,
        // Add the decrypted content for the UI
        decryptedContent: content
      };
    } catch (error) {
      console.error('Edit message error:', error);
      throw error;
    }
  }
};

// Key Exchange Services
export const keyExchangeService = {
  // Share a channel key with a user
  async shareChannelKey(channelId, recipientId) {
    try {
      // Get the recipient's public key
      const response = await api.get(`/users/${recipientId}/public-key`);
      const recipientPublicKeyBase64 = response.data.publicKey;
      
      // Import the recipient's public key
      const recipientPublicKey = await cryptoUtils.importPublicKey(recipientPublicKeyBase64);
      
      // Get the channel encryption key
      const channelKeyBase64 = await cryptoUtils.retrieveChannelKey(channelId);
      
      // Encrypt the channel key with the recipient's public key
      const encryptedChannelKey = await cryptoUtils.encryptWithRSA(
        channelKeyBase64,
        recipientPublicKey
      );
      
      // Send the encrypted channel key to the recipient
      await api.post('/key-exchange/share-channel-key', {
        channelId,
        recipientId,
        encryptedKey: encryptedChannelKey
      });
      
      return { success: true };
    } catch (error) {
      console.error('Share channel key error:', error);
      throw error;
    }
  },
  
  // Receive a channel key
  async receiveChannelKey(data) {
    try {
      const { channelId, encryptedKey } = data;
      
      // Get the current user's keys
      const currentUserId = localStorage.getItem('user_id');
      const userKeys = await cryptoUtils.retrieveUserKeys(currentUserId);
      
      // Import the private key
      const privateKey = await cryptoUtils.importPrivateKey(userKeys.privateKey);
      
      // Decrypt the channel key
      const channelKeyBase64 = await cryptoUtils.decryptWithRSA(encryptedKey, privateKey);
      
      // Store the channel key
      await cryptoUtils.storeChannelKey(channelId, channelKeyBase64);
      
      return { success: true };
    } catch (error) {
      console.error('Receive channel key error:', error);
      throw error;
    }
  }
};