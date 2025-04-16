import React, { useState } from 'react';
import { Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { generateKeyPair, exportKey, savePrivateKey } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

interface EncryptionSetupProps {
  onComplete: () => void;
}

export default function EncryptionSetup({ onComplete }: EncryptionSetupProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  const { session } = useAuthStore();

  // Check password strength
  const checkPasswordStrength = (pass: string) => {
    if (pass.length < 8) {
      setStrength('weak');
      return;
    }
    
    // Check for variety of characters
    const hasLower = /[a-z]/.test(pass);
    const hasUpper = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);
    
    const score = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (score <= 2) setStrength('weak');
    else if (score === 3) setStrength('medium');
    else setStrength('strong');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    checkPasswordStrength(newPassword);
  };

  const setupEncryption = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user) {
      setError('You must be logged in to set up encryption');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (strength === 'weak') {
      setError('Please use a stronger password for better security');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Generate a new key pair
      const keyPair = await generateKeyPair();
      
      // Export the public key for storage in the database
      const publicKeyString = await exportKey(keyPair.publicKey);
      
      // Store the public key in the database
      const { error: dbError } = await supabase
        .from('user_keys')
        .upsert({
          user_id: session.user.id,
          public_key: publicKeyString,
          created_at: new Date().toISOString()
        });
      
      if (dbError) {
        throw new Error(`Failed to store public key: ${dbError.message}`);
      }
      
      // Encrypt and store the private key locally
      await savePrivateKey(keyPair.privateKey, password);
      
      // Success! Let the parent component know we're done
      onComplete();
    } catch (err) {
      console.error('Encryption setup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to set up encryption');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-center mb-4">
        <div className="bg-indigo-600 p-3 rounded-full">
          <Lock className="h-8 w-8 text-white" />
        </div>
      </div>
      
      <h2 className="text-xl font-semibold text-white text-center mb-2">Set Up Message Encryption</h2>
      <p className="text-gray-400 text-center mb-6">
        Create a password to encrypt your private key. This password is separate from your account password and will be used to protect your messages.
      </p>
      
      <form onSubmit={setupEncryption}>
        <div className="space-y-4">
          <div>
            <label htmlFor="encryption-password" className="block text-sm font-medium text-gray-300 mb-1">
              Encryption Password
            </label>
            <input
              id="encryption-password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Create a strong password"
              required
              minLength={8}
            />
            
            {/* Password strength indicator */}
            {password && (
              <div className="mt-2">
                <div className="flex items-center mb-1">
                  <span className="text-xs font-medium text-gray-400 mr-2">Strength:</span>
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        strength === 'weak' ? 'bg-red-500 w-1/3' : 
                        strength === 'medium' ? 'bg-yellow-500 w-2/3' : 
                        'bg-green-500 w-full'
                      }`}
                    ></div>
                  </div>
                  <span className="ml-2 text-xs font-medium capitalize text-gray-400">
                    {strength}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Use at least 8 characters with a mix of letters, numbers, and symbols
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                confirmPassword && password !== confirmPassword ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Confirm your password"
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
            )}
          </div>
          
          <div className="bg-indigo-900 bg-opacity-30 p-3 rounded-md border border-indigo-800">
            <div className="flex items-start text-xs text-indigo-300">
              <AlertTriangle className="h-4 w-4 text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Important:</strong> This password will be used to encrypt your private key. 
                If you forget this password, you will not be able to recover your encrypted messages. 
                We cannot reset this password for you.
              </p>
            </div>
          </div>
          
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-500 bg-opacity-10 rounded">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading || password !== confirmPassword || password.length < 8}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting Up Encryption...' : 'Set Up Encryption'}
          </button>
        </div>
      </form>
    </div>
  );
}