// Netlify Edge Function for serving dynamic OG meta tags to social crawlers
// This runs at the edge before requests hit the SPA

import type { Context } from "https://edge.netlify.com";

const SUPABASE_URL = "https://jffnzpdcmdalxqhkfymx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZm56cGRjbWRhbHhxaGtmeW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTE3NTIsImV4cCI6MjA3NzM2Nzc1Mn0.cvjpoEFsD-_2PWucGXNP_2Pq9QTj3-lXpQ2lWrF16R8";
const SITE_URL = "https://founderhq.setique.com";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

// Detect social media crawlers/bots by User-Agent
function isCrawlerUA(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  
  // Only match actual bot/crawler user agents
  const crawlers = [
    'facebookexternalhit',
    'facebot',
    'twitterbot',
    'linkedinbot',
    'slackbot',
    'slackbot-linkexpanding',
    'discordbot',
    'telegrambot',
    'applebot',
    'googlebot',
    'bingbot',
    'pinterestbot',
    'redditbot',
    'embedly',
    'quora link preview',
    'outbrain',
    'vkshare',
    'skypeuripreview',
    'nuzzel',
    'w3c_validator',
    'baiduspider',
    'yandexbot',
    'whatsapp',  // WhatsApp preview bot
  ];
  
  return crawlers.some(bot => ua.includes(bot));
}

// Check if this is a preview-specific request (not a user navigation)
function isPreviewRequest(request: Request): boolean {
  // Check for explicit preview headers (Facebook, etc.)
  const xPurpose = request.headers.get('x-purpose') || '';
  const xFbPurpose = request.headers.get('x-fb-purpose') || '';
  if (xPurpose === 'preview' || xFbPurpose === 'preview') {
    return true;
  }
  
  // HEAD/OPTIONS requests are typically preview fetches
  if (request.method === 'HEAD' || request.method === 'OPTIONS') {
    return true;
  }
  
  return false;
}

// Check if this looks like a real user navigation (browser tap/click)
function isUserNavigation(request: Request): boolean {
  const accept = request.headers.get('accept') || '';
  const secFetchMode = request.headers.get('sec-fetch-mode') || '';
  const secFetchDest = request.headers.get('sec-fetch-dest') || '';
  const secFetchUser = request.headers.get('sec-fetch-user') || '';
  
  // User navigation signals:
  // - Accept header includes text/html (browser wants a web page)
  // - Sec-Fetch-Mode is 'navigate' (user-initiated navigation)
  // - Sec-Fetch-Dest is 'document' (loading a document)
  // - Sec-Fetch-User is '?1' (user-activated request)
  
  const wantsHtml = accept.includes('text/html');
  const isNavigate = secFetchMode === 'navigate';
  const isDocument = secFetchDest === 'document';
  const isUserActivated = secFetchUser === '?1';
  
  // If any of these navigation signals are present, treat as real browser
  return wantsHtml || isNavigate || isDocument || isUserActivated;
}

// Check if this is likely an iOS/iMessage link preview fetch
function isIOSPreview(request: Request): boolean {
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  const accept = request.headers.get('accept') || '';
  
  // If they want HTML, it's a real browser
  if (accept.includes('text/html')) {
    return false;
  }
  
  // iOS preview fetches come from CFNetwork WITHOUT Safari in the UA
  if (ua.includes('cfnetwork') && !ua.includes('safari')) {
    return true;
  }
  
  return false;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateDescription(content: string, maxLength = 160): string {
  const clean = content
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length <= maxLength) return clean;
  return clean.substring(0, maxLength - 3).trim() + '...';
}

function generateOgHtml(meta: {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: string;
}): string {
  const { title, description, url, image = DEFAULT_IMAGE, type = 'article' } = meta;

  // Include JS redirect fallback for any misclassified browsers
  // Crawlers don't execute JS, so they just read the meta tags
  // Real browsers will be redirected to the SPA
  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>${escapeHtml(title)}</title>
  <meta name="title" content="${escapeHtml(title)}">
  <meta name="description" content="${escapeHtml(description)}">
  
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="FounderHQ">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  
  <link rel="canonical" href="${escapeHtml(url)}">
  
  <!-- JS redirect for any misclassified browsers (crawlers don't execute JS) -->
  <script>window.location.replace("${escapeHtml(url)}");</script>
  <noscript><meta http-equiv="refresh" content="0;url=${escapeHtml(url)}"></noscript>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <p>Loading... <a href="${escapeHtml(url)}">Click here if not redirected</a></p>
</body>
</html>`;
}

async function fetchBrief(token: string): Promise<{ title: string; description: string } | null> {
  try {
    // Use RPC function that's granted to anon
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_shared_market_brief`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_token: token, p_password: null }),
      }
    );
    
    if (!response.ok) return null;
    
    const result = await response.json();
    if (!result.success || !result.brief) {
      // Handle password-protected briefs
      if (result.error === 'password_required') {
        return {
          title: 'Protected Market Brief',
          description: 'This market brief is password protected. Click to view.',
        };
      }
      return null;
    }
    
    const brief = result.brief;
    return {
      title: `Market Brief: ${brief.query}`,
      description: brief.hero_line || generateDescription(brief.raw_report || 'Market research brief'),
    };
  } catch (e) {
    console.error('[og-meta] Error fetching brief:', e);
    return null;
  }
}

