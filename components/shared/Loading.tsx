import React from 'react'

interface SquareSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

/**
 * Neo-brutalism square spinner - the standard loading indicator for FounderHQ
 * Use this component for all loading states in the app
 */
export const SquareSpinner: React.FC<SquareSpinnerProps> = ({ 
  size = 'md',
  className = ''
}) => {
  const sizeConfig = {
    xs: { outer: 'w-4 h-4', inner: 'inset-0.5', outerBorder: 'border-2', innerBorder: 'border' },
    sm: { outer: 'w-6 h-6', inner: 'inset-1', outerBorder: 'border-2', innerBorder: 'border' },
    md: { outer: 'w-8 h-8', inner: 'inset-1.5', outerBorder: 'border-2', innerBorder: 'border' },
    lg: { outer: 'w-12 h-12', inner: 'inset-2', outerBorder: 'border-4', innerBorder: 'border-2' },
    xl: { outer: 'w-16 h-16', inner: 'inset-3', outerBorder: 'border-4', innerBorder: 'border-2' },
  }

  const config = sizeConfig[size]

  return (
    <div className={`relative ${config.outer} ${className}`}>
      <div 
        className={`absolute inset-0 ${config.outerBorder} border-black animate-spin`} 
        style={{ animationDuration: '1.2s' }} 
      />
      <div 
        className={`absolute ${config.inner} ${config.innerBorder} border-gray-400 animate-spin`} 
        style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} 
      />
    </div>
  )
}

interface Props {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export const LoadingSpinner: React.FC<Props> = ({ 
  message = 'Loading...', 
  size = 'md' 
}) => {
  const spinnerSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <SquareSpinner size={spinnerSize} />
      {message && (
        <p className="mt-4 text-black font-mono text-sm">{message}</p>
      )}
    </div>
  )
}

export const FullPageLoading: React.FC<Props> = ({ message = 'Loading your dashboard...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <SquareSpinner size="xl" />
        <p className="text-black font-mono">{message}</p>
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
      <div className="inline-flex items-center gap-2 text-sm text-black font-mono">
        <SquareSpinner size="xs" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 p-4">
        <SquareSpinner size="md" />
        <p className="text-sm text-black font-mono font-medium">{message}</p>
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