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