// components/common/Modal.tsx
import React, { useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps { 
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
  size?: 'small' | 'medium' | 'large' | 'xl';
  showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  size = 'medium',
  showCloseButton = true
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Handle sizes
  const sizes = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  
  // Close on escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);
  
  // Handle click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);
  
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
      <div 
        ref={modalRef} 
        className={`bg-gray-800 bg-opacity-95 backdrop-blur-sm rounded-xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] overflow-hidden flex flex-col border border-gray-700/50 animate-fadeIn`}
      >
        <div className="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between bg-gray-800/80">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-700/50 rounded-md transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;