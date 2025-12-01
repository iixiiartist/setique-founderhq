import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

export const CheckoutSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Invalidate workspace queries to fetch updated subscription data
    queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    queryClient.invalidateQueries({ queryKey: ['subscriptions'] });

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, queryClient]);

  const sessionId = searchParams.get('session_id');

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-8 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full shadow-lg">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold font-mono text-black mb-4">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-700 mb-2">
            Your subscription has been activated.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            You now have access to all premium features.
          </p>

          {/* Session ID (for debugging) */}
          {sessionId && (
            <div className="mb-6 p-3 bg-gray-100 rounded-xl border border-gray-200 text-xs font-mono break-all">
              Session: {sessionId}
            </div>
          )}

          {/* Redirect Timer */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">
              Redirecting to dashboard in {countdown} seconds...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-1000"
                style={{ width: `${((5 - countdown) / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Manual Navigation */}
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white cursor-pointer py-3 px-8 rounded-xl font-semibold shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
          >
            Go to Dashboard Now
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            You'll receive a confirmation email from Stripe shortly.
          </p>
          <p className="mt-2">
            Need help?{' '}
            <a
              href="mailto:support@setique.com"
              className="text-blue-600 underline font-semibold"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
