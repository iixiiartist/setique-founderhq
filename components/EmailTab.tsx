import React from 'react';
import { EmailInbox } from './email/EmailInbox';

export const EmailTab: React.FC = () => {
  return (
    <div className="bg-gray-50">
      <div className="p-3 sm:p-4 pb-0">
        <div className="mb-3 sm:mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Communications
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage your inbox and draft replies with AI.
          </p>
        </div>
      </div>
      
      {/* Fixed height container for email inbox */}
      <div className="p-2 sm:p-4 pt-0">
        <div className="h-[calc(100vh-160px)] sm:h-[calc(100vh-200px)] min-h-[500px] sm:min-h-[600px]">
          <EmailInbox />
        </div>
      </div>
    </div>
  );
};

export default EmailTab;
