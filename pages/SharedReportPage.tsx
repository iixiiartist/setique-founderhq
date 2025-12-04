// pages/SharedReportPage.tsx
// Public page for viewing shared research reports

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Lock, AlertCircle, ExternalLink, Clock, Building2, Eye } from 'lucide-react';
import { getSharedReport, type SharedReport } from '../lib/services/reportSharingService';
import { AgentResponsePresenter } from '../components/agents/AgentResponsePresenter';

// Goal labels for display
const GOAL_LABELS: Record<string, string> = {
  icp: 'ICP & Pain Points Analysis',
  competitive: 'Competitive Landscape',
  angles: 'Outreach Angles',
  market: 'Market Trends Brief',
};

export const SharedReportPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<SharedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReport = async (pwd?: string) => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await getSharedReport(token, pwd);
    
    if (result.passwordRequired) {
      setPasswordRequired(true);
      setLoading(false);
      return;
    }

    if (!result.success) {
      setError(result.error || 'Failed to load report');
      setLoading(false);
      return;
    }

    setReport(result.report || null);
    setPasswordRequired(false);
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, [token]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetchReport(password);
    setSubmitting(false);
  };

  // Password gate
  if (passwordRequired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-gray-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Password Protected</h1>
            <p className="text-sm text-gray-600 mt-2">This report requires a password to view.</p>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!password || submitting}
              className="w-full py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Verifying...' : 'View Report'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Report Not Found</h1>
          <p className="text-gray-600">{error || 'This report may have been removed or the link has expired.'}</p>
        </div>
      </div>
    );
  }

  // Format date
  const createdDate = new Date(report.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Build response object for presenter
  const responseForPresenter = {
    output: report.output,
    sources: report.sources || [],
    metadata: {},
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Research Report</h1>
              <p className="text-xs text-gray-500">FounderHQ – A Setique Tool</p>
            </div>
          </div>
          <a
            href="https://founderhq.setique.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
          >
            Try FounderHQ
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Report header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-gray-500 mb-1">
                {GOAL_LABELS[report.goal] || 'Research Brief'}
              </p>
              <h2 className="text-2xl font-bold text-gray-900">
                {report.title_override || report.target}
              </h2>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {createdDate}
              </span>
              {report.workspace_name && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {report.workspace_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Report content */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <AgentResponsePresenter 
            response={responseForPresenter}
            showInsertButton={false}
          />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            This report was generated using{' '}
            <a 
              href="https://founderhq.setique.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              FounderHQ – A Setique Tool
            </a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default SharedReportPage;
