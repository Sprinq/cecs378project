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