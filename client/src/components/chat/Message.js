// components/chat/Message.js
import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Lock, MoreHorizontal, Edit3, Trash2, Reply } from 'lucide-react';
import { messageService } from '../../services/api';
import { toast } from 'react-toastify';

const Message = ({ message, isCurrentUser }) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.decryptedContent);
  const actionsRef = useRef(null);
  const editInputRef = useRef(null);
  
  // Format time from the message timestamp
  const formattedTime = format(new Date(message.createdAt), 'h:mm a');
  
  // Toggle message actions menu
  const toggleActions = () => {
    setShowActions(!showActions);
  };
  
  // Handle clicking outside the actions menu
  const handleClickOutside = (e) => {
    if (actionsRef.current && !actionsRef.current.contains(e.target)) {
      setShowActions(false);
    }
  };
  
  // Add event listener when actions menu is open
  React.useEffect(() => {
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
  React.useEffect(() => {
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
      await messageService.editMessage(message._id, editedContent, message.channel);
      setIsEditing(false);
      toast.success('Message updated');
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    }
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditedContent(message.decryptedContent);
    setIsEditing(false);
  };
  
  // Handle pressing Enter to save or Escape to cancel
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };
  
  // If the message has a reply reference, show the reply info
  const replyInfo = message.replyTo && (
    <div className="flex items-center text-xs text-gray-500 mb-1 ml-10">
      <Reply className="h-3 w-3 mr-1 transform rotate-180" />
      <span>Replying to </span>
      <span className="font-medium ml-1">{message.replyTo.sender.username}</span>
    </div>
  );
  
  return (
    <div 
      className={`mb-4 group ${isEditing ? 'bg-gray-800 rounded-md p-2' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => !isEditing && setShowActions(false)}
    >
      {replyInfo}
      
      <div className="flex items-start">
        <div className="w-8 h-8 rounded-full flex-shrink-0 mr-2 overflow-hidden">
          {message.sender.avatar ? (
            <img 
              src={message.sender.avatar} 
              alt={message.sender.username}
              className="w-8 h-8 object-cover" 
            />
          ) : (
            <div className={`w-8 h-8 flex items-center justify-center text-white ${
              isCurrentUser ? 'bg-indigo-600' : 'bg-green-600'
            }`}>
              {message.sender.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <span className={`font-semibold mr-2 ${isCurrentUser ? 'text-indigo-400' : 'text-white'}`}>
              {message.sender.username}
              {isCurrentUser && <span className="ml-1 text-xs text-gray-400">(you)</span>}
            </span>
            <span className="text-xs text-gray-400">
              {formattedTime}
            </span>
            {message.edited && (
              <span className="text-xs text-gray-500 ml-1">(edited)</span>
            )}
            {message.encrypted && (
              <Lock className="h-3 w-3 text-green-400 ml-1" title="End-to-end encrypted" />
            )}
          </div>
          
          {isEditing ? (
            <div className="mt-1">
              <textarea
                ref={editInputRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white resize-none"
                rows={3}
              />
              <div className="flex justify-end mt-2 space-x-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 rounded text-white"
                >
                  Save
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Press ESC to cancel, Enter to save
              </div>
            </div>
          ) : (
            <p className="text-gray-200 break-words whitespace-pre-wrap">
              {message.decryptedContent}
            </p>
          )}
        </div>
        
        {isCurrentUser && !isEditing && (
          <div className="relative ml-2">
            <button
              onClick={toggleActions}
              className={`text-gray-400 hover:text-white ${showActions ? 'visible' : 'invisible group-hover:visible'}`}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            
            {showActions && (
              <div 
                ref={actionsRef}
                className="absolute right-0 mt-1 w-32 bg-gray-800 rounded shadow-lg z-10 border border-gray-700"
              >
                <button
                  onClick={handleEdit}
                  className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
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