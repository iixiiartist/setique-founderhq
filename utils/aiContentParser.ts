import MarkdownIt from 'markdown-it';
import { AIAction } from './aiPromptBuilder';

const markdownParser = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
}).enable(['table', 'strikethrough']);

const RESPONSE_PREFIX = /^(Here(?:'| i)s|Sure,|Okay,|Certainly,|Generated Content:|Improved Version:|Expanded Version:|Summary:|Rewritten Version:|Draft:|Output:)\u00A0?/i;

/**
 * Parses AI-generated markdown content and converts to Tiptap-compatible HTML
 */
export function parseAIResponse(response: string, _commandType?: AIAction): string {
  let content = response.trim();

  // Remove common AI response prefixes for cleaner insertion
  content = content.replace(RESPONSE_PREFIX, '');

  // Convert Markdown to HTML using markdown-it (keeps raw HTML disabled for safety)
  const rendered = markdownParser.render(content);
  return enhanceTaskLists(rendered);
}

function enhanceTaskLists(html: string): string {
  if (typeof document === 'undefined') {
    return html;
  }

  const template = document.createElement('template');
  template.innerHTML = html;
  const taskLists = Array.from(template.content.querySelectorAll('ul'));

  taskLists.forEach((list) => {
    let containsTasks = false;
    Array.from(list.children).forEach((item) => {
      if (!(item instanceof HTMLLIElement)) {
        return;
      }
      const textNode = findLeadingTextNode(item);
      if (!textNode) {
        return;
      }
      const match = textNode.textContent?.match(/^\s*\[( |x|X)\]\s*/);
      if (!match) {
        return;
      }
      containsTasks = true;
      const isChecked = match[1].toLowerCase() === 'x';
      textNode.textContent = textNode.textContent?.replace(/^\s*\[(?: |x|X)\]\s*/, '') ?? '';
      item.setAttribute('data-type', 'taskItem');
      item.setAttribute('data-checked', String(isChecked));
    });

    if (containsTasks) {
      list.setAttribute('data-type', 'taskList');
    }
  });

  return template.innerHTML;
}

function findLeadingTextNode(element: HTMLElement): Text | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  return walker.nextNode() as Text | null;
}

/**
 * Extract plain text from HTML (for previews)
 */
export function htmlToPlainText(html: string): string {
  return html
  .replace(/<br\s*\/?>(?=\s*)/gi, '\n')
    .replace(/<\/(p|div|li|section|article|h[1-6]|tr)>/gi, '\n')
    .replace(/<\/(ul|ol|table)>/gi, '\n\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
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
