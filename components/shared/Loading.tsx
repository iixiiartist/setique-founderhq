import React from 'react'

interface Props {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export const LoadingSpinner: React.FC<Props> = ({ 
  message = 'Loading...', 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}></div>
      {message && (
        <p className="mt-4 text-gray-600 text-sm">{message}</p>
      )}
    </div>
  )
}

export const FullPageLoading: React.FC<Props> = ({ message = 'Loading your dashboard...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  )
}

interface OperationOverlayProps {
  isVisible: boolean;
  message?: string;
  /** If true, uses a subtle inline indicator instead of full overlay */
  inline?: boolean;
}

/**
 * Loading overlay for operations (save, delete, etc.)
 * Can be used as a full overlay or inline indicator
 */
export const OperationOverlay: React.FC<OperationOverlayProps> = ({
  isVisible,
  message = 'Processing...',
  inline = false,
}) => {
  if (!isVisible) return null;

  if (inline) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-gray-500">
        <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
      <div className="flex flex-col items-center gap-3 p-4">
        <div className="w-8 h-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <p className="text-sm text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
};

interface OperationStatusProps {
  isSaving?: boolean;
  isDeleting?: boolean;
  isLoading?: boolean;
  saveMessage?: string;
  deleteMessage?: string;
  loadMessage?: string;
}

/**
 * Convenience component that shows appropriate overlay based on operation state
 */
export const OperationStatus: React.FC<OperationStatusProps> = ({
  isSaving = false,
  isDeleting = false,
  isLoading = false,
  saveMessage = 'Saving...',
  deleteMessage = 'Deleting...',
  loadMessage = 'Loading...',
}) => {
  if (isSaving) {
    return <OperationOverlay isVisible message={saveMessage} />;
  }
  if (isDeleting) {
    return <OperationOverlay isVisible message={deleteMessage} />;
  }
  if (isLoading) {
    return <OperationOverlay isVisible message={loadMessage} />;
  }
  return null;
};