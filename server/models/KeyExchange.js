// models/KeyExchange.js - For storing public keys and facilitating E2EE
const mongoose = require('mongoose');

const KeyExchangeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  publicKey: {
    type: String,
    required: true
  },
  // For ephemeral keys used in ECDH exchanges
  ephemeralPublicKey: {
    type: String
  },
  // When the key was last rotated
  rotatedAt: {
    type: Date,
    default: Date.now
  },
  // For handling multiple device support
  deviceId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const KeyExchange = mongoose.model('KeyExchange', KeyExchangeSchema);

module.exports = KeyExchange;