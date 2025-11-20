import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import TurndownService from 'turndown';
import { Editor } from '@tiptap/core';

declare global {
  interface Window {
    html2canvas?: typeof html2canvas;
  }
}

if (typeof window !== 'undefined') {
  window.html2canvas = html2canvas;
}

type PDFPageFormat = 'a3' | 'a4' | 'a5' | 'letter' | 'legal';
type PDFOrientation = 'portrait' | 'landscape';

type CitationInlineFormat = 'plain' | 'markdown';

interface FootnoteEntry {
  number: string;
  text: string;
}

interface PDFExportOptions {
  title?: string;
  filename?: string;
  orientation?: PDFOrientation;
  pageSize?: PDFPageFormat;
  margin?: number;
  includePageNumbers?: boolean;
  includeCoverPage?: boolean;
  coverSubtitle?: string;
  coverMeta?: string;
  brandColor?: string;
  footerNote?: string;
}

interface HtmlDocumentOptions {
  title?: string;
  accentColor?: string;
  includeCoverPage?: boolean;
  coverSubtitle?: string;
  coverMeta?: string;
}

interface CitationTransformOptions {
  inlineFormat?: CitationInlineFormat;
  referenceHeading?: {
    tag: string;
    text: string;
  };
}

interface CitationTransformResult {
  html: string;
  footnotes: FootnoteEntry[];
}

