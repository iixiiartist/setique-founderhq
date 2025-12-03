import React from 'react';
import { SquareSpinner } from './Loading';

/**
 * Tab Loading Fallback Component
 * Displayed while lazy-loaded tab components are being fetched
 */
export const TabLoadingFallback: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <SquareSpinner size="lg" />
        <p className="text-black font-mono text-sm">Loading tab...</p>
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
      <div className="text-center max-w-md p-8 bg-white rounded-2xl border border-gray-200 shadow-lg">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold mb-2 text-slate-900">Failed to Load Tab</h3>
        <p className="text-gray-600 mb-4 text-sm">
          {error?.message || 'An error occurred while loading this section'}
        </p>
        {resetError && (
          <button
            onClick={resetError}
            className="px-6 py-2 bg-slate-900 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};
