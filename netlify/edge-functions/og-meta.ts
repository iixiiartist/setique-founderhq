// Netlify Edge Function for serving dynamic OG meta tags to social crawlers
// This runs at the edge before requests hit the SPA

import type { Context } from "https://edge.netlify.com";

const SUPABASE_URL = "https://jffnzpdcmdalxqhkfymx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZm56cGRjbWRhbHhxaGtmeW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTE3NTIsImV4cCI6MjA3NzM2Nzc1Mn0.cvjpoEFsD-_2PWucGXNP_2Pq9QTj3-lXpQ2lWrF16R8";
const SITE_URL = "https://founderhq.setique.com";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

// Detect social media crawlers
function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  const crawlers = [
    'facebookexternalhit',
    'facebot',
    'twitterbot',
    'whatsapp',
    'linkedinbot',
    'slackbot',
    'slackbot-linkexpanding',
    'discordbot',
    'telegrambot',
    'applebot',
    'googlebot',
    'bingbot',
    'pinterest',
    'redditbot',
    'embedly',
    'quora',
    'outbrain',
    'vkshare',
    'skypeuripreview',
    'nuzzel',
    'w3c_validator',
    'baiduspider',
    'yandexbot',
    // iOS link preview specific
    'iphone',
    'cfnetwork',
    'darwin',
  ];
  
  // Check if it's a preview request (no accept header or looking for HTML specifically)
  return crawlers.some(bot => ua.includes(bot));
}

// Check if this is likely an iOS link preview fetch
function isIOSPreview(request: Request): boolean {
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  const accept = request.headers.get('accept') || '';
  
  // iOS preview fetches often come from CFNetwork with specific patterns
  if (ua.includes('cfnetwork') || ua.includes('darwin')) {
    return true;
  }
  
  // Check for iPhone/iPad with minimal accept headers (preview behavior)
  if ((ua.includes('iphone') || ua.includes('ipad')) && !accept.includes('text/html')) {
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
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <p><a href="${escapeHtml(url)}">View on FounderHQ</a></p>
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
    const url = new URL(request.url);
    const path = url.pathname;
    const userAgent = request.headers.get('user-agent') || '';
    
    // Check if this is a crawler or iOS preview
    const shouldServeOg = isCrawler(userAgent) || isIOSPreview(request);
    
    console.log(`[og-meta] Path: ${path}, UA: ${userAgent.substring(0, 80)}, Serve OG: ${shouldServeOg}`);
    
    // If not a crawler, pass through to the SPA
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
    
    // Return the OG HTML
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
