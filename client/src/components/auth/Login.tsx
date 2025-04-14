// components/auth/Login.tsx
import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, User, LogIn, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/api';
import { toast } from 'react-toastify';
import { AxiosError } from 'axios';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Please enter both username and password');
      return;
    }
    
    try {
      setLoading(true);
      const response = await authService.login(username, password);
      
      // Call the parent component's onLogin function with the user data
      onLogin(response.user);
      
      toast.success('Login successful!');
      navigate('/');
    } catch (error: unknown) {
      console.error('Login error:', error);
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Login failed. Please try again.');
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="w-full max-w-md bg-gray-800 bg-opacity-70 backdrop-blur-sm rounded-xl shadow-2xl p-8 border border-gray-700/50">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
            <div className="relative z-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full p-3">
              <Shield className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>
        <h2 className="text-4xl font-bold text-center text-white mb-2">
          Welcome Back
        </h2>
        <p className="text-center text-gray-400 mb-8">
          Log in to continue to SecureChat
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 px-4 py-3 bg-gray-700/70 backdrop-blur-sm border border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white transition-all duration-200"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 px-4 py-3 bg-gray-700/70 backdrop-blur-sm border border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white transition-all duration-200"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-400"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white py-3 px-4 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-indigo-500/20 hover:shadow-xl'}`}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </span>
            ) : (
              <span className="flex items-center">
                <LogIn className="h-5 w-5 mr-2" />
                Log In
              </span>
            )}
          </button>
          
          <div className="mt-4 text-center">
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center group relative">
              <span className="relative z-10">Create an account</span>
              <span className="absolute inset-0 bg-indigo-500/10 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-md"></span>
              <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </form>
        
        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-gray-400 bg-gray-800">
                End-to-End Encrypted
              </span>
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-center">
            <Lock className="h-4 w-4 text-green-400 mr-2" />
            <span className="text-sm text-gray-400">Your messages are secured with <span className="text-green-400 font-medium">AES-256</span> encryption</span>
          </div>
        </div>


      </div>
    </div>
  );
};

export default Login;

// Types for the authentication service response
export interface User {
  _id: string;
  username: string;
  email: string;
  publicKey: string;
  status: string;
}

export interface AuthResponse {
  message: string;
  user: User;
}