async function fetchReport(token: string): Promise<{ title: string; description: string } | null> {
  try {
    // Use RPC function that's granted to anon
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_shared_report`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_token: token }),
      }
    );
    
    if (!response.ok) return null;
    
    const result = await response.json();
    if (!result.success || !result.report) return null;
    
    const report = result.report;
    const goalLabels: Record<string, string> = {
      icp: 'ICP & Pain Points',
      competitive: 'Competitive Analysis',
      angles: 'Outreach Angles',
      market: 'Market Trends',
    };
    
    return {
      title: result.title_override || `${goalLabels[report.goal] || 'Research'}: ${report.target}`,
      description: generateDescription(report.output || 'Research report'),
    };
  } catch (e) {
    console.error('[og-meta] Error fetching report:', e);
    return null;
  }
}

async function fetchForm(slug: string): Promise<{ title: string; description: string } | null> {
  try {
    // Use RPC function that's granted to anon
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_public_form`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_slug: slug }),
      }
    );
    
    if (!response.ok) return null;
    
    const result = await response.json();
    if (!result.success || !result.form) return null;
    
    const form = result.form;
    return {
      title: form.name || form.title,
      description: form.description ? generateDescription(form.description) : `Submit your response to ${form.name || form.title}`,
    };
  } catch (e) {
    console.error('[og-meta] Error fetching form:', e);
    return null;
  }
}

export default async function handler(request: Request, context: Context) {
  try {
    // Only handle GET requests for crawler detection
    // HEAD/OPTIONS are handled separately as preview requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return context.next();
    }
    
    const url = new URL(request.url);
    const path = url.pathname;
    const userAgent = request.headers.get('user-agent') || '';
    
    // Check various signals
    const hasCrawlerUA = isCrawlerUA(userAgent);
    const isPreview = isPreviewRequest(request);
    const isNav = isUserNavigation(request);
    const iosPreview = isIOSPreview(request);
    
    // Decision: serve OG HTML only if:
    // 1. Has crawler UA AND is NOT a user navigation (in-app browser tap)
    // 2. OR explicit preview request headers
    // 3. OR iOS preview fetch
    const shouldServeOg = (hasCrawlerUA && !isNav) || isPreview || iosPreview;
    
    // Log for debugging ambiguous cases
    if (hasCrawlerUA && isNav) {
      console.log(`[og-meta] AMBIGUOUS: Crawler UA but user navigation detected. UA: ${userAgent.substring(0, 100)}, Accept: ${request.headers.get('accept')?.substring(0, 50)}, Sec-Fetch-Mode: ${request.headers.get('sec-fetch-mode')}, Sec-Fetch-User: ${request.headers.get('sec-fetch-user')}`);
    }
    
    console.log(`[og-meta] Path: ${path}, CrawlerUA: ${hasCrawlerUA}, IsNav: ${isNav}, IsPreview: ${isPreview}, ServeOG: ${shouldServeOg}`);
    
    // If not a crawler/preview, pass through to the SPA
    if (!shouldServeOg) {
      return context.next();
    }
    
    // Parse the path
    const briefMatch = path.match(/^\/share\/brief\/([^/]+)$/);
    const reportMatch = path.match(/^\/share\/report\/([^/]+)$/);
    const formMatch = path.match(/^\/forms\/([^/]+)$/);
    
    let meta: { title: string; description: string } | null = null;
    let pageUrl = `${SITE_URL}${path}`;
    
    if (briefMatch) {
      meta = await fetchBrief(briefMatch[1]);
    } else if (reportMatch) {
      meta = await fetchReport(reportMatch[1]);
    } else if (formMatch) {
      meta = await fetchForm(formMatch[1]);
    }
    
    // If we couldn't fetch metadata, still serve generic OG tags for crawlers
    if (!meta) {
      console.log('[og-meta] No metadata found, serving generic OG tags');
      meta = {
        title: 'FounderHQ',
        description: 'The all-in-one GTM hub for founders, consultants, and small businesses.',
      };
    }
    
    // Return the OG HTML (includes JS redirect fallback for misclassified browsers)
    return new Response(generateOgHtml({ ...meta, url: pageUrl }), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('[og-meta] Error:', error);
    return context.next();
  }
}

export const config = {
  path: ["/share/brief/*", "/share/report/*", "/forms/*"],
};
