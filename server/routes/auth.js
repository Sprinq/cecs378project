// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const KeyExchange = require('../models/KeyExchange');
const auth = require('../middleware/auth');

// Register a new user
router.post('/register', [
  // Validation
  body('username').trim().isLength({ min: 3, max: 30 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('publicKey').not().isEmpty()
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, publicKey, deviceId } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      username,
      email,
      password,
      publicKey
    });

    // Save user
    await user.save();

    // Also save their key exchange info
    const keyExchange = new KeyExchange({
      user: user._id,
      publicKey,
      deviceId
    });
    
    await keyExchange.save();

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create refresh token
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 604800000 // 7 days
    });

    // Return user info (without password)
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      publicKey: user.publicKey
    };

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', [
  body('username').trim().not().isEmpty(),
  body('password').not().isEmpty(),
  body('deviceId').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, deviceId } = req.body;

  try {
    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update user status
    user.status = 'online';
    await user.save();

    // Create tokens
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 604800000 // 7 days
    });

    // Check if we have key exchange info for this device
    let keyExchange = await KeyExchange.findOne({ 
      user: user._id,
      deviceId
    });

    // If not found, create a new entry for this device
    // In a real app, you'd get the publicKey during login for new devices
    if (!keyExchange) {
      keyExchange = new KeyExchange({
        user: user._id,
        publicKey: user.publicKey, // This is just a placeholder
        deviceId
      });
      await keyExchange.save();
    }

    // Return user data
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      publicKey: user.publicKey,
      status: user.status
    };

    res.json({
      message: 'Login successful',
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }
  
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Generate new access token
    const token = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Set new access token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });
    
    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', auth, async (req, res) => {
  try {
    // Update user status
    const user = await User.findById(req.userId);
    if (user) {
      user.status = 'offline';
      await user.save();
    }
    
    // Clear cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password')
      .populate('servers', 'name icon');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error retrieving user data' });
  }
});

// Update public key (key rotation)
router.put('/update-key', auth, [
  body('publicKey').not().isEmpty(),
  body('deviceId').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { publicKey, deviceId } = req.body;

  try {
    // Update in KeyExchange collection
    const keyExchange = await KeyExchange.findOneAndUpdate(
      { user: req.userId, deviceId },
      { 
        publicKey,
        rotatedAt: Date.now()
      },
      { new: true, upsert: true }
    );

    // Also update in user document if it's the primary device
    const user = await User.findById(req.userId);
    if (user) {
      user.publicKey = publicKey;
      await user.save();
    }

    res.json({ 
      message: 'Public key updated successfully',
      keyExchange
    });
  } catch (error) {
    console.error('Update key error:', error);
    res.status(500).json({ message: 'Server error updating public key' });
  }
});

module.exports = router;

// routes/servers.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Server = require('../models/Server');
const Channel = require('../models/Channel');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create a new server
router.post('/', auth, [
  body('name').trim().isLength({ min: 1, max: 100 }).escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, icon } = req.body;

  try {
    // Create server
    const server = new Server({
      name,
      icon: icon || '',
      owner: req.userId,
      members: [req.userId]
    });

    await server.save();

    // Create default channels
    const generalChannel = new Channel({
      name: 'general',
      server: server._id
    });

    await generalChannel.save();

    // Add channel to server
    server.channels.push(generalChannel._id);
    await server.save();

    // Add server to user's servers
    await User.findByIdAndUpdate(req.userId, {
      $push: { servers: server._id }
    });

    // Return complete server with channels
    const populatedServer = await Server.findById(server._id)
      .populate('channels')
      .populate('members', 'username avatar status');

    res.status(201).json(populatedServer);
  } catch (error) {
    console.error('Server creation error:', error);
    res.status(500).json({ message: 'Error creating server' });
  }
});

// Get all servers for current user
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate({
      path: 'servers',
      populate: {
        path: 'channels',
        model: 'Channel'
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.servers);
  } catch (error) {
    console.error('Get servers error:', error);
    res.status(500).json({ message: 'Error retrieving servers' });
  }
});

// Get a specific server
router.get('/:id', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id)
      .populate('channels')
      .populate('members', 'username avatar status');

    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    // Check if user is a member
    if (!server.members.some(member => member._id.toString() === req.userId)) {
      return res.status(403).json({ message: 'Not a member of this server' });
    }

    res.json(server);
  } catch (error) {
    console.error('Get server error:', error);
    res.status(500).json({ message: 'Error retrieving server' });
  }
});

// Join a server
router.post('/:id/join', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);

    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    // Check if already a member
    if (server.members.includes(req.userId)) {
      return res.status(400).json({ message: 'Already a member of this server' });
    }

    // Add user to server members
    server.members.push(req.userId);
    await server.save();

    // Add server to user's servers
    await User.findByIdAndUpdate(req.userId, {
      $push: { servers: server._id }
    });

    res.json({ message: 'Joined server successfully' });
  } catch (error) {
    console.error('Join server error:', error);
    res.status(500).json({ message: 'Error joining server' });
  }
});

// Leave a server
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);

    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    // Check if user is the owner
    if (server.owner.toString() === req.userId) {
      return res.status(400).json({ message: 'Server owner cannot leave, transfer ownership first' });
    }

    // Remove user from server members
    server.members = server.members.filter(
      member => member.toString() !== req.userId
    );
    await server.save();

    // Remove server from user's servers
    await User.findByIdAndUpdate(req.userId, {
      $pull: { servers: server._id }
    });

    res.json({ message: 'Left server successfully' });
  } catch (error) {
    console.error('Leave server error:', error);
    res.status(500).json({ message: 'Error leaving server' });
  }
});

