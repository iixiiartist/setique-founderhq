// components/agents/AgentResponsePresenter.tsx
// Renders You.com agent responses with proper markdown rendering

import React, { useMemo } from 'react';
import { ExternalLink, FileText, Lightbulb, Target, TrendingUp, Users, Zap, Copy, Check, Building2, AlertTriangle, Rocket, BookOpen } from 'lucide-react';
import { useState } from 'react';
import type { RunAgentResponse, AgentSource } from '../../lib/services/youAgentClient';

interface AgentResponsePresenterProps {
  response: RunAgentResponse;
  onInsertToDoc?: (content: string) => void;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'snapshot': <Building2 size={16} className="text-blue-500" />,
  'overview': <FileText size={16} className="text-blue-500" />,
  'company': <Building2 size={16} className="text-blue-500" />,
  'icp': <Target size={16} className="text-green-500" />,
  'customer': <Users size={16} className="text-green-500" />,
  'pain': <Zap size={16} className="text-orange-500" />,
  'problem': <Zap size={16} className="text-orange-500" />,
  'trend': <TrendingUp size={16} className="text-purple-500" />,
  'market': <TrendingUp size={16} className="text-purple-500" />,
  'competitive': <Target size={16} className="text-red-500" />,
  'landscape': <Target size={16} className="text-red-500" />,
  'angle': <Lightbulb size={16} className="text-yellow-600" />,
  'outreach': <Lightbulb size={16} className="text-yellow-600" />,
  'gtm': <Rocket size={16} className="text-indigo-500" />,
  'recommendation': <Lightbulb size={16} className="text-yellow-600" />,
  'signal': <AlertTriangle size={16} className="text-amber-500" />,
  'risk': <AlertTriangle size={16} className="text-red-500" />,
  'summary': <BookOpen size={16} className="text-emerald-500" />,
  'takeaway': <BookOpen size={16} className="text-emerald-500" />,
  'how to use': <FileText size={16} className="text-blue-500" />,
  'founderhq': <FileText size={16} className="text-blue-500" />,
};

