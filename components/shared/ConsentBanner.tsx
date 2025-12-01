import React, { useState, useEffect } from 'react';
import { consentManager } from '../../lib/services/consentManager';

export const ConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    if (!consentManager.hasConsented()) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    consentManager.acceptAll();
    setIsVisible(false);
    // Reload to initialize services
    window.location.reload();
  };

  const handleDecline = () => {
    consentManager.denyAll();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm">
          <p className="font-semibold text-slate-900 mb-1">Cookie Notice</p>
          <p className="text-gray-600">
            We use cookies and telemetry to improve your experience and track errors. 
            We respect your privacy and do not sell your data.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 rounded-xl border border-gray-200 text-slate-700 hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};
