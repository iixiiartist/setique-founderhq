import React from 'react';
import { EmailInbox } from './email/EmailInbox';

export const EmailTab: React.FC = () => {
  return (
    <div className="bg-gray-50">
      <div className="p-4 pb-0">
        <div className="mb-4 flex justify-between items-end">
          <div>
              <h1 className="text-2xl font-bold text-gray-900">
              Communications
              </h1>
              <p className="text-sm text-gray-500 mt-1">
              Manage your inbox and draft replies with AI.
              </p>
          </div>
        </div>
      </div>
      
      {/* Fixed height container for email inbox - approximately 10 emails visible */}
      <div className="p-4 pt-0">
        <div className="h-[calc(100vh-200px)] min-h-[600px]">
          <EmailInbox />
        </div>
      </div>
    </div>
  );
};

export default EmailTab;
