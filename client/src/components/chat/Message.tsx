// components/chat/Message.tsx
import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Lock, MoreHorizontal, Edit3, Trash2, Reply, Check, X } from 'lucide-react';
import { messageService } from '../../services/api';
import { toast } from 'react-toastify';
import { Message as MessageType, User } from '../../types';
import './Message.css';

interface MessageProps {
  message: MessageType;
  isCurrentUser: boolean;
}

const Message: React.FC<MessageProps> = ({ message, isCurrentUser }) => {
  const [showActions, setShowActions] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedContent, setEditedContent] = useState<string>(message.decryptedContent || '');
  const actionsRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Format time from the message timestamp
  const formattedTime = format(new Date(message.createdAt), 'h:mm a');
  
  // Toggle message actions menu
  const toggleActions = () => {
    setShowActions(!showActions);
  };
  
  // Handle clicking outside the actions menu
  const handleClickOutside = (e: MouseEvent) => {
    if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
      setShowActions(false);
    }
  };
  
  // Add event listener when actions menu is open
  useEffect(() => {
    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActions]);
  
  // Focus the edit input when entering edit mode
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [isEditing]);
  
  // Handle message edit
  const handleEdit = () => {
    setIsEditing(true);
    setShowActions(false);
  };
  
  // Handle message delete
  const handleDelete = async () => {
    try {
      await messageService.deleteMessage(message._id);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };
  
  // Save edited message
  const handleSaveEdit = async () => {
    if (editedContent.trim() === '') {
      toast.error('Message cannot be empty');
      return;
    }
    
    if (editedContent === message.decryptedContent) {
      setIsEditing(false);
      return;
    }
    
    try {
      if (typeof message.channel === 'string') {
        await messageService.editMessage(message._id, editedContent, message.channel);
        setIsEditing(false);
        toast.success('Message updated');
      }
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    }
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditedContent(message.decryptedContent || '');
    setIsEditing(false);
  };
  
  // Handle pressing Enter to save or Escape to cancel
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };
  
  // Get sender information
  const getSenderName = (): string => {
    if (typeof message.sender === 'object') {
      return message.sender.username;
    }
    return 'Unknown User';
  };
  
  // Get reply info if the message has a replyTo reference
  const getReplyInfo = () => {
    if (!message.replyTo) return null;
    
    let replySender = 'Unknown User';
    
    if (typeof message.replyTo === 'object' && message.replyTo.sender) {
      if (typeof message.replyTo.sender === 'object') {
        replySender = message.replyTo.sender.username;
      }
    }
    
    return (
      <div className="flex items-center text-xs text-gray-500 mb-1 ml-10">
        <Reply className="h-3 w-3 mr-1 transform rotate-180" />
        <span>Replying to </span>
        <span className="font-medium ml-1">{replySender}</span>
      </div>
    );
  };
  
  const replyInfo = getReplyInfo();
  
  return (
    <div 
      className={`mb-4 group ${isEditing ? 'bg-gray-800/80 backdrop-blur-sm rounded-lg p-3' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => !isEditing && setShowActions(false)}
    >
      {replyInfo}
      
      <div className="flex items-start">
        <div className="w-10 h-10 rounded-full flex-shrink-0 mr-3 overflow-hidden">
          {typeof message.sender === 'object' && message.sender.avatar ? (
            <img 
              src={message.sender.avatar} 
              alt={getSenderName()}
              className="w-10 h-10 object-cover" 
            />
          ) : (
            <div className={`w-10 h-10 flex items-center justify-center text-white rounded-full ${
              isCurrentUser 
                ? 'bg-gradient-to-br from-indigo-500 to-indigo-600' 
                : 'bg-gradient-to-br from-green-500 to-green-600'
            }`}>
              {getSenderName().charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center mb-1">
            <span className={`font-medium mr-2 ${isCurrentUser ? 'text-indigo-400' : 'text-white'}`}>
              {getSenderName()}
              {isCurrentUser && <span className="ml-1 text-xs text-gray-400">(you)</span>}
            </span>
            <span className="text-xs text-gray-400">
              {formattedTime}
            </span>
            {message.edited && (
              <span className="text-xs text-gray-500 ml-1">(edited)</span>
            )}
            {message.encrypted && (
              <div title="End-to-end encrypted">
                <Lock className="h-3 w-3 text-green-400 ml-1" />
              </div>
            )}
          </div>
          
          {isEditing ? (
            <div className="mt-1">
              <textarea
                ref={editInputRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white resize-none"
                rows={3}
              />
              <div className="flex justify-end mt-2 space-x-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-sm flex items-center bg-gray-700/80 hover:bg-gray-600/80 rounded-md text-white transition-colors"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 text-sm flex items-center bg-indigo-600 hover:bg-indigo-700 rounded-md text-white transition-colors"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Press ESC to cancel, Enter to save
              </div>
            </div>
          ) : (
            <div className="bg-gray-800/60 backdrop-blur-sm px-4 py-2 rounded-lg text-gray-200 break-words whitespace-pre-wrap shadow-sm relative hover:bg-gray-800/80 transition-colors">
              {message.decryptedContent}
            </div>
          )}
        </div>
        
        {isCurrentUser && !isEditing && (
          <div className="relative ml-2">
            <button
              onClick={toggleActions}
              className={`text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-700/50 transition-colors ${showActions ? 'visible bg-gray-700/50' : 'invisible group-hover:visible'}`}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            
            {showActions && (
              <div 
                ref={actionsRef}
                className="absolute right-0 mt-1 w-36 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg z-10 border border-gray-700/50 overflow-hidden"
              >
                <button
                  onClick={handleEdit}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-gray-700/80 transition-colors flex items-center"
                >
                  <Edit3 className="h-4 w-4 mr-2 text-indigo-400" />
                  Edit Message
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-gray-700/80 transition-colors flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Message
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;