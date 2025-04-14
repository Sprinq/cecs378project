// components/chat/MessageInput.js
import React, { useState, useEffect, useRef } from 'react';
import { Lock, Send, Paperclip } from 'lucide-react';
import { sendMessage, sendTypingIndicator } from '../../services/socket';
import { toast } from 'react-toastify';

const MessageInput = ({ channelId, username }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const textareaRef = useRef(null);
  
  // Adjust textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);
  
  // Handle typing indicator
  useEffect(() => {
    if (message && !isTyping) {
      setIsTyping(true);
      sendTypingIndicator(channelId, username);
    }
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
      }
    }, 2000);
    
    setTypingTimeout(timeout);
    
    // Cleanup
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [message, isTyping, channelId, username, typingTimeout]);
  
  // Handle message submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      return;
    }
    
    try {
      await sendMessage(message, channelId);
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };
  
  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <div className="p-4 border-t border-gray-800">
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a secure message..."
          className="w-full px-4 py-3 pr-12 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          rows={1}
        />
        
        <div className="absolute right-2 bottom-2 flex items-center">
          <button
            type="button"
            className="text-gray-400 hover:text-white p-1 mr-1"
            title="Attach file (coming soon)"
            disabled
          >
            <Paperclip className="h-5 w-5" />
          </button>
          
          <button
            type="submit"
            disabled={!message.trim()}
            className={`p-1 rounded-full ${
              message.trim() 
                ? 'text-white bg-indigo-600 hover:bg-indigo-700' 
                : 'text-gray-500 bg-gray-600 cursor-not-allowed'
            }`}
            title="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
      
      <div className="mt-1 flex items-center text-xs text-green-400">
        <Lock className="h-3 w-3 mr-1" />
        <span>End-to-end encrypted</span>
      </div>
    </div>
  );
};

export default MessageInput;