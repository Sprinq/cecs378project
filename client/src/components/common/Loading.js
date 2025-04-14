// components/common/Loading.js
import React from 'react';

const Loading = ({ size = 'medium', fullScreen = false }) => {
  const sizes = {
    small: 'h-6 w-6',
    medium: 'h-12 w-12',
    large: 'h-16 w-16',
  };

  const spinner = (
    <div className={`animate-spin rounded-full border-t-2 border-b-2 border-indigo-500 ${sizes[size]}`}></div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-50">
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