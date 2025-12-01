import React from 'react';

interface SupabaseErrorFallbackProps {
  error: Error;
}

/**
 * Error fallback component for Supabase initialization failures
 * Shows user-friendly message instead of white screen
 */
export const SupabaseErrorFallback: React.FC<SupabaseErrorFallbackProps> = ({ error }) => {
  const isSupabaseConfigError = 
    error.message.includes('VITE_SUPABASE_URL') || 
    error.message.includes('VITE_SUPABASE_ANON_KEY');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-pink-600 p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-8 max-w-2xl w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🔧</div>
          <h1 className="text-3xl font-bold mb-2">Configuration Error</h1>
        </div>

        {isSupabaseConfigError ? (
          <div className="space-y-4">
            <div className="bg-red-100 rounded-xl border border-red-200 p-4">
              <p className="font-mono text-sm text-red-900 whitespace-pre-wrap">
                {error.message}
              </p>
            </div>

            <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
              <h3 className="font-bold mb-2">🔍 For Developers:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Copy <code className="bg-white px-2 py-1 rounded-md border border-gray-200">.env.example</code> to <code className="bg-white px-2 py-1 rounded-md border border-gray-200">.env</code></li>
                <li>Add your Supabase project URL and anon key</li>
                <li>Restart the development server</li>
              </ol>
            </div>

            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <h3 className="font-bold mb-2">📚 Need Help?</h3>
              <p className="text-sm mb-2">
                Check the <strong>README.md</strong> for setup instructions
              </p>
              <p className="text-sm">
                Or visit <a 
                  href="https://supabase.com/docs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 underline font-bold"
                >
                  Supabase Documentation
                </a>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-100 rounded-xl border border-red-200 p-4">
              <p className="font-mono text-sm text-red-900">
                {error.message || 'An unexpected error occurred'}
              </p>
            </div>

            <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
              <h3 className="font-bold mb-2">What can I do?</h3>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>Refresh the page</li>
                <li>Check your internet connection</li>
                <li>Clear your browser cache</li>
                <li>Contact support if the problem persists</li>
              </ul>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white rounded-xl border border-blue-700 p-4 font-bold text-lg shadow-sm hover:shadow-md hover:bg-blue-700 transition-all"
            >
              Refresh Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
