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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black p-4 shadow-[0_-4px_0_rgba(0,0,0,0.1)] z-50 font-mono">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm">
          <p className="font-bold mb-1">COOKIE NOTICE</p>
          <p>
            We use cookies and telemetry to improve your experience and track errors. 
            We respect your privacy and do not sell your data.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 border-2 border-black text-black hover:bg-gray-100 transition-colors text-sm font-bold"
          >
            DECLINE
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-black text-white border-2 border-black hover:bg-gray-800 transition-colors text-sm font-bold shadow-[2px_2px_0_#000]"
          >
            ACCEPT ALL
          </button>
        </div>
      </div>
    </div>
  );
};
