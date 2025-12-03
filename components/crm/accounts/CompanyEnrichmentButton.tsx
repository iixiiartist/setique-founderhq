/**
 * CompanyEnrichmentButton
 * 
 * A button component that triggers company data enrichment from a website URL.
 * Shows loading state and displays enrichment results in a styled modal.
 */

import React, { useState } from 'react';
import { useCompanyEnrichment, mapEnrichmentToAccountFields } from './hooks/useCompanyEnrichment';
import { EnrichmentResult } from '../../../services/companyEnrichmentService';
import { showSuccess, showError, showLoading, updateToast } from '../../../lib/utils/toast';

interface CompanyEnrichmentButtonProps {
  websiteUrl: string;
  onEnrichmentComplete?: (data: ReturnType<typeof mapEnrichmentToAccountFields>) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function CompanyEnrichmentButton({
  websiteUrl,
  onEnrichmentComplete,
  disabled = false,
  className = '',
  size = 'md',
}: CompanyEnrichmentButtonProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [pendingEnrichment, setPendingEnrichment] = useState<EnrichmentResult | null>(null);

  const {
    isLoading,
    enrichFromUrl,
    canEnrich,
    formattedEnrichment,
  } = useCompanyEnrichment({
    onSuccess: (enrichment) => {
      setPendingEnrichment(enrichment);
      setShowPreview(true);
    },
    onError: (error) => {
      showError(error);
    },
  });

  const handleEnrich = async () => {
    if (!canEnrich(websiteUrl)) {
      showError('Please enter a valid website URL first');
      return;
    }
    
    const toastId = showLoading('Fetching company information...');
    
    try {
      const result = await enrichFromUrl(websiteUrl);
      if (result) {
        updateToast(toastId, 'Company data retrieved successfully!', 'success');
      } else {
        updateToast(toastId, 'Could not retrieve company data', 'error');
      }
    } catch {
      updateToast(toastId, 'Failed to fetch company information', 'error');
    }
  };

  const handleApply = () => {
    if (pendingEnrichment) {
      const mapped = mapEnrichmentToAccountFields(pendingEnrichment);
      onEnrichmentComplete?.(mapped);
      setShowPreview(false);
      setPendingEnrichment(null);
      showSuccess('Company details applied to form');
    }
  };

  const handleDismiss = () => {
    setShowPreview(false);
    setPendingEnrichment(null);
  };

  const isDisabled = disabled || isLoading || !canEnrich(websiteUrl);
  
  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2.5 py-1' 
    : 'text-sm px-3 py-1.5';

  // Get the current enrichment to display (either from hook or pending)
  const displayEnrichment = showPreview && pendingEnrichment 
    ? formattedEnrichment 
    : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleEnrich}
        disabled={isDisabled}
        className={`
          inline-flex items-center gap-1.5 font-medium rounded-lg
          transition-all duration-200
          ${isDisabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
            : 'bg-gray-900 text-white hover:bg-gray-800 border border-gray-900 shadow-sm hover:shadow-md'
          }
          ${sizeClasses}
          ${className}
        `}
        title={!canEnrich(websiteUrl) ? 'Enter a valid website URL to enable enrichment' : 'Auto-fill company details from website'}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Enriching...</span>
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Auto-Fill</span>
          </>
        )}
      </button>

      {/* Preview Modal - Modern Design */}
      {showPreview && pendingEnrichment && displayEnrichment && (
        <div 
          className="fixed inset-0 z-[100] flex justify-center items-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && handleDismiss()}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col border border-gray-200">
            {/* Header */}
            <div className="p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Company Enrichment</h3>
                  <p className="text-sm text-gray-500">Review extracted information</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-5 overflow-y-auto flex-1">
              {/* Description */}
              {displayEnrichment.summary && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Description
                  </label>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 border border-gray-200">
                    {displayEnrichment.summary}
                  </div>
                </div>
              )}

              {/* Details Grid */}
              {displayEnrichment.details.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {displayEnrichment.details.map((detail, index) => (
                    <div 
                      key={index} 
                      className="bg-gray-50 rounded-xl p-3 border border-gray-200"
                    >
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        {detail.label}
                      </label>
                      <span className="text-sm font-medium text-gray-900">{detail.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* No data message */}
              {!displayEnrichment.summary && displayEnrichment.details.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700">No data could be extracted</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                    This website may block automated access. Try a different company website or enter details manually.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-100 flex gap-3 shrink-0">
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!displayEnrichment.summary && displayEnrichment.details.length === 0}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg border border-gray-900 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:border-gray-300"
              >
                Apply to Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyEnrichmentButton;
