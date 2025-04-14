// components/common/Loading.tsx
import React from 'react';
import './Loading.css';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  color?: 'indigo' | 'green' | 'red' | 'blue' | 'purple';
}

const Loading: React.FC<LoadingProps> = ({ 
  size = 'medium', 
  fullScreen = false,
  color = 'indigo'
}) => {
  const sizes = {
    small: 'h-6 w-6',
    medium: 'h-12 w-12',
    large: 'h-16 w-16',
  };

  const colors = {
    indigo: 'border-indigo-500',
    green: 'border-green-500',
    red: 'border-red-500',
    blue: 'border-blue-500',
    purple: 'border-purple-500',
  };

  const spinner = (
    <div className={`animate-spin rounded-full border-t-2 border-b-2 ${colors[color]} ${sizes[size]}`}></div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      {spinner}
    </div>
  );
};

export default Loading;