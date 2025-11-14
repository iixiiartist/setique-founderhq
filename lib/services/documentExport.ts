import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import TurndownService from 'turndown';
import { Editor } from '@tiptap/core';

/**
 * Export document to Markdown format
 */
export const exportToMarkdown = (editor: Editor, filename: string = 'document.md'): void => {
  const html = editor.getHTML();
  
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

  const markdown = turndownService.turndown(html);
  
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

/**
 * Export document to PDF format
 */
export const exportToPDF = async (
  editor: Editor,
  title: string = 'Document',
  filename: string = 'document.pdf'
): Promise<void> => {
  const editorElement = document.querySelector('.ProseMirror') as HTMLElement;
  
  if (!editorElement) {
    throw new Error('Editor element not found');
  }

  try {
    // Convert editor to image
    const dataUrl = await toPng(editorElement, {
      quality: 0.95,
      backgroundColor: '#ffffff',
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Calculate image dimensions to fit A4
    const img = new Image();
    img.src = dataUrl;
    await new Promise(resolve => {
      img.onload = resolve;
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 40; // 20mm margins
    const imgHeight = (img.height * imgWidth) / img.width;

    let heightLeft = imgHeight;
    let position = 20; // Start at top margin

    // Add image(s) across multiple pages if needed
    pdf.addImage(dataUrl, 'PNG', 20, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - position;

    while (heightLeft > 0) {
      pdf.addPage();
      position = heightLeft - imgHeight;
      pdf.addImage(dataUrl, 'PNG', 20, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Download PDF
    pdf.save(filename);
  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error('Failed to export PDF');
  }
};

/**
 * Export document to HTML format
 */
export const exportToHTML = (editor: Editor, filename: string = 'document.html'): void => {
  const html = editor.getHTML();
  
  // Wrap in a complete HTML document with styling
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
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
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

  // Download file
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
  const text = editor.getText();
  
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
