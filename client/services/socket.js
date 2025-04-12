// services/socket.js - WebSocket service using Socket.IO
import { io } from 'socket.io-client';
import * as cryptoUtils from '../../utils/crypto';
import { messageService } from './api';

let socket;
let currentChannelId;
let messageCallbacks = [];
let typingCallbacks = [];

// Initialize the socket connection
export const initSocket = (userId) => {
  socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
    withCredentials: true
  });

  // Connection event
  socket.on('connect', () => {
    console.log('Connected to WebSocket server');
  });

  // New message event
  socket.on('new-message', async (messageData) => {
    try {
      // Get the channel key
      const channelKeyBase64 = await cryptoUtils.retrieveChannelKey(messageData.channelId);
      const channelKey = await cryptoUtils.importSymmetricKey(channelKeyBase64);
      
      // Decrypt the message
      const decryptedContent = await cryptoUtils.decryptChannelMessage(
        messageData.content,
        messageData.iv,
        channelKey
      );
      
      // Add decrypted content
      const messageWithDecrypted = {
        ...messageData,
        decryptedContent
      };
      
      // Notify all registered callbacks
      for (const callback of messageCallbacks) {
        callback(messageWithDecrypted);
      }
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  });

  // User typing event
  socket.on('user-typing', (data) => {
    for (const callback of typingCallbacks) {
      callback(data);
    }
  });

  // Disconnect event
  socket.on('disconnect', () => {
    console.log('Disconnected from WebSocket server');
  });

  // Error event
  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  return socket;
};

// Join a channel
export const joinChannel = (channelId) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  if (currentChannelId) {
    leaveChannel(currentChannelId);
  }

  socket.emit('join-channel', channelId);
  currentChannelId = channelId;
};

// Leave a channel
export const leaveChannel = (channelId) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('leave-channel', channelId);
  if (currentChannelId === channelId) {
    currentChannelId = null;
  }
};

// Send a message through WebSocket
export const sendMessage = async (content, channelId, replyTo = null) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  try {
    // Use the messageService to handle encryption and saving
    const messageData = await messageService.sendMessage(content, channelId, replyTo);
    
    // Emit the event to notify other users
    socket.emit('send-message', messageData);
    
    return messageData;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Send typing indicator
export const sendTypingIndicator = (channelId, username) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('typing', {
    channelId,
    username
  });
};

// Register a callback for new messages
export const onNewMessage = (callback) => {
  messageCallbacks.push(callback);
  return () => {
    messageCallbacks = messageCallbacks.filter(cb => cb !== callback);
  };
};

// Register a callback for typing indicators
export const onUserTyping = (callback) => {
  typingCallbacks.push(callback);
  return () => {
    typingCallbacks = typingCallbacks.filter(cb => cb !== callback);
  };
};

// Cleanup function
export const cleanup = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  messageCallbacks = [];
  typingCallbacks = [];
  currentChannelId = null;
};