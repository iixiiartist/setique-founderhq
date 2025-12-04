/* eslint-env deno */
// Edge function to serve dynamic Open Graph meta tags for social crawlers
// This enables rich link previews for shared briefs, reports, and forms

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SITE_URL = 'https://founderhq.setique.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

// Response headers that allow meta refresh and basic styling
const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy': "default-src 'self' 'unsafe-inline'; img-src * data:; connect-src *",
  'X-Content-Type-Options': 'nosniff',
};

// Detect if request is from a social crawler/bot
function isCrawler(userAgent: string): boolean {
  const crawlers = [
    'facebookexternalhit',
    'Facebot',
    'Twitterbot',
    'WhatsApp',
    'LinkedInBot',
    'Slackbot',
    'Discordbot',
    'TelegramBot',
    'Googlebot',
    'bingbot',
    'Applebot',
    'Pinterest',
    'Embedly',
    'Quora Link Preview',
    'Showyoubot',
    'outbrain',
    'vkShare',
    'W3C_Validator',
    'redditbot',
    // iOS link preview crawlers
    'CFNetwork',
    'Darwin',
  ];
  const ua = userAgent.toLowerCase();
  return crawlers.some(bot => ua.includes(bot.toLowerCase()));
}

// Escape HTML entities
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generate description from content
function generateDescription(content: string, maxLength = 160): string {
  // Strip markdown and extra whitespace
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

// Generate HTML with OG meta tags - works for both crawlers and browsers
// Crawlers read the meta tags, browsers get redirected via meta refresh
function generateOgHtml(meta: {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: string;
  siteName?: string;
  isCrawler?: boolean;
}): string {
  const {
    title,
    description,
    url,
    image = DEFAULT_IMAGE,
    type = 'article',
    siteName = 'FounderHQ',
    isCrawler = false,
  } = meta;

  // For crawlers: no redirect so they can read the meta tags
  // For browsers: use meta refresh to redirect to the SPA
  const metaRefresh = isCrawler
    ? '' 
    : `<meta http-equiv="refresh" content="0;url=${escapeHtml(url)}">`;

  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${escapeHtml(title)}</title>
  <meta name="title" content="${escapeHtml(title)}">
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  
  ${metaRefresh}
</head>
<body>
  <p>Loading <a href="${escapeHtml(url)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;
}

// Handler for different share types
async function handleBriefShare(token: string, isCrawlerRequest: boolean): Promise<Response | null> {
  // Use the RPC function which is granted to anon and handles all the logic
  const { data, error } = await supabase.rpc('get_shared_market_brief', {
    p_token: token,
    p_password: null,
  });

  if (error) {
    console.log('[og-meta] RPC error for brief:', error.message);
    return null;
  }

  const result = data as { success: boolean; brief?: { query: string; hero_line: string; raw_report: string }; error?: string };
  
  if (!result.success || !result.brief) {
    console.log('[og-meta] Brief not found or error:', result.error);
    // If password required, still show a generic preview
    if (result.error === 'password_required') {
      const title = 'Protected Market Brief';
      const description = 'This market brief is password protected. Click to view.';
      const url = `${SITE_URL}/share/brief/${token}`;
      return new Response(generateOgHtml({ title, description, url, isCrawler: isCrawlerRequest }), {
        headers: HTML_HEADERS,
      });
    }
    return null;
  }

  const brief = result.brief;
  const title = `Market Brief: ${brief.query}`;
  const description = brief.hero_line || generateDescription(brief.raw_report || '');
  const url = `${SITE_URL}/share/brief/${token}`;

  return new Response(generateOgHtml({ title, description, url, isCrawler: isCrawlerRequest }), {
    headers: HTML_HEADERS,
  });
}

async function handleReportShare(token: string, isCrawlerRequest: boolean): Promise<Response | null> {
  // Use the RPC function which is granted to anon
  const { data, error } = await supabase.rpc('get_shared_report', {
    p_token: token,
    p_password: null,
  });

  if (error) {
    console.log('[og-meta] RPC error for report:', error.message);
    return null;
  }

  const result = data as { success: boolean; report?: { target: string; goal: string; output: string; title_override?: string }; error?: string };
  
  if (!result.success || !result.report) {
    console.log('[og-meta] Report not found or error:', result.error);
    // If password required, still show a generic preview
    if (result.error === 'password_required') {
      const title = 'Protected Research Report';
      const description = 'This research report is password protected. Click to view.';
      const url = `${SITE_URL}/share/report/${token}`;
      return new Response(generateOgHtml({ title, description, url, isCrawler: isCrawlerRequest }), {
        headers: HTML_HEADERS,
      });
    }
    return null;
  }

  const report = result.report;
  const goalLabels: Record<string, string> = {
    icp: 'ICP & Pain Points Analysis',
    competitive: 'Competitive Landscape',
    angles: 'Outreach Angles',
    market: 'Market Trends Brief',
  };

  const title = report.title_override || `${goalLabels[report.goal] || 'Research Report'} | ${report.target}`;
  const description = generateDescription(report.output || '');
  const url = `${SITE_URL}/share/report/${token}`;

  return new Response(generateOgHtml({ title, description, url, isCrawler: isCrawlerRequest }), {
    headers: HTML_HEADERS,
  });
}

async function handleFormShare(slug: string, isCrawlerRequest: boolean): Promise<Response | null> {
  // Use the RPC function which is granted to anon
  const { data, error } = await supabase.rpc('get_public_form', {
    p_slug: slug,
    p_password: null,
  });

  if (error) {
    console.log('[og-meta] RPC error for form:', error.message);
    return null;
  }

  const result = data as { success: boolean; form?: { title: string; description?: string }; error?: string };
  
  // Even if password required, we can still get basic form info
  const form = result.form;
  if (!form) {
    console.log('[og-meta] Form not found or error:', result.error);
    return null;
  }

  const title = form.title;
  const description = form.description 
    ? generateDescription(form.description) 
    : `Submit your response to ${form.title}`;
  const url = `${SITE_URL}/forms/${slug}`;

  return new Response(generateOgHtml({ title, description, url, type: 'website', isCrawler: isCrawlerRequest }), {
    headers: HTML_HEADERS,
  });
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const userAgent = req.headers.get('user-agent') || '';

  // Parse the path from query param (set by Netlify redirect)
  const path = url.searchParams.get('path') || '';
  const isCrawlerRequest = isCrawler(userAgent);
  
  console.log('[og-meta] Request path:', path, 'UA:', userAgent.substring(0, 50), 'isCrawler:', isCrawlerRequest);

  // For regular browsers, just do a 302 redirect to the SPA
  // Only serve OG HTML to crawlers
  if (!isCrawlerRequest) {
    const redirectUrl = `${SITE_URL}${path}`;
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl },
    });
  }

  // Parse the path to determine content type
  // /share/brief/:token
  // /share/report/:token  
  // /forms/:slug
  
  let response: Response | null = null;

  const briefMatch = path.match(/^\/share\/brief\/([^/]+)$/);
  const reportMatch = path.match(/^\/share\/report\/([^/]+)$/);
  const formMatch = path.match(/^\/forms\/([^/]+)$/);

  if (briefMatch) {
    response = await handleBriefShare(briefMatch[1], isCrawlerRequest);
  } else if (reportMatch) {
    response = await handleReportShare(reportMatch[1], isCrawlerRequest);
  } else if (formMatch) {
    response = await handleFormShare(formMatch[1], isCrawlerRequest);
  }

  if (response) {
    return response;
  }

  // Fallback for crawlers - serve generic OG tags
  const redirectUrl = `${SITE_URL}${path}`;
  return new Response(generateOgHtml({ 
    title: 'FounderHQ', 
    description: 'The all-in-one GTM hub for founders', 
    url: redirectUrl,
    isCrawler: true 
  }), {
    headers: HTML_HEADERS,
  });
});
