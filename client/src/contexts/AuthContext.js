// contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/api';
import { initSocket, cleanup } from '../services/socket';
import { toast } from 'react-toastify';

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  // Initialize auth state on app load
  useEffect(() => {
    const initAuth = async () => {
      try {
        const userData = await authService.getCurrentUser();
        
        if (userData) {
          setUser(userData);
          localStorage.setItem('user_id', userData._id);
          initSocket(userData._id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear any potentially invalid auth state
        localStorage.removeItem('user_id');
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };
    
    initAuth();
    
    // Cleanup socket on unmount
    return () => {
      cleanup();
    };
  }, []);
  
  // Login function
  const login = async (username, password) => {
    try {
      const response = await authService.login(username, password);
      setUser(response.user);
      localStorage.setItem('user_id', response.user._id);
      initSocket(response.user._id);
      return response.user;
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };
  
  // Register function
  const register = async (username, email, password) => {
    try {
      const response = await authService.register(username, email, password);
      setUser(response.user);
      localStorage.setItem('user_id', response.user._id);
      initSocket(response.user._id);
      return response.user;
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };
  
  // Logout function
  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      localStorage.removeItem('user_id');
      cleanup();
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };
  
  // Context value
  const value = {
    user,
    loading,
    initialized,
    login,
    register,
    logout
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;