// Delete a server
router.delete('/:id', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);

    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    // Check if user is the owner
    if (server.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only the server owner can delete the server' });
    }

    // Delete all channels in the server
    await Channel.deleteMany({ server: server._id });

    // Remove server from all members' server lists
    await User.updateMany(
      { _id: { $in: server.members } },
      { $pull: { servers: server._id } }
    );

    // Delete the server
    await server.remove();

    res.json({ message: 'Server deleted successfully' });
  } catch (error) {
    console.error('Delete server error:', error);
    res.status(500).json({ message: 'Error deleting server' });
  }
});

module.exports = router;

// routes/channels.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Channel = require('../models/Channel');
const Server = require('../models/Server');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Create a new channel in a server
router.post('/', auth, [
  body('name').trim().isLength({ min: 1, max: 100 }).escape(),
  body('serverId').isMongoId()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, serverId, type = 'text' } = req.body;

  try {
    // Check if user is a member of the server
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    if (!server.members.includes(req.userId)) {
      return res.status(403).json({ message: 'Not a member of this server' });
    }

    // Create channel
    const channel = new Channel({
      name,
      server: serverId,
      type
    });

    await channel.save();

    // Add channel to server
    server.channels.push(channel._id);
    await server.save();

    res.status(201).json(channel);
  } catch (error) {
    console.error('Channel creation error:', error);
    res.status(500).json({ message: 'Error creating channel' });
  }
});

// Get all channels in a server
router.get('/server/:serverId', auth, async (req, res) => {
  try {
    const { serverId } = req.params;

    // Check if user is a member of the server
    const server = await Server.findById(serverId).populate('channels');
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    if (!server.members.includes(req.userId)) {
      return res.status(403).json({ message: 'Not a member of this server' });
    }

    res.json(server.channels);
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ message: 'Error retrieving channels' });
  }
});

// Get a specific channel
router.get('/:id', auth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id).populate('server');

    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    // Check if user is a member of the server
    const server = await Server.findById(channel.server);
    if (!server.members.includes(req.userId)) {
      return res.status(403).json({ message: 'Not authorized to access this channel' });
    }

    res.json(channel);
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({ message: 'Error retrieving channel' });
  }
});

// Delete a channel
router.delete('/:id', auth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);

    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    // Check if user is the server owner
    const server = await Server.findById(channel.server);
    if (server.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only server owner can delete channels' });
    }

    // Don't delete the last remaining channel
    if (server.channels.length <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last channel in a server' });
    }

    // Delete all messages in the channel
    await Message.deleteMany({ channel: channel._id });

    // Remove channel from server
    server.channels = server.channels.filter(
      c => c.toString() !== channel._id.toString()
    );
    await server.save();

    // Delete the channel
    await channel.remove();

    res.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({ message: 'Error deleting channel' });
  }
});

module.exports = router;

// routes/messages.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const Server = require('../models/Server');
const auth = require('../middleware/auth');

// Send a message to a channel
router.post('/', auth, [
  body('content').not().isEmpty(),
  body('channelId').isMongoId(),
  body('iv').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { content, channelId, iv, replyTo } = req.body;

  try {
    // Check if channel exists and user has access
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    // Check if user is a member of the server
    const server = await Server.findById(channel.server);
    if (!server.members.includes(req.userId)) {
      return res.status(403).json({ message: 'Not authorized to post in this channel' });
    }

    // Create message with encrypted content
    const message = new Message({
      content, // This should be already encrypted by the client
      iv,      // Initialization vector used for encryption
      sender: req.userId,
      channel: channelId,
      replyTo: replyTo || null
    });

    await message.save();

    // Populate sender information for the response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar')
      .populate('replyTo');

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Get messages from a channel
router.get('/channel/:channelId', auth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { limit = 50, before } = req.query;

    // Check if channel exists and user has access
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    // Check if user is a member of the server
    const server = await Server.findById(channel.server);
    if (!server.members.includes(req.userId)) {
      return res.status(403).json({ message: 'Not authorized to view this channel' });
    }

    // Build query
    let query = { channel: channelId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Get messages
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sender', 'username avatar')
      .populate({
        path: 'replyTo',
        populate: {
          path: 'sender',
          select: 'username avatar'
        }
      });

    res.json(messages.reverse());
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Error retrieving messages' });
  }
});

// Delete a message
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the message sender
    if (message.sender.toString() !== req.userId) {
      // Check if user is the server owner
      const channel = await Channel.findById(message.channel);
      const server = await Server.findById(channel.server);
      
      if (server.owner.toString() !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to delete this message' });
      }
    }

    await message.remove();
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Error deleting message' });
  }
});

// Edit a message
router.put('/:id', auth, [
  body('content').not().isEmpty(),
  body('iv').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { content, iv } = req.body;

  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the message sender
    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to edit this message' });
    }

    // Update message with new encrypted content
    message.content = content;
    message.iv = iv;
    message.edited = true;
    
    await message.save();

    // Populate sender information for the response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar')
      .populate('replyTo');

    res.json(populatedMessage);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Error editing message' });
  }
});

module.exports = router;