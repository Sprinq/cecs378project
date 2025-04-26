import React, { useEffect, useState } from 'react';
import { X, Link, Copy, Trash, RefreshCw, Clock, Eye, Users, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

interface Invite {
  id: string;
  code: string;
  created_at: string;
  expires_at: string | null;
  uses: number;
  max_uses: number | null;
  hide_history: boolean;
  temporary_access: boolean;
  temporary_duration: string | null;
  raw_temporary_duration?: string | null;
  raw_expiry_duration?: string | null;
  creator: {
    username: string;
    display_name: string | null;
  } | null;
}

interface ManageInvitesProps {
  serverId: string;
  onClose: () => void;
  onCreateNewInvite: () => void;
}

export default function ManageInvites({ serverId, onClose, onCreateNewInvite }: ManageInvitesProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { session } = useAuthStore();

  useEffect(() => {
    fetchInvites();
  }, [serverId]);

  const fetchInvites = async () => {
    if (!serverId || !session?.user) return;
    
    setLoading(true);
    setError(null);

    try {
      // Fetch invites from the server_invites table
      const { data, error } = await supabase
        .from('server_invites')
        .select(`
          id,
          code,
          created_at,
          expires_at,
          uses,
          max_uses,
          hide_history,
          temporary_access,
          temporary_duration,
          raw_temporary_duration,
          raw_expiry_duration,
          creator:creator_id(username, display_name)
        `)
        .eq('server_id', serverId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Also fetch the legacy invite if it exists
      const { data: serverData } = await supabase
        .from('servers')
        .select('invite_code, invite_expires_at')
        .eq('id', serverId)
        .single();
        
      // Combine the invites
      let allInvites: Invite[] = data || [];
      
      // Add the legacy invite if it exists and is not already in the list
      if (serverData?.invite_code && !allInvites.some(invite => invite.code === serverData.invite_code)) {
        allInvites.push({
          id: 'legacy',
          code: serverData.invite_code,
          created_at: new Date().toISOString(), // We don't know when it was created
          expires_at: serverData.invite_expires_at,
          uses: 0, // We don't track uses for legacy invites
          max_uses: null,
          hide_history: false,
          temporary_access: false,
          temporary_duration: null,
          creator: null
        });
      }
      
      setInvites(allInvites);
    } catch (err) {
      console.error("Error fetching invites:", err);
      setError(err instanceof Error ? err.message : 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = (code: string) => {
    const inviteUrl = `${window.location.origin}/invite/${code}`;
    
    navigator.clipboard.writeText(inviteUrl)
      .then(() => {
        setCopied(code);
        setTimeout(() => setCopied(null), 2000);
      })
      .catch(err => {
        console.error("Failed to copy:", err);
        setError("Failed to copy to clipboard");
      });
  };

  const deleteInvite = async (id: string, code: string) => {
    if (!serverId || !session?.user || id === 'legacy') return;
    
    try {
      const { error } = await supabase
        .from('server_invites')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Remove from the UI
      setInvites(prev => prev.filter(invite => invite.id !== id));
    } catch (err) {
      console.error("Error deleting invite:", err);
      setError(err instanceof Error ? err.message : 'Failed to delete invite');
    }
  };

  // Format timestamp
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format duration for display
  const formatDuration = (duration: string | null, rawDuration?: string | null) => {
    if (!duration && !rawDuration) return '';
    
    // Prefer raw duration if available
    if (rawDuration) {
      return rawDuration;
    }
    
    // Handle preset formats
    if (duration === '1h') return '1 hour';
    if (duration === '24h') return '24 hours';
    if (duration === '7d') return '7 days';
    if (duration === '30d') return '30 days';
    
    // For custom durations stored in PostgreSQL format
    // Extract and format raw duration values from the database
    // Example: "3 days", "45 minutes", "2 hours"
    
    // Handle potential pluralization
    if (duration?.includes('1 ')) {
      // Singular cases like "1 day", "1 hour", etc.
      return duration;
    }
    
    return duration;
  };

  // Check if an invite is expired
  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-3xl p-6 shadow-lg h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Link className="h-5 w-5 mr-2" />
            Manage Server Invites
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 text-red-500 text-sm p-2 bg-red-500 bg-opacity-10 rounded flex items-center">
            <span>{error}</span>
            <button 
              onClick={fetchInvites}
              className="ml-2 bg-gray-700 p-1 rounded hover:bg-gray-600"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-400 text-sm">
            {invites.length} active {invites.length === 1 ? 'invite' : 'invites'}
          </p>
          <button
            onClick={onCreateNewInvite}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium"
          >
            Create New Invite
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
            </div>
          ) : invites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Link className="h-12 w-12 mb-4 text-gray-500" />
              <p className="mb-2">No active invites</p>
              <button
                onClick={onCreateNewInvite}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium mt-2"
              >
                Create First Invite
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {invites.map(invite => (
                <div 
                  key={invite.id}
                  className={`bg-gray-700 rounded-md p-4 ${
                    isExpired(invite.expires_at) ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center">
                      <span className="font-mono text-indigo-300 text-sm">
                        {invite.code}
                      </span>
                      <button
                        onClick={() => copyInviteLink(invite.code)}
                        className="ml-2 text-gray-400 hover:text-white p-1"
                        title="Copy invite link"
                      >
                        {copied === invite.code ? (
                          <span className="text-green-500 text-xs">Copied!</span>
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {invite.id !== 'legacy' && (
                      <button
                        onClick={() => deleteInvite(invite.id, invite.code)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Delete invite"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center text-gray-300">
                      <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                      <span>Created: {formatDate(invite.created_at)}</span>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <Clock className="h-4 w-4 mr-1 text-gray-400" />
                      <span>Expires: {formatDate(invite.expires_at)}</span>
                    </div>
                    
                    {invite.id !== 'legacy' && (
                      <>
                        <div className="flex items-center text-gray-300">
                          <Users className="h-4 w-4 mr-1 text-gray-400" />
                          <span>
                            Uses: {invite.uses}{invite.max_uses ? `/${invite.max_uses}` : ''}
                          </span>
                        </div>
                        
                        <div className="flex items-start text-gray-300">
                          <div className="flex flex-wrap items-center gap-2">
                            {invite.hide_history && (
                              <span className="bg-gray-600 text-xs px-2 py-0.5 rounded-full flex items-center">
                                <Eye className="h-3 w-3 mr-1" />
                                Hidden history
                              </span>
                            )}
                            {invite.temporary_access && (
                              <span className="bg-gray-600 text-xs px-2 py-0.5 rounded-full flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Temp ({formatDuration(invite.temporary_duration, invite.raw_temporary_duration)})
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}