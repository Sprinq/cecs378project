// server.js - Main server file
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./server/routes/auth');
const serverRoutes = require('./server/routes/servers');
const channelRoutes = require('./server/routes/channels');
const messageRoutes = require('./server/routes/messages');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Join a channel
  socket.on('join-channel', (channelId) => {
    socket.join(channelId);
    console.log(`Client joined channel: ${channelId}`);
  });
  
  // Leave a channel
  socket.on('leave-channel', (channelId) => {
    socket.leave(channelId);
    console.log(`Client left channel: ${channelId}`);
  });
  
  // New message
  socket.on('send-message', async (messageData) => {
    // In a real app, you would validate the token and user permissions here
    
    // The messages are already encrypted on the client side
    // We just store and forward the encrypted message
    
    try {
      // Broadcast the encrypted message to all clients in the channel
      io.to(messageData.channelId).emit('new-message', messageData);
      
      // We'll also save the message to the database via the API
      // This is handled in the messageRoutes
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });
  
  // Typing indicator
  socket.on('typing', (data) => {
    socket.to(data.channelId).emit('user-typing', {
      username: data.username,
      channelId: data.channelId
    });
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));