import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, AlertCircle, RefreshCw } from 'lucide-react';
import CreateServer from './CreateServer';
import { useAuthStore } from '../stores/authStore';

interface Server {
  id: string;
  name: string;
  icon_url: string | null;
}

export default function ServerList() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { serverId } = useParams();
  const [showCreateServer, setShowCreateServer] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const fetchServers = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simply fetch all servers - we'll rely on RLS policies for security
      const { data, error } = await supabase
        .rpc('get_user_servers')
        .select('*');

      if (error) {
        // If RPC isn't available yet, fall back to direct query
        const { data: directData, error: directError } = await supabase
          .from('servers')
          .select('*');
          
        if (directError) {
          throw directError;
        }
        
        setServers(directData || []);
      } else {
        setServers(data || []);
      }
    } catch (err) {
      console.error('Error fetching servers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load servers');
      
      // Fallback - just show an empty list
      setServers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchServers();
    }
  }, [session]);

  const handleCreateServerSuccess = (newServerId: string) => {
    setShowCreateServer(false);
    setTimeout(() => {
      fetchServers();
      navigate(`/dashboard/server/${newServerId}`);
    }, 500); // Small delay to allow database to update
  };

  return (
    <div className="w-20 bg-gray-800 flex flex-col items-center py-4 space-y-4">
      {error && (
        <div className="bg-red-500 bg-opacity-20 p-2 rounded-full cursor-pointer group relative" onClick={fetchServers}>
          <AlertCircle className="h-6 w-6 text-red-400" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white rounded hidden group-hover:block w-48 z-10">
            {error} (Click to retry)
          </div>
        </div>
      )}
      
      {loading && servers.length === 0 ? (
        <div className="animate-spin">
          <RefreshCw className="h-6 w-6 text-gray-400" />
        </div>
      ) : (
        <>
          {servers.map((server) => (
            <Link
              key={server.id}
              to={`/dashboard/server/${server.id}`}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 group relative
                ${serverId === server.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-blue-600'}`}
            >
              {server.icon_url ? (
                <img
                  src={server.icon_url}
                  alt={server.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="text-gray-200 font-semibold">
                  {server.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white rounded hidden group-hover:block whitespace-nowrap z-10">
                {server.name}
              </div>
            </Link>
          ))}
          
          <button
            onClick={() => setShowCreateServer(true)}
            className="w-12 h-12 rounded-full bg-gray-700 hover:bg-green-600 flex items-center justify-center text-gray-200 transition-all duration-200 group relative"
          >
            <Plus size={24} />
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white rounded hidden group-hover:block whitespace-nowrap z-10">
              Create Server
            </div>
          </button>
        </>
      )}
      
      {showCreateServer && (
        <CreateServer 
          onClose={() => setShowCreateServer(false)} 
          onSuccess={handleCreateServerSuccess}
        />
      )}
    </div>
  );
}