const DEFAULT_REFERENCE_HEADING = { tag: 'h2', text: 'References' } as const;
const DEFAULT_ACCENT_COLOR = '#111827';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const BASE_DOCUMENT_STYLES = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
    color: #333;
  }
  h1, h2, h3, h4, h5, h6 {
    font-weight: bold;
    margin-top: 24px;
    margin-bottom: 16px;
    line-height: 1.25;
  }
  h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 8px; }
  h2 { font-size: 1.5em; }
  h3 { font-size: 1.25em; }
  p { margin-bottom: 16px; }
  a { color: #0366d6; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .doc-citation {
    font-size: 0.75rem;
    vertical-align: super;
    margin-left: 0.15rem;
  }
  .doc-citation a {
    color: #4338ca;
    font-weight: 600;
    text-decoration: none;
  }
  .doc-citation a:hover {
    text-decoration: underline;
  }
  .doc-reference-divider {
    margin-top: 2rem;
    margin-bottom: 1rem;
    border: none;
    border-top: 1px solid #e5e7eb;
  }
  .doc-footnote {
    font-size: 0.95rem;
    color: #475467;
    margin-top: 0.5rem;
    line-height: 1.5;
  }
  .doc-footnote a {
    color: #0366d6;
    text-decoration: underline;
  }
  img { max-width: 100%; height: auto; }
  code { background: #f6f8fa; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
  pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
  blockquote { border-left: 4px solid #dfe2e5; padding-left: 16px; color: #6a737d; margin: 16px 0; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #dfe2e5; padding: 8px 12px; text-align: left; }
  th { background: #f6f8fa; font-weight: bold; }
  ul, ol { padding-left: 24px; margin-bottom: 16px; }
  li { margin-bottom: 4px; }
  mark { background: #fff3bf; padding: 2px 0; }
  .task-list { list-style: none; padding-left: 0; }
  .task-item { display: flex; align-items: flex-start; }
  .task-item input[type="checkbox"] { margin-right: 8px; margin-top: 4px; }
  .page-break {
    page-break-after: always;
    break-after: page;
    margin: 40px 0;
    border-top: 2px dashed #ccc;
    border-bottom: 2px dashed #ccc;
    padding: 20px 0;
    text-align: center;
    color: #999;
    font-size: 0.875rem;
  }
  [data-type="chart"] {
    margin: 24px 0;
    padding: 16px;
    border: 1px solid #dfe2e5;
    border-radius: 6px;
    background: #f9fafb;
  }
  [data-type="chart"] h4 {
    margin: 0 0 12px 0;
    font-size: 1.1em;
    color: #333;
  }
  @media print {
    .page-break {
      border: none;
      margin: 0;
      padding: 0;
    }
    [data-type="chart"] {
      page-break-inside: avoid;
    }
  }
`;
const buildCoverSection = (title: string, subtitle: string, meta: string): string => {
  return `
  <section class="pdf-cover">
    <div class="pdf-cover__tag">${escapeHtml('FounderHQ Briefing')}</div>
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="pdf-cover__subtitle">${escapeHtml(subtitle)}</p>` : ''}
    <div class="pdf-cover__meta">
      <span>${escapeHtml(meta)}</span>
      <span>${new Date().toLocaleDateString()}</span>
    </div>
    <div class="pdf-cover__bar"></div>
  </section>
  <div class="page-break"></div>
`;
};

const buildDocumentHtml = (content: string, options: HtmlDocumentOptions = {}): string => {
  const accentColor = options.accentColor || DEFAULT_ACCENT_COLOR;
  const coverHtml = options.includeCoverPage
  ? buildCoverSection(options.title || 'Document', options.coverSubtitle || 'Confidential GTM Briefing', options.coverMeta || 'Prepared by FounderHQ')
    : '';

  const accentStyles = `
    .pdf-cover__tag {
      border: 1px solid ${accentColor};
      color: ${accentColor};
    }
    .pdf-cover__bar {
      height: 6px;
      width: 120px;
      background: linear-gradient(90deg, ${accentColor}, #6366f1);
      border-radius: 999px;
      margin-top: 1.5rem;
    }
    .pdf-document {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 32px;
      padding: 64px 72px;
      box-shadow: 0 30px 80px rgba(15, 23, 42, 0.08);
    }
    .pdf-cover {
      min-height: 70vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1.25rem;
    }
    .pdf-cover h1 {
      font-size: 3rem;
      line-height: 1.1;
      margin: 0;
      color: #0f172a;
    }
    .pdf-cover__subtitle {
      font-size: 1.25rem;
      color: #475467;
      margin: 0;
    }
    .pdf-cover__tag {
      display: inline-flex;
      align-items: center;
      padding: 0.35rem 0.85rem;
      border-radius: 999px;
      letter-spacing: 0.2em;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .pdf-cover__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.9rem;
      color: #616d86;
    }
    .pdf-body {
      margin-top: 2rem;
    }
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title || 'Document'}</title>
  <style>
${BASE_DOCUMENT_STYLES}
${accentStyles}
  </style>
</head>
<body>
  <div class="pdf-document">
    ${coverHtml}
    <section class="pdf-body">
      ${content}
    </section>
  </div>
</body>
</html>`;
};

const sortFootnotes = (footnotes: FootnoteEntry[]): FootnoteEntry[] => {
  return [...footnotes].sort((a, b) => Number(a.number) - Number(b.number));
};

const parseHtmlString = (html: string): Document | null => {
  if (typeof DOMParser === 'undefined') {
    return null;
  }

  try {
    return new DOMParser().parseFromString(html, 'text/html');
  } catch (error) {
    console.warn('Failed to parse HTML for export', error);
    return null;
  }
};

const decodeHtmlEntities = (value: string): string => {
  if (typeof document === 'undefined') {
    return value;
  }
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

const replaceCitationNodes = (doc: Document, format: CitationInlineFormat) => {
  const citationNodes = doc.querySelectorAll('sup.doc-citation');
  citationNodes.forEach((node) => {
    const rawNumber = node.getAttribute('data-citation-number')
      || node.textContent?.replace(/[^0-9]/g, '')
      || '';
    if (!rawNumber) return;
    const marker = format === 'markdown' ? `[^${rawNumber}]` : `[${rawNumber}]`;
    const textNode = doc.createTextNode(marker);
    node.parentNode?.replaceChild(textNode, node);
  });
};

const extractFootnotes = (doc: Document): FootnoteEntry[] => {
  const nodes = Array.from(doc.querySelectorAll('.doc-footnote'));
  return nodes.map((node, index) => {
    const number = node.getAttribute('data-citation-number') || String(index + 1);
    const displayAttr = node.getAttribute('data-footnote-display');
    let text = displayAttr ? decodeHtmlEntities(displayAttr) : '';

    if (!text) {
      text = node.textContent?.replace(/\s+/g, ' ').trim() || '';
    }

    const url = node.getAttribute('data-source-url');
    if (url && !text.includes(url)) {
      text += text ? ` (${url})` : url;
    }

    return {
      number,
      text,
    };
  });
};

const ensureReferenceHeadingNode = (doc: Document, tag: string, text: string) => {
  const footnotes = doc.querySelectorAll('.doc-footnote');
  if (!footnotes.length) {
    return;
  }

  const existingHeading = doc.querySelector('[data-doc-references]');
  if (existingHeading) {
    if (existingHeading.textContent?.trim() !== text) {
      existingHeading.textContent = text;
    }
    const tagName = tag.toLowerCase();
    if (existingHeading.tagName.toLowerCase() !== tagName) {
      const newHeading = doc.createElement(tag);
      newHeading.textContent = text;
      newHeading.setAttribute('data-doc-references', 'true');
      existingHeading.replaceWith(newHeading);
    }
    return;
  }

  const heading = doc.createElement(tag);
  heading.textContent = text;
  heading.setAttribute('data-doc-references', 'true');

  const divider = doc.querySelector('.doc-reference-divider');
  if (divider && divider.parentNode) {
    divider.parentNode.insertBefore(heading, divider.nextSibling);
    return;
  }

  const firstFootnote = footnotes[0];
  firstFootnote.parentNode?.insertBefore(heading, firstFootnote);
};

const transformCitations = (html: string, options: CitationTransformOptions = {}): CitationTransformResult => {
  const doc = parseHtmlString(html);
  if (!doc) {
    return { html, footnotes: [] };
  }

  if (options.inlineFormat) {
    replaceCitationNodes(doc, options.inlineFormat);
  }

  if (options.referenceHeading) {
    ensureReferenceHeadingNode(doc, options.referenceHeading.tag, options.referenceHeading.text);
  }

  const footnotes = extractFootnotes(doc);
  return {
    html: doc.body.innerHTML,
    footnotes,
  };
};

const htmlToPlainText = (html: string): string => {
  if (typeof document === 'undefined') {
    return html;
  }

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
};

/**
 * Export document to Markdown format
 */
export const exportToMarkdown = (editor: Editor, filename: string = 'document.md'): void => {
  const { html, footnotes } = transformCitations(editor.getHTML(), { inlineFormat: 'markdown' });
  
  // Configure turndown for Tiptap HTML
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  // Add custom rules for Tiptap extensions
  turndownService.addRule('highlight', {
    filter: node => {
      return node.nodeName === 'MARK' && node.classList.contains('highlight');
    },
    replacement: (content) => {
      return `==${content}==`;
    },
  });

  turndownService.addRule('taskList', {
    filter: node => {
      return node.nodeName === 'UL' && node.getAttribute('data-type') === 'taskList';
    },
    replacement: (content) => {
      return content;
    },
  });

  turndownService.addRule('taskItem', {
    filter: node => {
      return node.nodeName === 'LI' && node.getAttribute('data-type') === 'taskItem';
    },
    replacement: (content, node: any) => {
      const checked = node.getAttribute('data-checked') === 'true';
      return `- [${checked ? 'x' : ' '}] ${content}\n`;
    },
  });

  turndownService.addRule('pageBreak', {
    filter: node => {
      return node.nodeName === 'DIV' && node.getAttribute('data-type') === 'page-break';
    },
    replacement: () => {
      return '\n\n---\n\n';
    },
  });

  turndownService.addRule('chartNode', {
    filter: node => {
      return node.nodeName === 'DIV' && node.getAttribute('data-type') === 'chart';
    },
    replacement: (content, node: any) => {
      const title = node.getAttribute('data-chart-title') || 'Chart';
      const chartType = node.getAttribute('data-chart-type') || 'chart';
      return `\n\n[Chart: ${title} (${chartType})]\n\n`;
    },
  });

  let markdown = turndownService.turndown(html);

  if (footnotes.length) {
    const referencesBlock = sortFootnotes(footnotes)
      .map((note) => `[^${note.number}]: ${note.text || 'Source'}`)
      .join('\n');

    markdown += `\n\n## References\n\n${referencesBlock}`;
  }
  
  // Download file
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const createHiddenRenderContainer = (html: string): HTMLElement => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '-10000px';
  container.style.width = '900px';
  container.style.backgroundColor = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
};

const hexToRgb = (hex?: string): { r: number; g: number; b: number } | null => {
  if (!hex) return null;
  const normalized = hex.replace('#', '');
  if (![3, 6].includes(normalized.length)) return null;
  const full = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const decoratePdfPages = (pdf: jsPDF, config: {
  margin: number;
  title: string;
  footerNote?: string;
  includePageNumbers: boolean;
  brandColor?: string;
}) => {
  const pageCount = pdf.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const accent = hexToRgb(config.brandColor || DEFAULT_ACCENT_COLOR) || { r: 28, g: 27, b: 31 };
  const headerDate = new Date().toLocaleDateString();

  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(accent.r, accent.g, accent.b);
    pdf.setLineWidth(0.75);
    pdf.line(config.margin, config.margin - 12, pageWidth - config.margin, config.margin - 12);
    pdf.line(config.margin, pageHeight - config.margin + 12, pageWidth - config.margin, pageHeight - config.margin + 12);

    pdf.setFontSize(10);
    pdf.setTextColor(30, 30, 30);
    pdf.text(config.title, config.margin, config.margin - 18);
    pdf.setTextColor(120, 120, 120);
    pdf.text(headerDate, pageWidth - config.margin, config.margin - 18, { align: 'right' });

    if (config.footerNote || config.includePageNumbers) {
      pdf.setFontSize(9);
      pdf.setTextColor(90, 94, 107);
      if (config.footerNote) {
        pdf.text(config.footerNote, config.margin, pageHeight - config.margin + 28);
      }
      if (config.includePageNumbers) {
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - config.margin, pageHeight - config.margin + 28, {
          align: 'right',
        });
      }
    }
  }
};

/**
 * Export document to PDF format
 */
export const exportToPDF = async (
  editor: Editor,
  optionsOrTitle?: PDFExportOptions | string,
  legacyFilename?: string
): Promise<void> => {
  if (typeof document === 'undefined') {
    throw new Error('PDF export is only available in the browser');
  }

  const options: PDFExportOptions =
    typeof optionsOrTitle === 'string'
      ? { title: optionsOrTitle, filename: legacyFilename }
      : optionsOrTitle || {};

  const title = options.title || 'Document';
  const filename = options.filename || 'document.pdf';
  const orientation: PDFOrientation = options.orientation || 'portrait';
  const format: PDFPageFormat = options.pageSize || 'a4';
  const margin = Math.max(options.margin ?? 48, 36);
  const includePageNumbers = options.includePageNumbers ?? true;
  const includeCoverPage = options.includeCoverPage ?? true;
  const brandColor = options.brandColor || DEFAULT_ACCENT_COLOR;
  const coverSubtitle = options.coverSubtitle || 'Confidential GTM Briefing';
  const coverMeta = options.coverMeta || 'Prepared by FounderHQ';
  const footerNote = options.footerNote || 'FounderHQ • setique.com';

  const { html } = transformCitations(editor.getHTML(), {
    referenceHeading: DEFAULT_REFERENCE_HEADING,
  });
  const fullHtml = buildDocumentHtml(html, {
    title,
    accentColor: brandColor,
    includeCoverPage,
    coverSubtitle,
    coverMeta,
  });
  const container = createHiddenRenderContainer(fullHtml);

  try {
    const pdf = new jsPDF({ orientation, unit: 'pt', format });
    const renderWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const renderStartY = margin + 32; // Leave room for header overlay

    await pdf.html(container, {
      x: margin,
      y: renderStartY,
      width: renderWidth,
      autoPaging: 'text',
      html2canvas: {
        scale: 0.9,
        useCORS: true,
        windowWidth: container.clientWidth,
      },
    });
    decoratePdfPages(pdf, {
      margin,
      title,
      footerNote,
      includePageNumbers,
      brandColor,
    });

    pdf.save(filename);
  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error('Failed to export PDF');
  } finally {
    document.body.removeChild(container);
  }
};

/**
 * Export document to HTML format
 */
export const exportToHTML = (
  editor: Editor,
  filename: string = 'document.html',
  title: string = 'Document'
): void => {
  const { html } = transformCitations(editor.getHTML(), {
    referenceHeading: DEFAULT_REFERENCE_HEADING,
  });
  const fullHtml = buildDocumentHtml(html, { title, accentColor: DEFAULT_ACCENT_COLOR, includeCoverPage: false });

  const blob = new Blob([fullHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Export document to plain text format
 */
export const exportToText = (editor: Editor, filename: string = 'document.txt'): void => {
  const { html, footnotes } = transformCitations(editor.getHTML(), { inlineFormat: 'plain' });
  let text = htmlToPlainText(html);

  if (footnotes.length) {
    const referenceText = sortFootnotes(footnotes)
      .map((note) => `[${note.number}] ${note.text || 'Source'}`)
      .join('\n');
    text += `\n\nReferences:\n${referenceText}`;
  }
  
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Helper to generate filename from title
 */
export const generateFilename = (title: string, extension: string): string => {
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `${sanitized || 'document'}.${extension}`;
};
