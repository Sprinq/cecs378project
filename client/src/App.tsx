// src/App.tsx - Main React application
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Chat from './components/chat/Chat';
import PrivateRoute from './components/common/PrivateRoute';
import { authService } from './services/api';
import { initSocket, cleanup } from './services/socket';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { User } from './types';
import './styles/main.css';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check if user is logged in on app load
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);
        
        // Initialize WebSocket connection
        if (userData) {
          initSocket(userData._id);
          localStorage.setItem('user_id', userData._id);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, []);

  // Handle login
  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user_id', userData._id);
    initSocket(userData._id);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.logout();
      setUser(null);
      localStorage.removeItem('user_id');
      cleanup();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="h-screen bg-gradient-to-b from-gray-900 to-gray-800">
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
        
        <Routes>
          <Route path="/login" element={
            user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
          } />
          
          <Route path="/register" element={
            user ? <Navigate to="/" /> : <Register onRegister={handleLogin} />
          } />
          
          <Route path="/" element={
            <PrivateRoute user={user}>
              <Chat user={user} onLogout={handleLogout} />
            </PrivateRoute>
          } />
          
          <Route path="/server/:serverId" element={
            <PrivateRoute user={user}>
              <Chat user={user} onLogout={handleLogout} />
            </PrivateRoute>
          } />
          
          <Route path="/server/:serverId/channel/:channelId" element={
            <PrivateRoute user={user}>
              <Chat user={user} onLogout={handleLogout} />
            </PrivateRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;