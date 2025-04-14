// components/chat/CreateServerModal.tsx
import React, { useState, FormEvent } from 'react';
import Modal from '../common/Modal';
import { serverService } from '../../services/api';
import { Shield, X, Upload, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { Server } from '../../types';
import './CreateServerModal.css';

interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (newServer: Server) => void;
}

const CreateServerModal: React.FC<CreateServerModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [serverName, setServerName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
      size="medium"
    >
      <div className="flex flex-col items-center">
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full"></div>
          <div className="relative z-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full p-4">
            <Shield className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-white mb-3">
          Create Your Server
        </h2>
        <p className="text-gray-300 text-center mb-6 max-w-md">
          Your server is where you and your friends hang out.
          Make yours and start talking in end-to-end encrypted channels.
        </p>
        
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <div className="mb-6">
            <label htmlFor="serverName" className="block text-sm font-medium text-gray-400 mb-2">
              SERVER NAME
            </label>
            <div className="relative">
              <input
                id="serverName"
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="e.g. Gaming Lounge"
                className="w-full px-4 py-3 bg-gray-700/80 border border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white transition-all duration-200"
                required
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              SERVER ICON (OPTIONAL)
            </label>
            <div className="flex items-center justify-center w-full">
              <label htmlFor="serverIcon" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600/50 rounded-lg cursor-pointer bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-400">
                    <span className="font-medium">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    SVG, PNG, JPG (MAX. 2MB)
                  </p>
                </div>
                <input 
                  id="serverIcon" 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  disabled={true} // Disabled for now as we're not implementing file upload
                />
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              An icon helps people recognize your server in the sidebar
            </p>
          </div>
          
          <div className="flex justify-end space-x-3 mt-8">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-300 hover:text-white flex items-center transition-colors"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !serverName.trim()}
              className={`px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 flex items-center ${
                loading || !serverName.trim() ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-indigo-500/20'
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
              ) : (
                <span className="flex items-center">
                  <Check className="h-4 w-4 mr-2" />
                  Create Server
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateServerModal;