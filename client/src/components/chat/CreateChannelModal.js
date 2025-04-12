// components/chat/CreateChannelModal.js
import React, { useState } from 'react';
import Modal from '../common/Modal';
import { channelService } from '../../services/api';
import { Hash, Volume2 } from 'lucide-react';
import { toast } from 'react-toastify';

const CreateChannelModal = ({ isOpen, onClose, serverId, onCreate }) => {
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState('text');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!channelName.trim()) {
      toast.error('Please enter a channel name');
      return;
    }
    
    try {
      setLoading(true);
      const newChannel = await channelService.createChannel(channelName, serverId, channelType);
      onCreate(newChannel);
      setChannelName('');
      setChannelType('text');
      onClose();
    } catch (error) {
      console.error('Create channel error:', error);
      toast.error('Failed to create channel');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
    setChannelName('');
    setChannelType('text');
    onClose();
  };
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Create Channel"
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="channelType" className="block text-sm font-medium text-gray-400 mb-1">
            CHANNEL TYPE
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div
              className={`p-3 border rounded-md flex items-center cursor-pointer ${
                channelType === 'text'
                  ? 'bg-indigo-900 bg-opacity-30 border-indigo-500'
                  : 'bg-gray-700 border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => setChannelType('text')}
            >
              <Hash className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <div className="font-medium text-white">Text Channel</div>
                <div className="text-xs text-gray-400">Send messages, images, and files</div>
              </div>
            </div>
            <div
              className={`p-3 border rounded-md flex items-center cursor-pointer ${
                channelType === 'voice'
                  ? 'bg-indigo-900 bg-opacity-30 border-indigo-500'
                  : 'bg-gray-700 border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => setChannelType('voice')}
            >
              <Volume2 className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <div className="font-medium text-white">Voice Channel</div>
                <div className="text-xs text-gray-400">Talk with voice and video</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <label htmlFor="channelName" className="block text-sm font-medium text-gray-400 mb-1">
            CHANNEL NAME
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {channelType === 'text' ? (
                <Hash className="h-5 w-5 text-gray-400" />
              ) : (
                <Volume2 className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <input
              id="channelName"
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder={channelType === 'text' ? 'new-channel' : 'Voice Channel'}
              className="w-full pl-10 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
              required
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {channelType === 'text' 
              ? 'Use lowercase letters, numbers, and hyphens without spaces'
              : 'Give your voice channel a name, like "General" or "Gaming"'}
          </p>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !channelName.trim()}
            className={`px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 ${
              loading || !channelName.trim() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </span>
            ) : 'Create Channel'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateChannelModal;