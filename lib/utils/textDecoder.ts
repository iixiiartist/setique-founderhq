/**
 * Utility to fix common email encoding issues (mojibake)
 * 
 * When UTF-8 encoded text (especially emojis) is incorrectly interpreted as 
 * Windows-1252 or ISO-8859-1, you get garbled characters like:
 * - ð instead of 😀
 * - â instead of various symbols
 * - Â followed by strange chars
 */

// Common mojibake patterns and their fixes
const MOJIBAKE_REPLACEMENTS: [string | RegExp, string][] = [
  // HTML entities for apostrophes and quotes
  [/&#39;/g, "'"],
  [/&apos;/g, "'"],
  [/&quot;/g, '"'],
  [/&amp;/g, '&'],
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&nbsp;/g, ' '],
  
  // Common UTF-8 mojibake - specific replacements
  ['â€™', "'"],       // Right single quote '
  ['â€˜', "'"],       // Left single quote '
  ['â€œ', '"'],       // Left double quote "
  ['â€', '"'],        // Right double quote "
  ['â€¦', '...'],     // Ellipsis …
  ['â€"', '–'],       // En dash –
  ['â€"', '—'],       // Em dash —
  ['â€¢', '•'],       // Bullet •
  ['â„¢', '™'],       // Trademark ™
  ['Â©', '©'],        // Copyright ©
  ['Â®', '®'],        // Registered ®
  ['Â°', '°'],        // Degree °
  ['Â ', ' '],        // Non-breaking space
  ['Â', ''],          // Orphan Â (common artifact)
  
  // Broken emoji patterns with replacement character (�)
  [/â\uFFFD\uFFFD/g, '⭐'],  // Common star emoji pattern
  [/â\uFFFD{1,3}/g, ''],     // Other broken sequences with â prefix
  [/\uFFFD+/g, ''],          // Lone replacement characters
  
  // Broken emoji patterns - various forms
  [/ð[\x80-\xBF]{0,3}/g, ''],  // 4-byte emoji sequences
  [/ðŸ[\x80-\xBF]{0,2}/g, ''], // Common emoji prefix
  [/â­[\x80-\xBF]?/g, '⭐'],   // Star emoji mojibake
  [/â[^\w\s<>&]{0,3}/g, ''],   // Generic â followed by garbage
  
  // Clean up double spaces that may result
  [/  +/g, ' '],
];

/**
 * Attempts to fix mojibake (encoding corruption) in email text
 */
export function fixEmailEncoding(text: string | null | undefined): string {
  if (!text) return '';
  
  let fixed = text;
  
  // Apply all mojibake fixes
  for (const [pattern, replacement] of MOJIBAKE_REPLACEMENTS) {
    if (typeof pattern === 'string') {
      // Use split/join for string replacements (replaces all occurrences)
      fixed = fixed.split(pattern).join(replacement);
    } else {
      fixed = fixed.replace(pattern, replacement);
    }
  }
  
  return fixed.trim();
}

/**
 * Fix encoding issues in HTML content
 * This preserves the HTML structure while fixing text encoding issues
 */
export function fixHtmlEncoding(html: string | null | undefined): string {
  if (!html) return '';
  
  let fixed = html;
  
  // Apply the same mojibake fixes to HTML content
  for (const [pattern, replacement] of MOJIBAKE_REPLACEMENTS) {
    if (typeof pattern === 'string') {
      fixed = fixed.split(pattern).join(replacement);
    } else {
      fixed = fixed.replace(pattern, replacement);
    }
  }
  
  // Additional HTML-specific cleanup for visible broken characters
  // The â followed by box/replacement characters (shows as â�� or similar)
  fixed = fixed.replace(/â[�\uFFFD]{1,3}/g, '');
  fixed = fixed.replace(/â[\u0080-\u009F]{1,3}/g, '');
  // eslint-disable-next-line no-useless-escape
  fixed = fixed.replace(/â[^\w\s.<>\/'\"=;:,!?@#$%^&*()\[\]{}|\\`~\-+]/g, '');
  
  // Clean leftover isolated â characters that aren't part of words
  fixed = fixed.replace(/(\s)â(\s)/g, '$1$2');
  fixed = fixed.replace(/^â\s/g, '');
  fixed = fixed.replace(/\sâ$/g, '');
  
  // Add UTF-8 charset meta tag if not present to help browser render correctly
  if (!fixed.includes('charset') && !fixed.includes('<head>')) {
    fixed = `<meta charset="UTF-8">${fixed}`;
  } else if (fixed.includes('<head>') && !fixed.includes('charset')) {
    fixed = fixed.replace('<head>', '<head><meta charset="UTF-8">');
  }
  
  return fixed;
}

/**
 * Simpler version that just strips problematic characters
 * Use this for display when you want clean text without emojis
 */
export function stripProblematicChars(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    // Decode HTML entities
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    // Remove any non-printable or problematic characters
    .replace(/[^\x20-\x7E\s\u00A0-\u00FF\u0100-\u017F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
