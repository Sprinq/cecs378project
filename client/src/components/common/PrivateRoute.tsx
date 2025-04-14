// components/common/PrivateRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { User } from '../../types';

interface PrivateRouteProps {
  user: User | null;
  children: React.ReactNode;
}

/**
 * PrivateRoute component to protect routes that require authentication
 * Redirects to login page if the user is not authenticated
 * 
 * @param {PrivateRouteProps} props - Component props
 * @returns {React.ReactNode} - Either the protected component or a redirect
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({ user, children }) => {
  // If there's no authenticated user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the protected component
  return <>{children}</>;
};

export default PrivateRoute;