// components/chat/MessageInput.tsx
import React, { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { Lock, Send, Paperclip, Smile, Mic } from 'lucide-react';
import { sendMessage, sendTypingIndicator } from '../../services/socket';
import { toast } from 'react-toastify';

interface MessageInputProps {
  channelId: string;
  username: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ channelId, username }) => {
  const [message, setMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
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
  const handleSubmit = async (e: FormEvent) => {
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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleMessageChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  return (
    <div className="p-4 border-t border-gray-800/50 bg-gray-800/30 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="relative">
        <div 
          className={`relative rounded-lg transition-all duration-200 ${
            isFocused ? 'ring-2 ring-indigo-500' : 'ring-0'
          }`}
        >
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Type a secure message..."
            className="w-full px-4 py-3 pr-24 bg-gray-700/80 text-white rounded-lg focus:outline-none resize-none"
            rows={1}
          />
          
          <div className="absolute right-2 bottom-2 flex items-center">
            <button
              type="button"
              className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-600/50 transition-colors mr-1"
              title="Attach file (coming soon)"
              disabled
            >
              <Paperclip className="h-5 w-5" />
            </button>
            
            <button
              type="button"
              className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-600/50 transition-colors mr-1"
              title="Add emoji (coming soon)"
              disabled
            >
              <Smile className="h-5 w-5" />
            </button>
            
            <button
              type="button"
              className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-600/50 transition-colors mr-1"
              title="Voice message (coming soon)"
              disabled
            >
              <Mic className="h-5 w-5" />
            </button>
            
            <button
              type="submit"
              disabled={!message.trim()}
              className={`p-1.5 rounded-full transition-all duration-200 ${
                message.trim() 
                  ? 'text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:shadow-md hover:shadow-indigo-500/20' 
                  : 'text-gray-500 bg-gray-600/50 cursor-not-allowed'
              }`}
              title="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </form>
      
      <div className="mt-2 flex items-center justify-between text-xs">
        <div className="flex items-center text-green-400">
          <Lock className="h-3 w-3 mr-1" />
          <span>End-to-end encrypted</span>
        </div>
        
        <div className="text-gray-400">
          Press <kbd className="px-1.5 py-0.5 rounded bg-gray-700/70 text-gray-300 text-xs">Shift + Enter</kbd> for new line
        </div>
      </div>
    </div>
  );
};

export default MessageInput;