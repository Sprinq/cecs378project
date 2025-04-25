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
  
  // Expiration options
  const [expiryDuration, setExpiryDuration] = useState<string>('7d');
  const [useCustomExpiry, setUseCustomExpiry] = useState(false);
  const [customExpiryValue, setCustomExpiryValue] = useState<number>(7);
  const [customExpiryUnit, setCustomExpiryUnit] = useState<string>('days');
  
  // Additional invite options
  const [hideHistory, setHideHistory] = useState(false);
  const [temporaryAccess, setTemporaryAccess] = useState(false);
  
  // Temporary access options
  const [temporaryDuration, setTemporaryDuration] = useState<string>('24h');
  const [useCustomTemporary, setUseCustomTemporary] = useState(false);
  const [customTempValue, setCustomTempValue] = useState<number>(24);
  const [customTempUnit, setCustomTempUnit] = useState<string>('hours');
  
  const [maxUses, setMaxUses] = useState<number | null>(null);

  const generateInviteLink = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      // Determine expiration interval string
      let intervalString = '';
      
      if (useCustomExpiry) {
        if (!customExpiryValue || customExpiryValue <= 0) {
          throw new Error('Please enter a valid expiration duration');
        }
        intervalString = `${customExpiryValue} ${customExpiryUnit}`;
      } else {
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
      }
      
      // Determine temporary access duration
      let tempIntervalString = '';
      
      if (temporaryAccess) {
        if (useCustomTemporary) {
          if (!customTempValue || customTempValue <= 0) {
            throw new Error('Please enter a valid temporary access duration');
          }
          tempIntervalString = `${customTempValue} ${customTempUnit}`;
        } else {
          switch(temporaryDuration) {
            case '1h':
              tempIntervalString = '1 hour';
              break;
            case '24h':
              tempIntervalString = '24 hours';
              break;
            case '7d':
              tempIntervalString = '7 days';
              break;
            case '30d':
              tempIntervalString = '30 days';
              break;
            default:
              tempIntervalString = '24 hours';
          }
        }
      }

      const { data, error } = await supabase.rpc(
        'generate_server_invite_with_options',
        { 
          server_id: serverId,
          expires_in: intervalString,
          hide_history: hideHistory,
          temporary_access: temporaryAccess,
          temporary_duration: temporaryAccess ? tempIntervalString : null,
          max_uses: maxUses
        }
      );

      if (error) throw error;

      setInviteCode(data);

      // Get the expiration date
      const { data: serverData } = await supabase
        .from('server_invites')
        .select('expires_at')
        .eq('code', data)
        .single();

      if (serverData) {
        setExpiresAt(serverData.expires_at);
      }
    } catch (err) {
      console.error("Error generating invite:", err);
      
      // Fall back to old RPC if the new one doesn't exist yet
      try {
        const { data, error: oldError } = await supabase.rpc(
          'generate_server_invite',
          { 
            server_id: serverId,
            expires_in: useCustomExpiry 
              ? `${customExpiryValue} ${customExpiryUnit}`
              : expiryDuration === 'never' ? '100 years' : expiryDuration === '1h' ? '1 hour' : expiryDuration === '24h' ? '24 hours' : expiryDuration
          }
        );
        
        if (oldError) throw oldError;
        
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
      } catch (fallbackErr) {
        setError(fallbackErr instanceof Error ? fallbackErr.message : 'Failed to generate invite');
      }
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

  // Format duration for display
  const formatDuration = (value: number, unit: string): string => {
    if (value === 1) {
      // Handle singular form (remove trailing 's')
      return `${value} ${unit.endsWith('s') ? unit.slice(0, -1) : unit}`;
    }
    return `${value} ${unit}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-lg max-h-[90vh] overflow-y-auto">
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
          {/* Invite expiration options */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Invite Link Expiration
            </label>
            
            <div className="flex items-center mb-2">
              <input
                type="radio"
                id="presetExpiry"
                checked={!useCustomExpiry}
                onChange={() => setUseCustomExpiry(false)}
                className="h-4 w-4 mr-2"
              />
              <label htmlFor="presetExpiry" className="text-sm text-gray-300">
                Preset durations
              </label>
              
              <input
                type="radio"
                id="customExpiry"
                checked={useCustomExpiry}
                onChange={() => setUseCustomExpiry(true)}
                className="h-4 w-4 ml-4 mr-2"
              />
              <label htmlFor="customExpiry" className="text-sm text-gray-300">
                Custom duration
              </label>
            </div>
            
            {!useCustomExpiry ? (
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
            ) : (
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="1"
                  value={customExpiryValue}
                  onChange={(e) => setCustomExpiryValue(parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                />
                <select
                  value={customExpiryUnit}
                  onChange={(e) => setCustomExpiryUnit(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-gray-700 rounded-md space-y-3">
            <h3 className="text-sm font-medium text-white">Advanced Options</h3>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="hideHistory"
                checked={hideHistory}
                onChange={(e) => setHideHistory(e.target.checked)}
                className="h-4 w-4 bg-gray-600 border-gray-500 rounded focus:ring-indigo-500 focus:ring-offset-gray-800"
              />
              <label htmlFor="hideHistory" className="ml-2 text-sm text-gray-300">
                Hide message history for new members
              </label>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="temporaryAccess"
                  checked={temporaryAccess}
                  onChange={(e) => setTemporaryAccess(e.target.checked)}
                  className="h-4 w-4 bg-gray-600 border-gray-500 rounded focus:ring-indigo-500 focus:ring-offset-gray-800"
                />
                <label htmlFor="temporaryAccess" className="ml-2 text-sm text-gray-300">
                  Temporary membership
                </label>
              </div>
              
              {temporaryAccess && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="presetTemp"
                      checked={!useCustomTemporary}
                      onChange={() => setUseCustomTemporary(false)}
                      className="h-4 w-4 mr-2"
                    />
                    <label htmlFor="presetTemp" className="text-xs text-gray-300">
                      Preset
                    </label>
                    
                    <input
                      type="radio"
                      id="customTemp"
                      checked={useCustomTemporary}
                      onChange={() => setUseCustomTemporary(true)}
                      className="h-4 w-4 ml-4 mr-2"
                    />
                    <label htmlFor="customTemp" className="text-xs text-gray-300">
                      Custom
                    </label>
                  </div>
                
                  {!useCustomTemporary ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Kick after
                      </label>
                      <select
                        value={temporaryDuration}
                        onChange={(e) => setTemporaryDuration(e.target.value)}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="1h">1 hour</option>
                        <option value="24h">24 hours</option>
                        <option value="7d">7 days</option>
                        <option value="30d">30 days</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Kick after
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          min="1"
                          value={customTempValue}
                          onChange={(e) => setCustomTempValue(parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <select
                          value={customTempUnit}
                          onChange={(e) => setCustomTempUnit(e.target.value)}
                          className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <label htmlFor="maxUses" className="block text-sm text-gray-300">
                Max uses (leave empty for unlimited)
              </label>
              <input
                id="maxUses"
                type="number"
                min="1"
                value={maxUses || ''}
                onChange={(e) => setMaxUses(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Unlimited"
              />
            </div>
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
              <div className="mt-2 text-xs text-gray-400 space-y-1">
                <p>Expires: {formatExpiryDate(expiresAt)}</p>
                {hideHistory && (
                  <p className="flex items-center">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full mr-1"></span>
                    New members won't see message history
                  </p>
                )}
                {temporaryAccess && (
                  <p className="flex items-center">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full mr-1"></span>
                    Members will be removed after {useCustomTemporary 
                      ? formatDuration(customTempValue, customTempUnit)
                      : temporaryDuration}
                  </p>
                )}
                {maxUses && (
                  <p className="flex items-center">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full mr-1"></span>
                    Limited to {maxUses} uses
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}