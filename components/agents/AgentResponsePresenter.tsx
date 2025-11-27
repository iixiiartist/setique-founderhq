// components/agents/AgentResponsePresenter.tsx
// Renders You.com agent responses in a nice, sectioned format

import React, { useMemo } from 'react';
import { ExternalLink, FileText, Lightbulb, Target, TrendingUp, Users, Zap, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { RunAgentResponse, AgentSource } from '../../lib/services/youAgentClient';

interface AgentResponsePresenterProps {
  response: RunAgentResponse;
  onInsertToDoc?: (content: string) => void;
}

// Parse markdown-like sections from the output
interface ParsedSection {
  type: 'heading' | 'paragraph' | 'list' | 'quote';
  level?: number;
  content: string;
  items?: string[];
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'snapshot': <FileText size={16} className="text-blue-500" />,
  'overview': <FileText size={16} className="text-blue-500" />,
  'icp': <Target size={16} className="text-green-500" />,
  'customer': <Users size={16} className="text-green-500" />,
  'pain': <Zap size={16} className="text-orange-500" />,
  'trend': <TrendingUp size={16} className="text-purple-500" />,
  'market': <TrendingUp size={16} className="text-purple-500" />,
  'angle': <Lightbulb size={16} className="text-yellow-500" />,
  'outreach': <Lightbulb size={16} className="text-yellow-500" />,
  'recommendation': <Lightbulb size={16} className="text-yellow-500" />,
  'competitive': <Target size={16} className="text-red-500" />,
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

  // Parse output into sections
  const parsedContent = useMemo(() => {
    if (!response.output) return [];

    const lines = response.output.split('\n');
    const sections: ParsedSection[] = [];
    let currentParagraph: string[] = [];
    let currentList: string[] = [];
    let inList = false;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        sections.push({
          type: 'paragraph',
          content: currentParagraph.join('\n').trim(),
        });
        currentParagraph = [];
      }
    };

    const flushList = () => {
      if (currentList.length > 0) {
        sections.push({
          type: 'list',
          content: '',
          items: [...currentList],
        });
        currentList = [];
        inList = false;
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();

      // Heading detection
      const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        sections.push({
          type: 'heading',
          level: headingMatch[1].length,
          content: headingMatch[2],
        });
        continue;
      }

      // Bold heading (like **Section:**)
      const boldHeadingMatch = trimmed.match(/^\*\*([^*]+)\*\*:?$/);
      if (boldHeadingMatch) {
        flushParagraph();
        flushList();
        sections.push({
          type: 'heading',
          level: 2,
          content: boldHeadingMatch[1],
        });
        continue;
      }

      // List item detection
      const listMatch = trimmed.match(/^[-•*]\s+(.+)$/);
      if (listMatch) {
        flushParagraph();
        inList = true;
        currentList.push(listMatch[1]);
        continue;
      }

      // Numbered list
      const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (numberedMatch) {
        flushParagraph();
        inList = true;
        currentList.push(numberedMatch[1]);
        continue;
      }

      // Quote detection
      if (trimmed.startsWith('>')) {
        flushParagraph();
        flushList();
        sections.push({
          type: 'quote',
          content: trimmed.slice(1).trim(),
        });
        continue;
      }

      // Empty line
      if (!trimmed) {
        if (inList) {
          flushList();
        } else {
          flushParagraph();
        }
        continue;
      }

      // Regular text
      if (inList) {
        flushList();
      }
      currentParagraph.push(trimmed);
    }

    flushParagraph();
    flushList();

    return sections;
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

      {/* Parsed Content */}
      <div className="prose prose-sm max-w-none">
        {parsedContent.map((section, idx) => {
          switch (section.type) {
            case 'heading':
              const HeadingTag = section.level === 1 ? 'h2' : section.level === 2 ? 'h3' : 'h4';
              const headingClasses = section.level === 1 
                ? 'text-lg font-bold text-gray-900 flex items-center gap-2 mt-6 mb-3'
                : section.level === 2
                ? 'text-base font-semibold text-gray-800 flex items-center gap-2 mt-4 mb-2'
                : 'text-sm font-medium text-gray-700 flex items-center gap-2 mt-3 mb-2';
              
              return (
                <HeadingTag key={idx} className={headingClasses}>
                  {getIconForHeading(section.content)}
                  {section.content}
                </HeadingTag>
              );

            case 'paragraph':
              return (
                <p key={idx} className="text-gray-700 text-sm leading-relaxed mb-3">
                  {formatInlineMarkdown(section.content)}
                </p>
              );

            case 'list':
              return (
                <ul key={idx} className="list-disc list-inside space-y-1.5 mb-4 ml-2">
                  {section.items?.map((item, i) => (
                    <li key={i} className="text-gray-700 text-sm">
                      {formatInlineMarkdown(item)}
                    </li>
                  ))}
                </ul>
              );

            case 'quote':
              return (
                <blockquote key={idx} className="border-l-3 border-blue-400 pl-4 py-1 my-3 text-gray-600 italic text-sm bg-blue-50 rounded-r">
                  {formatInlineMarkdown(section.content)}
                </blockquote>
              );

            default:
              return null;
          }
        })}
      </div>

      {/* Sources */}
      {response.sources && response.sources.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <ExternalLink size={14} />
            Sources ({response.sources.length})
          </h4>
          <div className="space-y-2">
            {response.sources.map((source, idx) => (
              <SourceCard key={idx} source={source} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Format inline markdown (bold, italic, links)
function formatInlineMarkdown(text: string): React.ReactNode {
  // Simple regex-based formatting
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Match bold, italic, and links
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // Bold
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3]) {
      // Italic
      parts.push(<em key={match.index}>{match[4]}</em>);
    } else if (match[5]) {
      // Link
      parts.push(
        <a
          key={match.index}
          href={match[7]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {match[6]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
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
      className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
    >
      <div className="flex-shrink-0 w-8 h-8 bg-white rounded flex items-center justify-center border border-gray-200">
        <ExternalLink size={14} className="text-gray-400 group-hover:text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
          {source.title || domain}
        </p>
        <p className="text-xs text-gray-500 truncate">{domain}</p>
        {source.snippet && (
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{source.snippet}</p>
        )}
      </div>
    </a>
  );
};

export default AgentResponsePresenter;
