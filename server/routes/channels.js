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