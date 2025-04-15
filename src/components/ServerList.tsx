import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Hash } from 'lucide-react';

interface Server {
  id: string;
  name: string;
  icon_url: string | null;
}

export default function ServerList() {
  const [servers, setServers] = useState<Server[]>([]);
  const { serverId } = useParams();

  useEffect(() => {
    const fetchServers = async () => {
      const { data, error } = await supabase
        .from('servers')
        .select('id, name, icon_url')
        .order('name');

      if (error) {
        console.error('Error fetching servers:', error);
        return;
      }

      setServers(data || []);
    };

    fetchServers();

    // Subscribe to server changes
    const channel = supabase
      .channel('server_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'servers' 
      }, () => {
        fetchServers();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="w-20 bg-gray-800 flex flex-col items-center py-4 space-y-4">
      {servers.map((server) => (
        <Link
          key={server.id}
          to={`/server/${server.id}`}
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
          <div className="absolute left-0 transform -translate-x-full mr-4 px-2 py-1 bg-gray-900 text-white rounded hidden group-hover:block">
            {server.name}
          </div>
        </Link>
      ))}
      
      <button
        onClick={() => {/* TODO: Implement server creation */}}
        className="w-12 h-12 rounded-full bg-gray-700 hover:bg-green-600 flex items-center justify-center text-gray-200 transition-all duration-200"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}