const getIconForHeading = (heading: string): React.ReactNode => {
  const lower = heading.toLowerCase();
  for (const [key, icon] of Object.entries(SECTION_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return <FileText size={16} className="text-gray-400" />;
};

export const AgentResponsePresenter: React.FC<AgentResponsePresenterProps> = ({
  response,
  onInsertToDoc,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!response.output) return;
    
    try {
      await navigator.clipboard.writeText(response.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Convert markdown to React elements
  const renderedContent = useMemo(() => {
    if (!response.output) return null;
    return renderMarkdown(response.output);
  }, [response.output]);

  if (!response.output && !response.error) {
    return (
      <div className="text-center text-gray-500 py-8">
        No response data available
      </div>
    );
  }

  if (response.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">Error</p>
        <p className="text-sm mt-1">{response.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex items-center justify-end gap-2 pb-2 border-b border-gray-100">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        {onInsertToDoc && (
          <button
            onClick={() => onInsertToDoc(response.output || '')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-yellow-400 hover:bg-yellow-500 text-black font-medium rounded-md transition-colors"
          >
            <FileText size={14} />
            Insert to Doc
          </button>
        )}
      </div>

      {/* Rendered Content - scrollable */}
      <div className="prose prose-sm max-w-none agent-response-content overflow-y-auto max-h-[60vh]">
        {renderedContent}
      </div>

      {/* Sources */}
      {response.sources && response.sources.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <ExternalLink size={14} />
            Sources ({response.sources.length})
          </h4>
          <div className="grid gap-2 md:grid-cols-2">
            {response.sources.slice(0, 8).map((source, idx) => (
              <SourceCard key={idx} source={source} />
            ))}
          </div>
          {response.sources.length > 8 && (
            <p className="text-xs text-gray-500 mt-2">
              +{response.sources.length - 8} more sources
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Render markdown text to React elements
 * Handles: headings, paragraphs, lists, tables, code blocks, horizontal rules, inline formatting
 */
function renderMarkdown(text: string): React.ReactNode {
  // Clean up citation references like [[1]](url) - we'll show sources separately
  const cleanedText = text.replace(/\[\[(\d+)\]\]\([^)]+\)/g, '');
  
  const lines = cleanedText.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol', items: string[] } | null = null;
  let currentTable: { headers: string[], rows: string[][] } | null = null;
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';
  let key = 0;

  const flushList = () => {
    if (currentList) {
      const ListTag = currentList.type === 'ol' ? 'ol' : 'ul';
      const listClass = currentList.type === 'ol' 
        ? 'list-decimal list-inside space-y-1.5 my-3 ml-4 text-gray-700'
        : 'list-disc list-inside space-y-1.5 my-3 ml-4 text-gray-700';
      
      elements.push(
        <ListTag key={key++} className={listClass}>
          {currentList.items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">{formatInlineMarkdown(item)}</li>
          ))}
        </ListTag>
      );
      currentList = null;
    }
  };

  const flushTable = () => {
    if (currentTable && currentTable.headers.length > 0) {
      elements.push(
        <div key={key++} className="overflow-x-auto my-4 rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {currentTable.headers.map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left font-semibold text-gray-700 border-b border-gray-200">
                    {formatInlineMarkdown(h.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentTable.rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-gray-50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2.5 text-gray-600">
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
        <pre key={key++} className="bg-gray-900 text-gray-100 rounded-lg p-4 my-3 overflow-x-auto text-sm font-mono">
          <code>{codeBlockContent.join('\n')}</code>
        </pre>
      );
      codeBlockContent = [];
      codeBlockLang = '';
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
        codeBlockLang = trimmedLine.slice(3).trim();
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
      elements.push(<hr key={key++} className="my-4 border-gray-200" />);
      continue;
    }

    // Table row
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      const cells = trimmedLine.slice(1, -1).split('|').map(c => c.trim());
      
      // Check if it's a separator row
      if (cells.every(c => /^[-:]+$/.test(c))) {
        continue; // Skip separator rows
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
      const level = headingMatch[1].length;
      const content = headingMatch[2].replace(/\*\*/g, ''); // Remove bold markers from headings
      
      const headingClasses: Record<number, string> = {
        1: 'text-xl font-bold text-gray-900 mt-6 mb-3 flex items-center gap-2',
        2: 'text-lg font-semibold text-gray-800 mt-5 mb-2 flex items-center gap-2',
        3: 'text-base font-semibold text-gray-700 mt-4 mb-2 flex items-center gap-2',
        4: 'text-sm font-medium text-gray-700 mt-3 mb-2 flex items-center gap-2',
      };

      const headingClass = headingClasses[level] || headingClasses[4];
      const icon = getIconForHeading(content);
      
      if (level === 1) {
        elements.push(<h2 key={key++} className={headingClass}>{icon}<span>{content}</span></h2>);
      } else if (level === 2) {
        elements.push(<h3 key={key++} className={headingClass}>{icon}<span>{content}</span></h3>);
      } else {
        elements.push(<h4 key={key++} className={headingClass}>{icon}<span>{content}</span></h4>);
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
    const unorderedMatch = trimmedLine.match(/^[-*+]\s+(.+)$/);
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
        <blockquote key={key++} className="border-l-4 border-blue-300 pl-4 py-2 my-3 bg-blue-50/50 text-gray-700 italic text-sm">
          {formatInlineMarkdown(quoteContent)}
        </blockquote>
      );
      continue;
    }

    // Regular paragraph
    flushList();
    flushTable();
    elements.push(
      <p key={key++} className="text-gray-700 text-sm leading-relaxed my-2">
        {formatInlineMarkdown(trimmedLine)}
      </p>
    );
  }

  // Flush any remaining content
  flushList();
  flushTable();
  flushCodeBlock();

  return <>{elements}</>;
}

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
          className="text-blue-600 hover:text-blue-800 underline"
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
      parts.push(<em key={key++} className="italic">{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Inline code `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono">
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
      // Special char at start but didn't match any pattern, consume it
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// Source card component
const SourceCard: React.FC<{ source: AgentSource }> = ({ source }) => {
  const domain = useMemo(() => {
    try {
      return new URL(source.url).hostname.replace('www.', '');
    } catch {
      return source.url;
    }
  }, [source.url]);

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group text-left border border-gray-100"
    >
      <ExternalLink size={12} className="text-gray-400 group-hover:text-blue-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate group-hover:text-blue-600">
          {source.title || domain}
        </p>
        <p className="text-xs text-gray-400 truncate">{domain}</p>
      </div>
    </a>
  );
};

export default AgentResponsePresenter;
