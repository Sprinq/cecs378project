// components/common/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * PrivateRoute component to protect routes that require authentication
 * Redirects to login page if the user is not authenticated
 * 
 * @param {Object} props - Component props
 * @param {Object} props.user - The current user object
 * @param {React.ReactNode} props.children - The protected route's component
 * @returns {React.ReactNode} - Either the protected component or a redirect
 */
const PrivateRoute = ({ user, children }) => {
  // If there's no authenticated user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the protected component
  return children;
};

export default PrivateRoute;