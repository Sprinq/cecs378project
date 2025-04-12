// models/Message.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  // We only store encrypted content
  content: {
    type: String,
    required: true
  },
  // We store the IV (initialization vector) used for encryption
  iv: {
    type: String,
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  // Optional reply to another message
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  attachments: [{
    type: String
  }],
  edited: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;