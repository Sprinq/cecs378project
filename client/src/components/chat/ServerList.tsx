// components/chat/ServerList.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, LogOut } from 'lucide-react';
import { Server } from '../../types';
import './ServerList.css';

interface ServerListProps {
  servers: Server[];
  activeServerId?: string;
  setShowCreateServerModal: (show: boolean) => void;
  mobileMenuOpen: boolean;
  onLogout: () => Promise<void>;
}

const ServerList: React.FC<ServerListProps> = ({ 
  servers, 
  activeServerId, 
  setShowCreateServerModal, 
  mobileMenuOpen,
  onLogout
}) => {
  // Get the first letter of the server name for display
  const getServerInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className={`bg-gray-900 w-20 flex-shrink-0 flex flex-col items-center py-6 border-r border-gray-800/50 ${
      mobileMenuOpen ? 'block absolute inset-y-0 left-0 z-40' : 'hidden md:flex'
    }`}>
      <div className="space-y-4 flex flex-col items-center">
        {servers.map(server => (
          <Link
            key={server._id}
            to={`/server/${server._id}`}
            className={`group relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              activeServerId === server._id
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
            title={typeof server.name === 'string' ? server.name : ''}
          >
            <span className="absolute -left-[3px] h-2/5 w-1 bg-white rounded-r-full transform scale-y-0 group-hover:scale-y-100 transition-transform origin-left ease-in-out duration-200 
              ${activeServerId === server._id ? 'scale-y-100' : ''}"></span>
            
            {server.icon ? (
              <img 
                src={server.icon} 
                alt={typeof server.name === 'string' ? server.name : 'Server'} 
                className="w-7 h-7 object-cover rounded-full" 
              />
            ) : (
              <span className="text-lg font-semibold">
                {typeof server.name === 'string' ? getServerInitial(server.name) : '?'}
              </span>
            )}
          </Link>
        ))}

        <button
          onClick={() => setShowCreateServerModal(true)}
          className="group relative w-12 h-12 rounded-full flex items-center justify-center bg-gray-800 text-gray-400 hover:bg-indigo-500/20 hover:text-indigo-400 transition-all duration-200"
          title="Create Server"
        >
          <Plus className="h-6 w-6 transform group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>
      
      <div className="mt-auto">
        <button 
          className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-800 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200"
          onClick={onLogout}
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default ServerList;