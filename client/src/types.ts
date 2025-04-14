// src/types.ts - TypeScript interfaces for the application

export interface User {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
    publicKey: string;
    status: 'online' | 'idle' | 'dnd' | 'offline';
    servers?: Server[];
  }
  
  export interface Server {
    _id: string;
    name: string;
    icon?: string;
    owner: string | User;
    members: (string | User)[];
    channels: (string | Channel)[];
    createdAt: string;
    updatedAt?: string;
  }
  
  export interface Channel {
    _id: string;
    name: string;
    server: string | Server;
    type: 'text' | 'voice';
    createdAt: string;
    updatedAt?: string;
  }
  
  export interface Message {
    _id: string;
    content: string;
    iv: string;
    decryptedContent?: string;
    sender: string | User;
    channel: string | Channel;
    replyTo?: string | Message;
    attachments?: string[];
    edited: boolean;
    encrypted?: boolean;
    createdAt: string;
    updatedAt?: string;
  }
  
  export interface KeyExchange {
    _id: string;
    user: string | User;
    publicKey: string;
    ephemeralPublicKey?: string;
    rotatedAt: string;
    deviceId: string;
    createdAt: string;
    updatedAt?: string;
  }
  
  export interface AuthResponse {
    message: string;
    user: User;
  }
  
  export interface TypingIndicator {
    username: string;
    channelId: string;
  }