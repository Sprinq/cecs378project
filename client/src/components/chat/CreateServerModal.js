// components/chat/CreateServerModal.js
import React, { useState } from 'react';
import Modal from '../common/Modal';
import { serverService } from '../../services/api';
import { Shield } from 'lucide-react';
import { toast } from 'react-toastify';

const CreateServerModal = ({ isOpen, onClose, onCreate }) => {
  const [serverName, setServerName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!serverName.trim()) {
      toast.error('Please enter a server name');
      return;
    }
    
    try {
      setLoading(true);
      const newServer = await serverService.createServer(serverName);
      onCreate(newServer);
      setServerName('');
      onClose();
    } catch (error) {
      console.error('Create server error:', error);
      toast.error('Failed to create server');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
    setServerName('');
    onClose();
  };
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Create a Server"
    >
      <div className="flex flex-col items-center">
        <Shield className="w-16 h-16 text-indigo-500 mb-4" />
        <h2 className="text-xl font-bold text-center text-white mb-4">
          Create Your Server
        </h2>
        <p className="text-gray-400 text-center mb-6">
          Your server is where you and your friends hang out.
          Make yours and start talking.
        </p>
        
        <form onSubmit={handleSubmit} className="w-full">
          <div className="mb-4">
            <label htmlFor="serverName" className="block text-sm font-medium text-gray-400 mb-1">
              SERVER NAME
            </label>
            <input
              id="serverName"
              type="text"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="e.g. Gaming Lounge"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
              required
            />
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
              disabled={loading || !serverName.trim()}
              className={`px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 ${
                loading || !serverName.trim() ? 'opacity-50 cursor-not-allowed' : ''
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
              ) : 'Create Server'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateServerModal;