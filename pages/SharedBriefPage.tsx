// pages/SharedBriefPage.tsx
// Public page for viewing shared market briefs
// Includes SEO optimization for rich link previews

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Globe, Lock, AlertCircle, ExternalLink, Clock, Building2, Sparkles,
  FileText, Target, TrendingUp, Users, Zap, Lightbulb, DollarSign, 
  BarChart3, Package, Building, AlertTriangle, Rocket, BookOpen, Copy, Check
} from 'lucide-react';
import { getSharedMarketBrief, type SharedMarketBrief } from '../lib/services/reportSharingService';
import { useCopyToClipboard } from '../hooks';
import { useSEO, generateDescription } from '../hooks/useSEO';

// Section icons mapping for professional look
const SECTION_ICONS: Record<string, React.ReactNode> = {
  'market': <TrendingUp size={16} className="text-indigo-600" />,
  'overview': <FileText size={16} className="text-slate-600" />,
  'competitor': <Target size={16} className="text-orange-600" />,
  'competitive': <Target size={16} className="text-orange-600" />,
  'landscape': <BarChart3 size={16} className="text-blue-600" />,
  'pricing': <DollarSign size={16} className="text-emerald-600" />,
  'price': <DollarSign size={16} className="text-emerald-600" />,
  'trend': <TrendingUp size={16} className="text-purple-600" />,
  'growth': <Rocket size={16} className="text-green-600" />,
  'driver': <Zap size={16} className="text-amber-600" />,
  'challenge': <AlertTriangle size={16} className="text-red-500" />,
  'risk': <AlertTriangle size={16} className="text-red-500" />,
  'opportunity': <Lightbulb size={16} className="text-yellow-500" />,
  'customer': <Users size={16} className="text-blue-500" />,
  'consumer': <Users size={16} className="text-blue-500" />,
  'segment': <Users size={16} className="text-cyan-600" />,
  'product': <Package size={16} className="text-violet-600" />,
  'brand': <Building size={16} className="text-slate-700" />,
  'company': <Building2 size={16} className="text-slate-700" />,
  'key': <Zap size={16} className="text-amber-500" />,
  'summary': <BookOpen size={16} className="text-indigo-500" />,
  'takeaway': <Lightbulb size={16} className="text-yellow-600" />,
  'recommendation': <Lightbulb size={16} className="text-green-500" />,
  'production': <Package size={16} className="text-slate-600" />,
  'consumption': <Users size={16} className="text-blue-600" />,
  'country': <Globe size={16} className="text-teal-600" />,
  'region': <Globe size={16} className="text-teal-600" />,
  'global': <Globe size={16} className="text-blue-500" />,
};

