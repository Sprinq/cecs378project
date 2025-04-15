import React, { useState } from 'react';
import { X, Link, Copy, Check, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ServerInviteProps {
  serverId: string;
  serverName: string;
  onClose: () => void;
}

export default function ServerInvite({ serverId, serverName, onClose }: ServerInviteProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [expiryDuration, setExpiryDuration] = useState<string>('7d');

  const generateInviteLink = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      // Convert expiry duration to PostgreSQL interval format
      let intervalString = '';
      
      switch(expiryDuration) {
        case '1h':
          intervalString = '1 hour';
          break;
        case '24h':
          intervalString = '24 hours';
          break;
        case '7d':
          intervalString = '7 days';
          break;
        case '30d':
          intervalString = '30 days';
          break;
        case 'never':
          intervalString = '100 years'; // effectively never expires
          break;
        default:
          intervalString = '7 days';
      }

      const { data, error } = await supabase.rpc(
        'generate_server_invite',
        { 
          server_id: serverId,
          expires_in: intervalString
        }
      );

      if (error) throw error;

      setInviteCode(data);

      // Get the expiration date
      const { data: serverData } = await supabase
        .from('servers')
        .select('invite_expires_at')
        .eq('id', serverId)
        .single();

      if (serverData) {
        setExpiresAt(serverData.invite_expires_at);
      }
    } catch (err) {
      console.error("Error generating invite:", err);
      setError(err instanceof Error ? err.message : 'Failed to generate invite');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!inviteCode) return;

    const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
    
    navigator.clipboard.writeText(inviteUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy:", err);
        setError("Failed to copy to clipboard");
      });
  };

  // Format expiration date
  const formatExpiryDate = (dateString: string | null) => {
    if (!dateString) return 'Never expires';

    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Link className="h-5 w-5 mr-2" />
            Invite to {serverName}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Invite Link Expiration
            </label>
            <select
              value={expiryDuration}
              onChange={(e) => setExpiryDuration(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            >
              <option value="1h">1 hour</option>
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="never">Never expire</option>
            </select>
          </div>

          <button
            onClick={generateInviteLink}
            disabled={loading}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium flex items-center justify-center disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate New Invite Link
              </>
            )}
          </button>

          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-500 bg-opacity-10 rounded">
              {error}
            </div>
          )}

          {inviteCode && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Invite Link
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/invite/${inviteCode}`}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-md text-white focus:outline-none"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-r-md border border-gray-600"
                  title={copied ? "Copied!" : "Copy to clipboard"}
                >
                  {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Expires: {formatExpiryDate(expiresAt)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}