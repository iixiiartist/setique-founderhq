import React from 'react';

/**
 * Tab Loading Fallback Component
 * Displayed while lazy-loaded tab components are being fetched
 */
export const TabLoadingFallback: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent mb-4" />
        <p className="text-gray-600 font-mono text-sm">Loading tab...</p>
      </div>
    </div>
  );
};

/**
 * Tab Error Boundary Fallback
 * Displayed when a lazy-loaded tab fails to load
 */
export const TabErrorFallback: React.FC<{ error?: Error; resetError?: () => void }> = ({ 
  error, 
  resetError 
}) => {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center max-w-md p-8 bg-red-50 border-2 border-red-300 rounded-lg">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold mb-2 text-red-800">Failed to Load Tab</h3>
        <p className="text-red-600 mb-4 text-sm">
          {error?.message || 'An error occurred while loading this section'}
        </p>
        {resetError && (
          <button
            onClick={resetError}
            className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};
