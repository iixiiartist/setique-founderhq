/**
 * AI Sidebar Component
 * Research and AI-powered content generation for Content Studio
 * Production-ready with real backend integration
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Search,
  X,
  Send,
  Loader2,
  FileText,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronRight,
  Globe,
  BookOpen,
  Lightbulb,
  Wand2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Quote,
  List,
  Heading,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import * as fabric from 'fabric';
import { useContentStudio } from './ContentStudioContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ScrollArea } from '../ui/ScrollArea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/Collapsible';
import { ResearchResult } from './types';
import { supabase } from '../../lib/supabase';
import { showError, showSuccess } from '../../lib/utils/toast';

interface AISidebarProps {
  className?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: ResearchResult[];
  isStreaming?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'headline',
    label: 'Generate Headlines',
    icon: <Heading className="w-4 h-4" />,
    prompt: 'Generate 5 compelling headlines for my content about:',
  },
  {
    id: 'bullets',
    label: 'Create Bullet Points',
    icon: <List className="w-4 h-4" />,
    prompt: 'Create 5 concise bullet points explaining:',
  },
  {
    id: 'testimonial',
    label: 'Draft Testimonial',
    icon: <Quote className="w-4 h-4" />,
    prompt: 'Write a realistic customer testimonial for a product that:',
  },
  {
    id: 'cta',
    label: 'CTA Copy',
    icon: <Wand2 className="w-4 h-4" />,
    prompt: 'Write compelling call-to-action copy for:',
  },
];

export function AISidebar({ className = '' }: AISidebarProps) {
  const { state, toggleAIPanel, canvasRef } = useContentStudio();
  const [activeTab, setActiveTab] = useState<'chat' | 'research'>('chat');
  const [inputValue, setInputValue] = useState('');
  const [researchQuery, setResearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'system',
      content: 'Hi! I\'m your AI content assistant. I can help you generate copy, research topics, or create content blocks. What would you like to work on?',
      timestamp: new Date(),
    },
  ]);
  const [researchResults, setResearchResults] = useState<ResearchResult[]>([]);
  const [expandedSources, setExpandedSources] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Determine content type from prompt
  const getContentType = (prompt: string): string => {
    const lower = prompt.toLowerCase();
    if (lower.includes('headline') || lower.includes('title')) return 'headline';
    if (lower.includes('bullet') || lower.includes('point') || lower.includes('list')) return 'bullets';
    if (lower.includes('testimonial') || lower.includes('review')) return 'testimonial';
    if (lower.includes('cta') || lower.includes('call to action') || lower.includes('button')) return 'cta';
    if (lower.includes('research') || lower.includes('data') || lower.includes('stats')) return 'research';
    return 'body';
  };

  // Call the AI edge function
  const callAI = async (type: string, prompt: string, context?: string): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Please sign in to use AI features');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/content-studio-ai`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, prompt, context, stream: false }),
    });

    // Handle rate limiting
    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (remaining) {
      setRateLimitRemaining(parseInt(remaining, 10));
    }

    if (response.status === 429) {
      const data = await response.json();
      throw new Error(`Rate limit exceeded. Try again in ${data.resetIn} seconds.`);
    }

    if (response.status === 401) {
      throw new Error('Please sign in to use AI features');
    }

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'AI generation failed');
    }

    const data = await response.json();
    return data.content;
  };

  // Handle chat message send
  const handleSendMessage = useCallback(async (prompt?: string) => {
    const messageText = prompt || inputValue.trim();
    if (!messageText || isLoading) return;

    setError(null);
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Create streaming assistant message
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const contentType = getContentType(messageText);
      const response = await callAI(contentType, messageText);
      
      // Simulate streaming for better UX
      let currentContent = '';
      for (let i = 0; i < response.length; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 10));
        currentContent = response.slice(0, i + 5);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? { ...msg, content: currentContent }
              : msg
          )
        );
      }

      // Mark as done streaming
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessage.id
            ? { ...msg, content: response, isStreaming: false }
            : msg
        )
      );
    } catch (err: any) {
      console.error('[AISidebar] Error:', err);
      setError(err.message);
      
      // Update message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessage.id
            ? { ...msg, content: `Error: ${err.message}`, isStreaming: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading]);

  // Handle research (uses the You.com API via existing edge function)
  const handleResearch = useCallback(async () => {
    if (!researchQuery.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in to use research features');
      }

      // Use the ai-search edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: researchQuery }),
      });

      if (!response.ok) {
        throw new Error('Research failed. Please try again.');
      }

      const data = await response.json();
      
      // Transform results to our format
      const results: ResearchResult[] = (data.results || data.hits || []).slice(0, 5).map((item: any, index: number) => ({
        id: String(index + 1),
        title: item.title || item.name || 'Untitled',
        snippet: item.snippet || item.description || item.text || '',
        url: item.url || item.link || '#',
        source: new URL(item.url || 'https://example.com').hostname.replace('www.', ''),
        timestamp: new Date().toISOString(),
      }));

      setResearchResults(results);
      
      if (results.length === 0) {
        setError('No results found. Try a different search term.');
      }
    } catch (err: any) {
      console.error('[AISidebar] Research error:', err);
      setError(err.message);
      setResearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [researchQuery, isLoading]);

  // Insert content to canvas
  const handleInsertToCanvas = useCallback((content: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const text = new fabric.IText(content, {
      left: 100,
      top: 100,
      fontSize: 16,
      fontFamily: 'Inter',
      fill: '#1f2937',
      width: 400,
    });
    (text as any).id = Date.now().toString();
    (text as any).name = 'AI Generated Text';
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  }, [canvasRef]);

  // Copy to clipboard
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  if (!state.isAIPanelOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className={`h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden ${className}`}
      style={{ 
        width: 'clamp(288px, 25vw, 384px)', // min 288px (w-72), max 384px (w-96)
        zIndex: 20,
        maxWidth: '35vw' // AI panel can be slightly wider
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-gray-900">AI Assistant</span>
            <p className="text-xs text-gray-500">
              {rateLimitRemaining !== null ? `${rateLimitRemaining} requests remaining` : 'Powered by AI'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleAIPanel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-700 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'research')} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-2 max-w-[calc(100%-2rem)]">
          <TabsTrigger value="chat" className="text-sm">
            <Wand2 className="w-4 h-4 mr-2" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="research" className="text-sm">
            <Globe className="w-4 h-4 mr-2" />
            Research
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="flex-1 flex flex-col p-0 mt-0">
          {/* Quick Actions */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() => setInputValue(action.prompt)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    {message.role === 'assistant' && !message.isStreaming && (
                      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200">
                        <button
                          onClick={() => handleCopy(message.content)}
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                        <button
                          onClick={() => handleInsertToCanvas(message.content)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add to Canvas
                        </button>
                      </div>
                    )}
                    {message.isStreaming && (
                      <Loader2 className="w-4 h-4 animate-spin mt-1" />
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="relative">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe what you want to create..."
                className="min-h-[80px] pr-12 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                size="sm"
                className="absolute right-2 bottom-2 h-8 w-8 p-0 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Research Tab */}
        <TabsContent value="research" className="flex-1 flex flex-col p-0 mt-0">
          {/* Search Input */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={researchQuery}
                onChange={(e) => setResearchQuery(e.target.value)}
                placeholder="Research any topic..."
                className="pl-10 pr-20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleResearch();
                  }
                }}
              />
              <Button
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                onClick={handleResearch}
                disabled={!researchQuery.trim() || isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </Button>
            </div>
          </div>

          {/* Results */}
          <ScrollArea className="flex-1 px-4 py-4">
            {researchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center">
                <Globe className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Search for any topic</p>
                <p className="text-xs mt-1">Get real-time information and citations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {researchResults.map((result) => (
                  <Collapsible
                    key={result.id}
                    open={expandedSources.includes(result.id)}
                    onOpenChange={(open) => {
                      setExpandedSources((prev) =>
                        open
                          ? [...prev, result.id]
                          : prev.filter((id) => id !== result.id)
                      );
                    }}
                  >
                    <div className="bg-gray-50 rounded-lg p-3">
                      <CollapsibleTrigger className="w-full text-left">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <BookOpen className="w-3 h-3 text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {result.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">{result.source}</p>
                          </div>
                          {expandedSources.includes(result.id) ? (
                            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-600">
                            {result.snippet}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() =>
                                result.url !== '#' && window.open(result.url, '_blank')
                              }
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Open
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700"
                              onClick={() => handleInsertToCanvas(result.snippet)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Insert
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

export default AISidebar;
