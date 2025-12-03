// components/agents/ResearchAgentModal.tsx
// Modal for running the Research & Briefing agent

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { X, Globe, FileText, AlertCircle, Sparkles, Save, Check, Download, FolderPlus, ChevronDown } from 'lucide-react';
import { useYouAgent } from '../../hooks/useYouAgent';
import { useAgentReports } from '../../hooks/useAgentReports';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { YOU_AGENTS } from '../../lib/config/youAgents';
import { AgentResponsePresenter } from './AgentResponsePresenter';
import { exportReportToHtml, exportReportToPdf, saveReportToFileLibrary } from '../../lib/services/agentReportExport';
import { 
  VALIDATION_LIMITS, 
  validateTarget, 
  validateNotes, 
  parseAndValidateUrls,
  getRemainingChars 
} from '../../lib/utils/agentValidation';
import type { AgentReport } from '../../lib/services/agentReportService';
import type { RunAgentResponse } from '../../lib/services/youAgentClient';

interface ResearchAgentModalProps {
  open: boolean;
  onClose: () => void;
  onInsertToDoc?: (content: string) => void;
  initialTarget?: string;
  savedReport?: AgentReport | null;
}

type GoalType = 'icp' | 'competitive' | 'angles' | 'market';

const GOAL_PROMPTS: Record<GoalType, string> = {
  icp: 'Analyze ideal customer profile, key pain points, buying triggers, and decision-making criteria.',
  competitive: 'Provide competitive landscape analysis, market positioning, key differentiators, and threats.',
  angles: 'Generate outreach angles, value propositions, and messaging hooks for sales engagement.',
  market: 'Summarize market trends, growth drivers, challenges, and emerging opportunities.',
};

