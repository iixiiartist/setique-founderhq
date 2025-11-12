import { AIAction } from './aiPromptBuilder';

/**
 * Parses AI-generated markdown content and converts to Tiptap-compatible HTML
 */
export function parseAIResponse(response: string, commandType: AIAction): string {
  // Clean up the response
  let content = response.trim();
  
  // Remove common AI response prefixes
  content = content.replace(/^(Here's|Here is|Sure,|Okay,|Certainly,|Generated Content:|Improved Version:|Expanded Version:|Summary:|Rewritten Version:)\s*/i, '');
  
  // Convert markdown to HTML
  
  // Code blocks (before other conversions)
  content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
  });
  
  // Inline code
  content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Headings (must be on their own line)
  content = content.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  content = content.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  content = content.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Bold and italic
  content = content.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  content = content.replace(/\*(.+?)\*/g, '<em>$1</em>');
  content = content.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  content = content.replace(/__(.+?)__/g, '<strong>$1</strong>');
  content = content.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // Strikethrough
  content = content.replace(/~~(.+?)~~/g, '<s>$1</s>');
  
  // Links
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Horizontal rules
  content = content.replace(/^(---|\*\*\*|___)$/gm, '<hr>');
  
  // Lists - unordered
  const unorderedListRegex = /^[*+-] (.+)$/gm;
  let listItems: string[] = [];
  content = content.replace(unorderedListRegex, (match, item) => {
    listItems.push(`<li>${item}</li>`);
    return '___UL_PLACEHOLDER___';
  });
  
  if (listItems.length > 0) {
    content = content.replace(/___UL_PLACEHOLDER___(\n___UL_PLACEHOLDER___)*/g, 
      `<ul>${listItems.join('')}</ul>`
    );
    listItems = [];
  }
  
  // Lists - ordered
  const orderedListRegex = /^\d+\. (.+)$/gm;
  content = content.replace(orderedListRegex, (match, item) => {
    listItems.push(`<li>${item}</li>`);
    return '___OL_PLACEHOLDER___';
  });
  
  if (listItems.length > 0) {
    content = content.replace(/___OL_PLACEHOLDER___(\n___OL_PLACEHOLDER___)*/g, 
      `<ol>${listItems.join('')}</ol>`
    );
  }
  
  // Blockquotes
  content = content.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');
  
  // Merge consecutive blockquotes
  content = content.replace(/<\/blockquote>\s*<blockquote>/g, '');
  
  // Paragraphs - wrap remaining lines that aren't already wrapped
  const lines = content.split('\n').filter(l => l.trim() !== '');
  const wrappedLines = lines.map(line => {
    // Don't wrap if already an HTML element
    if (line.match(/^<(h[1-6]|ul|ol|blockquote|pre|hr)/i)) {
      return line;
    }
    // Don't wrap if it's a closing tag
    if (line.match(/^<\/(ul|ol|blockquote|pre)>/i)) {
      return line;
    }
    // Wrap in paragraph
    return `<p>${line}</p>`;
  });
  
  content = wrappedLines.join('\n');
  
  // Clean up excessive newlines
  content = content.replace(/\n{3,}/g, '\n\n');
  
  return content;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Extract plain text from HTML (for previews)
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validate if content is safe to insert (basic XSS prevention)
 */
export function isSafeContent(content: string): boolean {
  // Block dangerous tags
  const dangerousTags = /<script|<iframe|<object|<embed|<link|<style|javascript:|data:/i;
  if (dangerousTags.test(content)) {
    console.error('Blocked potentially unsafe content from AI');
    return false;
  }
  return true;
}