const getIconForHeading = (heading: string): React.ReactNode => {
  const lower = heading.toLowerCase();
  for (const [key, icon] of Object.entries(SECTION_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return <FileText size={16} className="text-gray-400" />;
};

/**
 * Sanitize and clean the raw report
 */
const sanitizeReport = (raw: string): string => {
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    // Remove Jina reader/summarizer disclaimers
    .replace(/r\.jina\.ai[^\n]*/gi, '')
    .replace(/jina\.ai[^\n]*/gi, '')
    .replace(/\[via jina[^\]]*\]/gi, '')
    .replace(/\(via jina[^)]*\)/gi, '')
    .replace(/powered by jina[^\n]*/gi, '')
    .replace(/source:\s*jina[^\n]*/gi, '')
    .replace(/summarized by[^\n]*jina[^\n]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Format inline markdown: bold, italic, code, links
 */
function formatInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Links [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      parts.push(
        <a 
          key={key++} 
          href={linkMatch[2]} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-indigo-600 underline underline-offset-2 hover:text-indigo-800 font-medium transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Bold **text** or __text__
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/) || remaining.match(/^__([^_]+)__/);
    if (boldMatch) {
      parts.push(<strong key={key++} className="font-semibold text-gray-900">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic *text* or _text_ (but not ** or __)
    const italicMatch = remaining.match(/^\*([^*]+)\*/) || remaining.match(/^_([^_]+)_/);
    if (italicMatch && !remaining.startsWith('**') && !remaining.startsWith('__')) {
      parts.push(<em key={key++} className="italic text-gray-700">{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Inline code `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-xs font-mono">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Find next special character
    const nextSpecial = remaining.search(/[[*_`]/);
    if (nextSpecial === -1) {
      parts.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

/**
 * Professional Markdown Renderer Component
 */
const MarketBriefContent: React.FC<{ content: string }> = ({ content }) => {
  const sanitized = sanitizeReport(content);
  const lines = sanitized.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol', items: string[] } | null = null;
  let currentTable: { headers: string[], rows: string[][] } | null = null;
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let key = 0;

  const flushList = () => {
    if (currentList) {
      const ListTag = currentList.type === 'ol' ? 'ol' : 'ul';
      const listClass = currentList.type === 'ol' 
        ? 'list-decimal list-outside space-y-2 my-4 ml-6 text-gray-700'
        : 'space-y-2 my-4 ml-2 text-gray-700';
      
      elements.push(
        <ListTag key={key++} className={listClass}>
          {currentList.items.map((item, i) => (
            <li key={i} className={`text-sm leading-relaxed ${currentList?.type === 'ul' ? 'flex gap-3' : ''}`}>
              {currentList?.type === 'ul' && (
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              )}
              <span>{formatInlineMarkdown(item)}</span>
            </li>
          ))}
        </ListTag>
      );
      currentList = null;
    }
  };

  const flushTable = () => {
    if (currentTable && currentTable.headers.length > 0) {
      elements.push(
        <div key={key++} className="overflow-x-auto my-6 rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-gray-50">
              <tr>
                {currentTable.headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left font-semibold text-gray-800 border-b border-gray-200">
                    {formatInlineMarkdown(h.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {currentTable.rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-indigo-50/50 transition-colors">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-3 text-gray-700">
                      {formatInlineMarkdown(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTable = null;
    }
  };

  const flushCodeBlock = () => {
    if (codeBlockContent.length > 0) {
      elements.push(
        <pre key={key++} className="bg-slate-900 text-slate-100 rounded-xl p-5 my-4 overflow-x-auto text-sm font-mono shadow-lg">
          <code>{codeBlockContent.join('\n')}</code>
        </pre>
      );
      codeBlockContent = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Code block handling
    if (trimmedLine.startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        flushCodeBlock();
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Empty line
    if (trimmedLine === '') {
      flushList();
      flushTable();
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmedLine)) {
      flushList();
      flushTable();
      elements.push(<hr key={key++} className="my-6 border-gray-200" />);
      continue;
    }

    // Table row
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      const cells = trimmedLine.slice(1, -1).split('|').map(c => c.trim());
      
      // Skip separator rows
      if (cells.every(c => /^[-:]+$/.test(c))) {
        continue;
      }
      
      if (!currentTable) {
        flushList();
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else if (currentTable) {
      flushTable();
    }

    // Headings
    const headingMatch = trimmedLine.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      flushTable();
      const level = headingMatch[1].length;
      const content = headingMatch[2].replace(/\*\*/g, ''); // Remove bold markers from headings
      const icon = getIconForHeading(content);
      
      if (level === 1) {
        elements.push(
          <h2 key={key++} className="text-xl font-bold text-slate-900 mt-8 mb-4 flex items-center gap-3 pb-2 border-b border-gray-200">
            <span className="p-1.5 bg-indigo-100 rounded-lg">{icon}</span>
            <span>{content}</span>
          </h2>
        );
      } else if (level === 2) {
        elements.push(
          <h3 key={key++} className="text-lg font-semibold text-slate-800 mt-6 mb-3 flex items-center gap-2.5">
            <span className="p-1 bg-slate-100 rounded-md">{icon}</span>
            <span>{content}</span>
          </h3>
        );
      } else if (level === 3) {
        elements.push(
          <h4 key={key++} className="text-base font-semibold text-slate-700 mt-5 mb-2 flex items-center gap-2">
            {icon}
            <span>{content}</span>
          </h4>
        );
      } else {
        elements.push(
          <h5 key={key++} className="text-sm font-medium text-slate-600 mt-4 mb-2 flex items-center gap-2">
            {icon}
            <span>{content}</span>
          </h5>
        );
      }
      continue;
    }

    // Numbered list item
    const orderedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      flushTable();
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(orderedMatch[2]);
      continue;
    }

    // Bullet list item
    const unorderedMatch = trimmedLine.match(/^[-*+•]\s+(.+)$/);
    if (unorderedMatch) {
      flushTable();
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(unorderedMatch[1]);
      continue;
    }

    // Blockquote
    if (trimmedLine.startsWith('>')) {
      flushList();
      flushTable();
      const quoteContent = trimmedLine.slice(1).trim();
      elements.push(
        <blockquote key={key++} className="border-l-4 border-indigo-400 pl-4 py-3 my-4 bg-indigo-50/50 rounded-r-xl text-slate-700 italic text-sm">
          {formatInlineMarkdown(quoteContent)}
        </blockquote>
      );
      continue;
    }

    // Regular paragraph
    flushList();
    flushTable();
    elements.push(
      <p key={key++} className="text-gray-700 text-sm leading-relaxed my-3">
        {formatInlineMarkdown(trimmedLine)}
      </p>
    );
  }

  // Flush any remaining content
  flushList();
  flushTable();
  flushCodeBlock();

  return <div className="space-y-1">{elements}</div>;
};

/**
 * Copy button component with visual feedback
 */
const CopyButton: React.FC<{ content: string }> = ({ content }) => {
  const { isCopied, copy } = useCopyToClipboard();
  
  return (
    <button
      onClick={() => copy(content)}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-700 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
    >
      {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
      {isCopied ? 'Copied!' : 'Copy'}
    </button>
  );
};

export const SharedBriefPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [brief, setBrief] = useState<SharedMarketBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Debug logging for mobile issues
  useEffect(() => {
    console.log('[SharedBriefPage] Mounted with token:', token);
    console.log('[SharedBriefPage] Current URL:', window.location.href);
    console.log('[SharedBriefPage] Pathname:', window.location.pathname);
  }, [token]);

  const fetchBrief = async (pwd?: string) => {
    if (!token) {
      console.error('[SharedBriefPage] No token provided');
      setError('Invalid share link - no token found');
      setLoading(false);
      return;
    }

    console.log('[SharedBriefPage] Fetching brief with token:', token);
    setLoading(true);
    setError(null);

    const result = await getSharedMarketBrief(token, pwd);
    
    if (result.passwordRequired) {
      setPasswordRequired(true);
      setLoading(false);
      return;
    }

    if (!result.success) {
      console.error('[SharedBriefPage] Failed to load brief:', result.error);
      setError(result.error || 'Failed to load brief');
      setLoading(false);
      return;
    }

    console.log('[SharedBriefPage] Brief loaded successfully');
    setBrief(result.brief || null);
    setPasswordRequired(false);
    setLoading(false);
  };

  useEffect(() => {
    // Only fetch if we have a token
    if (token) {
      fetchBrief();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // SEO meta tags for rich link previews
  const seoDescription = useMemo(() => {
    if (!brief) return 'Market research brief shared via Setique: FounderHQ';
    if (brief.hero_line) return brief.hero_line;
    if (brief.raw_report) return generateDescription(brief.raw_report);
    return `Market research: ${brief.query}`;
  }, [brief]);

  useSEO({
    title: brief ? `Market Brief: ${brief.query}` : 'Market Research Brief',
    description: seoDescription,
    url: `/share/brief/${token}`,
    type: 'article',
    author: brief?.workspace_name || 'Setique: FounderHQ',
    publishedTime: brief?.created_at,
  });

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetchBrief(password);
    setSubmitting(false);
  };

  // Parse key facts and pricing highlights from JSONB
  const keyFacts = useMemo(() => {
    if (!brief?.key_facts) return [];
    if (Array.isArray(brief.key_facts)) return brief.key_facts;
    return [];
  }, [brief?.key_facts]);

  const pricingHighlights = useMemo(() => {
    if (!brief?.pricing_highlights) return [];
    if (Array.isArray(brief.pricing_highlights)) return brief.pricing_highlights;
    return [];
  }, [brief?.pricing_highlights]);

  const insightSections = useMemo(() => {
    if (!brief?.insight_sections) return [];
    if (Array.isArray(brief.insight_sections)) return brief.insight_sections;
    return [];
  }, [brief?.insight_sections]);

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
            <p className="text-sm text-gray-600 mt-2">This market brief requires a password to view.</p>
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
              {submitting ? 'Verifying...' : 'View Brief'}
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
          <p className="text-gray-600">Loading market brief...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !brief) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Brief Not Found</h1>
          <p className="text-gray-600">{error || 'This market brief may have been removed or the link has expired.'}</p>
        </div>
      </div>
    );
  }

  // Format date
  const createdDate = new Date(brief.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Market Research Brief</h1>
              <p className="text-xs text-gray-500">Setique: FounderHQ</p>
            </div>
          </div>
          <a
            href="https://founderhq.setique.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
          >
            Try Setique: FounderHQ
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Brief header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-800 to-blue-600 text-white rounded-xl p-6 mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">Market Research Brief</p>
          <h2 className="text-2xl font-extrabold tracking-tight mt-1">{brief.query}</h2>
          {brief.hero_line && (
            <p className="text-blue-100 text-sm mt-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> {brief.hero_line}
            </p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-blue-100/80">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {createdDate}
            </span>
            {brief.workspace_name && (
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                {brief.workspace_name}
              </span>
            )}
          </div>
        </div>

        {/* Key Facts */}
        {keyFacts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
            {keyFacts.map((fact: { label: string; value: string }, idx: number) => (
              <div
                key={`fact-${idx}`}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
              >
                <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500">{fact.label}</p>
                <p className="text-base font-medium text-gray-800 mt-2 leading-snug">{fact.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Pricing Highlights */}
        {pricingHighlights.length > 0 && (
          <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-rose-50 p-5 mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-600">Pricing Signals</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-800">
              {pricingHighlights.map((highlight: { label: string; value: string }, idx: number) => (
                <li key={`price-${idx}`} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <span className="leading-relaxed">{highlight.value || highlight.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Insight Sections */}
        {insightSections.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {insightSections.map((section: { title: string; bullets?: string[]; content?: string }, idx: number) => (
              <div key={`section-${idx}`} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">{section.title}</p>
                <ul className="mt-3 space-y-2 text-sm text-gray-800">
                  {(section.bullets || []).map((bullet: string, bulletIdx: number) => (
                    <li key={`bullet-${bulletIdx}`} className="flex gap-3">
                      <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-gray-400 flex-shrink-0" />
                      <span className="leading-relaxed text-gray-700">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Raw Report - Professionally Rendered */}
        {brief.raw_report && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Full Research Report</h3>
                  <p className="text-xs text-gray-500">AI-generated market analysis</p>
                </div>
              </div>
              <CopyButton content={brief.raw_report} />
            </div>
            <MarketBriefContent content={brief.raw_report} />
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            This market brief was generated using{' '}
            <a 
              href="https://founderhq.setique.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Setique: FounderHQ
            </a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default SharedBriefPage;