export const ResearchAgentModal: React.FC<ResearchAgentModalProps> = ({
  open,
  onClose,
  onInsertToDoc,
  initialTarget = '',
  savedReport = null,
}) => {
  const agentConfig = YOU_AGENTS.research_briefing;
  const { run, loading, error, errorCode, lastResponse, resetIn, reset, streamingOutput, isStreaming } = useYouAgent('research_briefing');
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const { saveReport, isSaving } = useAgentReports(workspace?.id, user?.id);

  const [target, setTarget] = useState(initialTarget);
  const [urls, setUrls] = useState('');
  const [goal, setGoal] = useState<GoalType>('icp');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [reportSaved, setReportSaved] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);

  // Validation state
  const targetValidation = useMemo(() => validateTarget(target), [target]);
  const notesValidation = useMemo(() => validateNotes(notes), [notes]);
  const urlsValidation = useMemo(() => parseAndValidateUrls(urls), [urls]);

  // If viewing a saved report, create a response object from it
  const displayResponse: RunAgentResponse | null = savedReport 
    ? {
        output: savedReport.output,
        sources: savedReport.sources,
        metadata: savedReport.metadata,
      }
    : lastResponse;

  // Reset saved state when modal opens fresh
  useEffect(() => {
    if (savedReport) {
      setTarget(savedReport.target);
      setGoal(savedReport.goal as GoalType);
      setNotes(savedReport.notes || '');
      setUrls(savedReport.urls?.join(', ') || '');
      setCurrentReportId(savedReport.id);
      setReportSaved(true);
      setSavedToLibrary(false);
    } else {
      setReportSaved(false);
      setCurrentReportId(null);
      setSavedToLibrary(false);
    }
  }, [savedReport]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowExportMenu(false);
    if (showExportMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showExportMenu]);

  const handleClose = useCallback(() => {
    reset();
    setTarget('');
    setUrls('');
    setGoal('icp');
    setNotes('');
    setValidationError(null);
    setReportSaved(false);
    setCurrentReportId(null);
    onClose();
  }, [reset, onClose]);

  const handleSaveReport = useCallback(async () => {
    if (!displayResponse?.output || reportSaved || currentReportId) return;

    const saved = await saveReport({
      agentSlug: 'research_briefing',
      target: target.trim(),
      goal,
      notes: notes.trim() || undefined,
      urls: urls.split(',').map(u => u.trim()).filter(Boolean),
      output: displayResponse.output,
      sources: displayResponse.sources,
      metadata: displayResponse.metadata,
    });

    if (saved) {
      setReportSaved(true);
      setCurrentReportId(saved.id);
    }
  }, [displayResponse, reportSaved, currentReportId, saveReport, target, goal, notes, urls]);

  // Build report object for exports
  const getReportForExport = useCallback((): AgentReport | null => {
    if (savedReport) return savedReport;
    if (!displayResponse?.output) return null;
    
    return {
      id: currentReportId || 'temp',
      workspace_id: workspace?.id || '',
      user_id: user?.id || '',
      agent_slug: 'research_briefing',
      target: target.trim(),
      goal,
      notes: notes.trim() || null,
      urls: urls.split(',').map(u => u.trim()).filter(Boolean),
      output: displayResponse.output,
      sources: displayResponse.sources || [],
      metadata: displayResponse.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [savedReport, displayResponse, currentReportId, workspace, user, target, goal, notes, urls]);

  const handleExportHtml = useCallback(() => {
    const report = getReportForExport();
    if (!report) return;
    exportReportToHtml(report, { title: target.trim() });
    setShowExportMenu(false);
  }, [getReportForExport, target]);

  const handleExportPdf = useCallback(async () => {
    const report = getReportForExport();
    if (!report) return;
    
    setExportingPdf(true);
    try {
      await exportReportToPdf(report, { title: target.trim() });
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExportingPdf(false);
      setShowExportMenu(false);
    }
  }, [getReportForExport, target]);

  const handleSaveToLibrary = useCallback(async () => {
    const report = getReportForExport();
    if (!report || !user?.id || !workspace?.id) return;
    
    setSavingToLibrary(true);
    try {
      const result = await saveReportToFileLibrary(report, user.id, workspace.id);
      if (result.success) {
        setSavedToLibrary(true);
      } else {
        console.error('Failed to save to library:', result.error);
      }
    } catch (err) {
      console.error('Save to library failed:', err);
    } finally {
      setSavingToLibrary(false);
      setShowExportMenu(false);
    }
  }, [getReportForExport, user, workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate all inputs
    if (!targetValidation.isValid) {
      setValidationError(targetValidation.error || 'Invalid target');
      return;
    }
    
    if (!notesValidation.isValid) {
      setValidationError(notesValidation.error || 'Invalid notes');
      return;
    }
    
    if (urlsValidation.error) {
      setValidationError(urlsValidation.error);
      return;
    }

    // Build the prompt with sanitized values
    const input = buildPrompt({ 
      target: targetValidation.sanitized, 
      goal, 
      notes: notesValidation.sanitized 
    });
    
    // Build context with validated URLs
    const context = {
      urls: urlsValidation.validUrls,
      founderhq_context: {
        goal,
        notes: notesValidation.sanitized,
      },
    };

    try {
      await run(input, context);
    } catch (err) {
      // Error is already handled by the hook
      console.error('[ResearchAgentModal] Run failed:', err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-xl">
              {agentConfig.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{agentConfig.label}</h2>
              <p className="text-sm text-gray-500">AI-powered research assistant</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {!displayResponse ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Target Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Company / Market / Topic <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-xs ${target.length > VALIDATION_LIMITS.TARGET_MAX_LENGTH ? 'text-red-500' : 'text-gray-400'}`}>
                    {target.length}/{VALIDATION_LIMITS.TARGET_MAX_LENGTH}
                  </span>
                </div>
                <div className="relative">
                  <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors ${
                      !targetValidation.isValid && target.length > 0 ? 'border-red-300' : 'border-gray-300'
                    }`}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder={agentConfig.placeholder}
                    maxLength={VALIDATION_LIMITS.TARGET_MAX_LENGTH + 50} // Allow slight overflow for feedback
                    required
                    autoFocus
                  />
                </div>
                {!targetValidation.isValid && target.length > 0 && (
                  <p className="mt-1 text-xs text-red-500">{targetValidation.error}</p>
                )}
              </div>

              {/* Two-column layout */}
              <div className="grid gap-5 md:grid-cols-2">
                {/* URLs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    URLs to analyze (optional)
                  </label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors ${
                      urlsValidation.error || urlsValidation.invalidCount > 0 ? 'border-orange-300' : 'border-gray-300'
                    }`}
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                    placeholder="https://example.com, https://blog.example.com"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Comma-separated URLs (max {VALIDATION_LIMITS.MAX_URLS})
                    </p>
                    {urlsValidation.invalidCount > 0 && !urlsValidation.error && (
                      <p className="text-xs text-orange-500">
                        {urlsValidation.invalidCount} invalid URL{urlsValidation.invalidCount > 1 ? 's' : ''} will be ignored
                      </p>
                    )}
                  </div>
                  {urlsValidation.error && (
                    <p className="mt-1 text-xs text-red-500">{urlsValidation.error}</p>
                  )}
                </div>

                {/* Goal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Research Goal
                  </label>
                  <select
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors bg-white"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value as GoalType)}
                  >
                    {agentConfig.goals.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Additional Context (optional)
                  </label>
                  <span className={`text-xs ${notes.length > VALIDATION_LIMITS.NOTES_MAX_LENGTH ? 'text-red-500' : 'text-gray-400'}`}>
                    {notes.length}/{VALIDATION_LIMITS.NOTES_MAX_LENGTH}
                  </span>
                </div>
                <textarea
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors resize-none ${
                    !notesValidation.isValid ? 'border-red-300' : 'border-gray-300'
                  }`}
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={VALIDATION_LIMITS.NOTES_MAX_LENGTH + 100} // Allow slight overflow for feedback
                  placeholder="e.g. Our product: AI GTM hub for SaaS founders doing $1–10M ARR. Focus on enterprise sales angles."
                />
                {!notesValidation.isValid && (
                  <p className="mt-1 text-xs text-red-500">{notesValidation.error}</p>
                )}
              </div>

              {/* Error Display */}
              {(error || validationError) && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700">{validationError || error}</p>
                    {errorCode === 'rate_limit' && resetIn && (
                      <p className="text-xs text-red-600 mt-1">
                        Try again in {resetIn} seconds
                      </p>
                    )}
                    {errorCode === 'config' && (
                      <p className="text-xs text-red-600 mt-1">
                        Please contact support to configure this agent.
                      </p>
                    )}
                    {(errorCode === 'timeout' || errorCode === 'network') && (
                      <p className="text-xs text-red-600 mt-1">
                        Tip: Try a more specific company or topic, or reduce the scope of your query.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Sparkles size={12} />
                  {isStreaming ? 'Streaming response...' : 'Results typically take 30-90 seconds for comprehensive research'}
                </p>
                <button
                  type="submit"
                  disabled={loading || !targetValidation.isValid || !notesValidation.isValid || !!urlsValidation.error}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {loading ? (
                    <>
                      <span className="relative w-4.5 h-4.5 inline-block"><span className="absolute inset-0 border-2 border-current animate-spin" style={{ animationDuration: '1.2s' }} /><span className="absolute inset-0.5 border border-current/40 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} /></span>
                      {isStreaming ? 'Receiving data...' : 'Researching...'}
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Run Briefing
                    </>
                  )}
                </button>
              </div>

              {/* Streaming Preview */}
              {isStreaming && streamingOutput && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></span>
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75"></span>
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></span>
                    </div>
                    <span className="text-xs font-medium text-gray-600">Receiving research...</span>
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {streamingOutput.slice(-500)}
                    {streamingOutput.length > 500 && <span className="text-gray-400">...</span>}
                  </div>
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              {/* Header with actions */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Research: <span className="text-gray-900">{target}</span>
                  {savedReport && (
                    <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                      Saved
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  {/* Export dropdown */}
                  {displayResponse?.output && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowExportMenu(!showExportMenu);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <Download size={14} />
                        Export
                        <ChevronDown size={12} />
                      </button>
                      
                      {showExportMenu && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                          <button
                            onClick={handleExportHtml}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                          >
                            <FileText size={14} />
                            Export as HTML
                          </button>
                          <button
                            onClick={handleExportPdf}
                            disabled={exportingPdf}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left disabled:opacity-50"
                          >
                            {exportingPdf ? (
                              <span className="relative w-3.5 h-3.5 inline-block"><span className="absolute inset-0 border-2 border-current animate-spin" style={{ animationDuration: '1.2s' }} /><span className="absolute inset-0.5 border border-current/40 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} /></span>
                            ) : (
                              <Download size={14} />
                            )}
                            {exportingPdf ? 'Exporting...' : 'Export as PDF'}
                          </button>
                          <div className="border-t border-gray-100 my-1" />
                          <button
                            onClick={handleSaveToLibrary}
                            disabled={savingToLibrary || savedToLibrary}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left disabled:opacity-50"
                          >
                            {savedToLibrary ? (
                              <>
                                <Check size={14} className="text-green-500" />
                                Saved to Library
                              </>
                            ) : savingToLibrary ? (
                              <>
                                <span className="relative w-3.5 h-3.5 inline-block"><span className="absolute inset-0 border-2 border-current animate-spin" style={{ animationDuration: '1.2s' }} /><span className="absolute inset-0.5 border border-current/40 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} /></span>
                                Saving...
                              </>
                            ) : (
                              <>
                                <FolderPlus size={14} />
                                Save to File Library
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Save button - only show for new reports */}
                  {!savedReport && displayResponse?.output && (
                    <button
                      onClick={handleSaveReport}
                      disabled={isSaving || reportSaved}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                    >
                      {reportSaved ? (
                        <>
                          <Check size={14} className="text-green-500" />
                          Saved
                        </>
                      ) : isSaving ? (
                        <>
                          <span className="relative w-3.5 h-3.5 inline-block"><span className="absolute inset-0 border-2 border-current animate-spin" style={{ animationDuration: '1.2s' }} /><span className="absolute inset-0.5 border border-current/40 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} /></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          Save Report
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      reset();
                      setReportSaved(false);
                      setCurrentReportId(null);
                      setSavedToLibrary(false);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                  >
                    ← New Research
                  </button>
                </div>
              </div>

              {/* Response */}
              <AgentResponsePresenter 
                response={displayResponse!} 
                onInsertToDoc={onInsertToDoc}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function buildPrompt(params: {
  target: string;
  goal: GoalType;
  notes: string;
}): string {
  const { target, goal, notes } = params;
  const goalPrompt = GOAL_PROMPTS[goal];

  return [
    `Research target: ${target}`,
    ``,
    `Goal: ${goalPrompt}`,
    ``,
    notes ? `Additional context from user: ${notes}` : '',
    ``,
    `Please provide a concise, GTM-ready brief with actionable insights. Use clear sections and bullet points.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export default ResearchAgentModal;
