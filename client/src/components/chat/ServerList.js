// components/chat/ServerList.js
import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, LogOut } from 'lucide-react';

const ServerList = ({ 
  servers, 
  activeServerId, 
  setShowCreateServerModal, 
  mobileMenuOpen,
  onLogout
}) => {
  // Get the first letter of the server name for display
  const getServerInitial = (name) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className={`bg-gray-900 w-16 flex-shrink-0 flex flex-col items-center py-4 border-r border-gray-800 ${
      mobileMenuOpen ? 'block absolute inset-y-0 left-0 z-40' : 'hidden md:flex'
    }`}>
      {servers.map(server => (
        <Link
          key={server._id}
          to={`/server/${server._id}`}
          className={`w-10 h-10 rounded-full mb-2 flex items-center justify-center hover:rounded-xl transition-all duration-200 ${
            activeServerId === server._id
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
          title={server.name}
        >
          {server.icon ? (
            <img 
              src={server.icon} 
              alt={server.name} 
              className="w-6 h-6 object-cover rounded-full" 
            />
          ) : (
            getServerInitial(server.name)
          )}
        </Link>
      ))}

      <button
        onClick={() => setShowCreateServerModal(true)}
        className="w-10 h-10 rounded-full mb-2 flex items-center justify-center bg-gray-800 text-gray-400 hover:bg-gray-700 hover:rounded-xl transition-all duration-200"
        title="Create Server"
      >
        <Plus className="h-5 w-5" />
      </button>
      
      <div className="mt-auto">
        <button 
          className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-800 text-gray-400 hover:bg-gray-700 hover:rounded-xl transition-all duration-200"
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