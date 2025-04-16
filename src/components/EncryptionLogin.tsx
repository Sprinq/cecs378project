import React, { useState } from 'react';
import { Shield, Lock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface EncryptionLoginProps {
  onUnlock: (password: string) => Promise<boolean>;
}

export default function EncryptionLogin({ onUnlock }: EncryptionLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { session } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const success = await onUnlock(password);
      if (!success) {
        setError('Incorrect encryption password. Please try again.');
      }
    } catch (err) {
      console.error('Error unlocking encryption:', err);
      setError('An error occurred while unlocking encryption');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-6 shadow-lg">
      <div className="flex flex-col items-center justify-center mb-6">
        <Shield className="h-12 w-12 text-indigo-500 mb-4" />
        <h2 className="text-xl font-semibold text-white text-center">Unlock Encryption</h2>
        <p className="text-gray-400 text-center mt-2">
          Enter your encryption password to access your messages
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="encryption-password" className="block text-sm font-medium text-gray-300 mb-1">
            Encryption Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-500" />
            </div>
            <input
              id="encryption-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your encryption password"
              required
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-900 bg-opacity-20 text-red-500 p-3 rounded-md border border-red-900 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-indigo-900 bg-opacity-20 text-indigo-300 p-3 rounded-md border border-indigo-900 text-sm">
          <p>
            This password is different from your account password and is used to protect your encrypted messages.
            If you've forgotten this password, you'll need to reset your encryption keys.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Unlocking...' : 'Unlock Messages'}
        </button>
      </form>
    </div>
  );
}