/**
 * YouTube Embed Utilities
 * 
 * This module handles YouTube video embeds for different contexts:
 * - Email: YouTube iframes are NOT supported in email clients, so we convert them
 *   to clickable thumbnail images with a play button overlay
 * - HTML Export: We ensure the iframe uses the correct format for standalone HTML files
 */

/**
 * Extract YouTube video ID from various URL formats
 */
export const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;
  
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};

/**
 * Get YouTube thumbnail URL for a video ID
 * Uses maxresdefault (1280x720) with fallback to hqdefault (480x360)
 */
export const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

/**
 * Get a fallback thumbnail (lower resolution but always exists)
 */
export const getYouTubeThumbnailFallback = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

/**
 * Get the watch URL for a video
 */
export const getYouTubeWatchUrl = (videoId: string): string => {
  return `https://www.youtube.com/watch?v=${videoId}`;
};

/**
 * Convert YouTube iframe embeds to clickable thumbnail images for email clients
 * 
 * Email clients don't support iframes, so we replace them with a styled
 * thumbnail image that links to the video on YouTube
 */
export const convertYouTubeForEmail = (html: string): string => {
  if (!html) return html;
  
  // Match YouTube iframe elements (including those with various attributes)
  // TipTap generates: <div data-youtube-video><iframe src="..."></iframe></div>
  const iframePattern = /<div[^>]*data-youtube-video[^>]*>[\s\S]*?<iframe[^>]*src=["']([^"']+)["'][^>]*>[\s\S]*?<\/iframe>[\s\S]*?<\/div>/gi;
  
  return html.replace(iframePattern, (match, src) => {
    const videoId = extractYouTubeId(src);
    if (!videoId) return match; // Keep original if we can't extract ID
    
    const thumbnailUrl = getYouTubeThumbnail(videoId);
    const watchUrl = getYouTubeWatchUrl(videoId);
    
    // Create an email-friendly clickable thumbnail with play button overlay
    return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0;">
  <tr>
    <td align="center">
      <a href="${watchUrl}" target="_blank" style="display: inline-block; text-decoration: none;">
        <table cellpadding="0" cellspacing="0" border="0" style="position: relative;">
          <tr>
            <td style="position: relative;">
              <img 
                src="${thumbnailUrl}" 
                alt="YouTube Video" 
                style="max-width: 560px; width: 100%; height: auto; border-radius: 8px; display: block;"
                onerror="this.src='${getYouTubeThumbnailFallback(videoId)}'"
              />
              <!-- Play button overlay using table-based approach for email compatibility -->
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 68px; height: 48px; background: rgba(255, 0, 0, 0.9); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                <div style="width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-left: 20px solid white; margin-left: 4px;"></div>
              </div>
            </td>
          </tr>
        </table>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280; text-align: center;">
          Click to watch on YouTube ▶
        </p>
      </a>
    </td>
  </tr>
</table>`;
  });
};

/**
 * Alternative simpler email format that works better across more email clients
 * Uses basic HTML that's guaranteed to work in Gmail, Outlook, etc.
 */
export const convertYouTubeForEmailSimple = (html: string): string => {
  if (!html) return html;
  
  // Match YouTube iframe elements
  const iframePattern = /<div[^>]*data-youtube-video[^>]*>[\s\S]*?<iframe[^>]*src=["']([^"']+)["'][^>]*>[\s\S]*?<\/iframe>[\s\S]*?<\/div>/gi;
  
  return html.replace(iframePattern, (match, src) => {
    const videoId = extractYouTubeId(src);
    if (!videoId) return match;
    
    const thumbnailUrl = getYouTubeThumbnailFallback(videoId); // Use fallback for reliability
    const watchUrl = getYouTubeWatchUrl(videoId);
    
    // Simple, reliable format for all email clients
    return `
<div style="margin: 16px 0; text-align: center;">
  <a href="${watchUrl}" target="_blank" style="display: inline-block; text-decoration: none;">
    <img 
      src="${thumbnailUrl}" 
      alt="YouTube Video - Click to watch" 
      width="480" 
      height="360" 
      style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;"
    />
    <br/>
    <span style="display: inline-block; margin-top: 8px; padding: 8px 16px; background-color: #ff0000; color: white; font-size: 14px; font-weight: 500; border-radius: 4px; text-decoration: none;">
      ▶ Watch on YouTube
    </span>
  </a>
</div>`;
  });
};

/**
 * Convert YouTube embeds for HTML export
 * Uses standard youtube.com (not nocookie) to avoid 403 errors when opening locally
 */
export const convertYouTubeForHtmlExport = (html: string): string => {
  if (!html) return html;
  
  // Replace youtube-nocookie.com with youtube.com to avoid 403 errors
  // Also add proper attributes for local file viewing
  return html.replace(
    /<iframe([^>]*)src=["']https:\/\/www\.youtube-nocookie\.com\/embed\/([^"'?]+)([^"']*)["']([^>]*)>/gi,
    (match, before, videoId, params, after) => {
      // Use standard YouTube embed which has better compatibility
      return `<iframe${before}src="https://www.youtube.com/embed/${videoId}${params}"${after} allowfullscreen loading="lazy">`;
    }
  );
};

/**
 * Detect if HTML contains YouTube embeds
 */
export const hasYouTubeEmbed = (html: string): boolean => {
  if (!html) return false;
  return /data-youtube-video|youtube\.com\/embed|youtube-nocookie\.com\/embed|youtu\.be/i.test(html);
};
