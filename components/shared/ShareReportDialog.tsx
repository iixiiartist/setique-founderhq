// components/shared/ShareReportDialog.tsx
// Dialog for creating public/private share links for reports and market briefs

import React, { useState, useCallback } from 'react';
import { X, Link, Lock, Globe, Clock, Copy, Check, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { 
  createReportShareLink, 
  createMarketBriefShareLink,
  revokeShareLink,
  getShareUrl,
  type ShareLinkType 
} from '../../lib/services/reportSharingService';
import { showSuccess, showError } from '../../lib/utils/toast';

interface ShareReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportType: 'report' | 'brief';
  reportTitle: string;
  existingToken?: string | null;
}

const EXPIRATION_OPTIONS = [
  { value: null, label: 'Never expires' },
  { value: 1, label: '1 day' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

export const ShareReportDialog: React.FC<ShareReportDialogProps> = ({
  isOpen,
  onClose,
  reportId,
  reportType,
  reportTitle,
  existingToken,
}) => {
  const [linkType, setLinkType] = useState<ShareLinkType>('public');
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hideSources, setHideSources] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(existingToken ?? null);
  const [copied, setCopied] = useState(false);

  const handleCreateLink = useCallback(async () => {
    setIsCreating(true);
    try {
      const createFn = reportType === 'report' ? createReportShareLink : createMarketBriefShareLink;
      const result = await createFn(reportId, {
        linkType,
        expiresInDays,
        password: linkType === 'password' ? password : undefined,
        hideSources,
      });

      if (result.success && result.token) {
        setShareToken(result.token);
        showSuccess('Share link created!');
      } else {
        showError(result.error || 'Failed to create share link');
      }
    } catch (err) {
      showError('Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  }, [reportId, reportType, linkType, expiresInDays, password, hideSources]);

  const handleRevokeLink = useCallback(async () => {
    if (!shareToken) return;
    
    setIsRevoking(true);
    try {
      const result = await revokeShareLink(reportId);
      if (result.success) {
        setShareToken(null);
        showSuccess('Share link revoked');
      } else {
        showError(result.error || 'Failed to revoke link');
      }
    } catch (err) {
      showError('Failed to revoke link');
    } finally {
      setIsRevoking(false);
    }
  }, [reportId, shareToken]);

  const handleCopyLink = useCallback(async () => {
    if (!shareToken) return;
    
    const url = getShareUrl(shareToken, reportType);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showSuccess('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showError('Failed to copy link');
    }
  }, [shareToken, reportType]);

  if (!isOpen) return null;

  const shareUrl = shareToken ? getShareUrl(shareToken, reportType) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Link className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Share {reportType === 'report' ? 'Report' : 'Brief'}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Report title */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Sharing:</p>
            <p className="font-medium text-gray-900 truncate">{reportTitle}</p>
          </div>

          {shareToken ? (
            /* Link created - show share options */
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-800">Share link is active</span>
              </div>

              {/* Share URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Share Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl || ''}
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Revoke link */}
              <button
                onClick={handleRevokeLink}
                disabled={isRevoking}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {isRevoking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                Revoke Link
              </button>
            </div>
          ) : (
            /* Create new link */
            <div className="space-y-4">
              {/* Link type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Link Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setLinkType('public')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                      linkType === 'public'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Globe className={`w-5 h-5 ${linkType === 'public' ? 'text-blue-600' : 'text-gray-500'}`} />
                    <span className={`text-xs font-medium ${linkType === 'public' ? 'text-blue-700' : 'text-gray-600'}`}>
                      Public
                    </span>
                  </button>
                  <button
                    onClick={() => setLinkType('private')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                      linkType === 'private'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Eye className={`w-5 h-5 ${linkType === 'private' ? 'text-blue-600' : 'text-gray-500'}`} />
                    <span className={`text-xs font-medium ${linkType === 'private' ? 'text-blue-700' : 'text-gray-600'}`}>
                      Unlisted
                    </span>
                  </button>
                  <button
                    onClick={() => setLinkType('password')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                      linkType === 'password'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Lock className={`w-5 h-5 ${linkType === 'password' ? 'text-blue-600' : 'text-gray-500'}`} />
                    <span className={`text-xs font-medium ${linkType === 'password' ? 'text-blue-700' : 'text-gray-600'}`}>
                      Password
                    </span>
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {linkType === 'public' && 'Anyone with the link can view this report.'}
                  {linkType === 'private' && 'Only people with the exact link can view. Not indexed.'}
                  {linkType === 'password' && 'Viewers must enter a password to access.'}
                </p>
              </div>

              {/* Password input (if password type) */}
              {linkType === 'password' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a password"
                      className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Expiration */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Expiration
                </label>
                <select
                  value={expiresInDays ?? ''}
                  onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {EXPIRATION_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.value ?? ''}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hide sources option (for reports) */}
              {reportType === 'report' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideSources}
                    onChange={(e) => setHideSources(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Hide source links from viewers</span>
                </label>
              )}

              {/* Create button */}
              <button
                onClick={handleCreateLink}
                disabled={isCreating || (linkType === 'password' && !password)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4" />
                    Create Share Link
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareReportDialog;
