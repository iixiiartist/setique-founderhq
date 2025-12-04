// Netlify Edge Function for serving dynamic OG meta tags to social crawlers
// This runs at the edge before requests hit the SPA

import type { Context } from "https://edge.netlify.com";

const SUPABASE_URL = "https://jffnzpdcmdalxqhkfymx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZm56cGRjbWRhbHhxaGtmeW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NzY3NjksImV4cCI6MjA0ODA1Mjc2OX0.a2AGSH7vi8bVJJF4xCv5jVoDhNpvvXDrR_jGbyXPIvA";
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
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="FounderHQ">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escapeHtml(url)}">
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
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/market_briefs?share_token=eq.${token}&select=query,hero_line,raw_report`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data || data.length === 0) return null;
    
    const brief = data[0];
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
    // First get the link
    const linkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/shared_report_links?token=eq.${token}&select=report_id,title_override,is_active`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    
    if (!linkResponse.ok) return null;
    
    const links = await linkResponse.json();
    if (!links || links.length === 0 || !links[0].is_active) return null;
    
    const link = links[0];
    
    // Then get the report
    const reportResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/agent_reports?id=eq.${link.report_id}&select=target,goal,output`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    
    if (!reportResponse.ok) return null;
    
    const reports = await reportResponse.json();
    if (!reports || reports.length === 0) return null;
    
    const report = reports[0];
    const goalLabels: Record<string, string> = {
      icp: 'ICP & Pain Points',
      competitive: 'Competitive Analysis',
      angles: 'Outreach Angles',
      market: 'Market Trends',
    };
    
    return {
      title: link.title_override || `${goalLabels[report.goal] || 'Research'}: ${report.target}`,
      description: generateDescription(report.output || 'Research report'),
    };
  } catch (e) {
    console.error('[og-meta] Error fetching report:', e);
    return null;
  }
}

async function fetchForm(slug: string): Promise<{ title: string; description: string } | null> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/forms?slug=eq.${slug}&status=eq.published&select=name,description`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data || data.length === 0) return null;
    
    const form = data[0];
    return {
      title: form.name,
      description: form.description ? generateDescription(form.description) : `Submit your response to ${form.name}`,
    };
  } catch (e) {
    console.error('[og-meta] Error fetching form:', e);
    return null;
  }
}

export default async function handler(request: Request, context: Context) {
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
  
  // If we couldn't fetch metadata, pass through
  if (!meta) {
    console.log('[og-meta] No metadata found, passing through');
    return context.next();
  }
  
  // Return the OG HTML
  return new Response(generateOgHtml({ ...meta, url: pageUrl }), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
    },
  });
}

export const config = {
  path: ["/share/brief/*", "/share/report/*", "/forms/*"],
};
