/* eslint-env deno */
// Edge function to serve dynamic Open Graph meta tags for social crawlers
// This enables rich link previews for shared briefs, reports, and forms

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SITE_URL = 'https://founderhq.setique.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

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
// Crawlers read the meta tags, browsers get redirected via JavaScript
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

  // For crawlers: include meta refresh as backup, but no JS redirect
  // For browsers: use immediate JS redirect
  const redirectScript = isCrawler 
    ? '' 
    : `<script>window.location.replace("${escapeHtml(url)}");</script>`;
  
  const metaRefresh = isCrawler
    ? '' // Don't redirect crawlers
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
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escapeHtml(url)}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  
  <link rel="canonical" href="${escapeHtml(url)}">
  ${metaRefresh}
  ${redirectScript}
</head>
<body>
  <p>Loading <a href="${escapeHtml(url)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;
}

// Handler for different share types
async function handleBriefShare(token: string, isCrawlerRequest: boolean): Promise<Response | null> {
  // Query the market brief by share token
  const { data: brief, error } = await supabase
    .from('market_briefs')
    .select('query, hero_line, raw_report, share_expires_at, is_public, share_token')
    .eq('share_token', token)
    .single();

  if (error || !brief) {
    console.log('[og-meta] Brief not found for token:', token);
    return null;
  }

  // Check if expired
  if (brief.share_expires_at && new Date(brief.share_expires_at) < new Date()) {
    return null;
  }

  const title = `Market Brief: ${brief.query}`;
  const description = brief.hero_line || generateDescription(brief.raw_report || '');
  const url = `${SITE_URL}/share/brief/${token}`;

  return new Response(generateOgHtml({ title, description, url, isCrawler: isCrawlerRequest }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function handleReportShare(token: string, isCrawlerRequest: boolean): Promise<Response | null> {
  // Query the shared report link and join with agent_reports
  const { data: link, error } = await supabase
    .from('shared_report_links')
    .select(`
      token,
      expires_at,
      is_active,
      title_override,
      report:agent_reports (
        target,
        goal,
        output
      )
    `)
    .eq('token', token)
    .single();

  if (error || !link || !link.is_active) {
    console.log('[og-meta] Report link not found or inactive:', token);
    return null;
  }

  // Check expiration
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return null;
  }

  const report = link.report as { target: string; goal: string; output: string } | null;
  if (!report) return null;

  const goalLabels: Record<string, string> = {
    icp: 'ICP & Pain Points Analysis',
    competitive: 'Competitive Landscape',
    angles: 'Outreach Angles',
    market: 'Market Trends Brief',
  };

  const title = link.title_override || `${goalLabels[report.goal] || 'Research Report'} | ${report.target}`;
  const description = generateDescription(report.output || '');
  const url = `${SITE_URL}/share/report/${token}`;

  return new Response(generateOgHtml({ title, description, url, isCrawler: isCrawlerRequest }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function handleFormShare(slug: string, isCrawlerRequest: boolean): Promise<Response | null> {
  // Query the form by slug
  const { data: form, error } = await supabase
    .from('forms')
    .select('name, description, status')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !form) {
    console.log('[og-meta] Form not found for slug:', slug);
    return null;
  }

  const title = form.name;
  const description = form.description 
    ? generateDescription(form.description) 
    : `Submit your response to ${form.name}`;
  const url = `${SITE_URL}/forms/${slug}`;

  return new Response(generateOgHtml({ title, description, url, type: 'website', isCrawler: isCrawlerRequest }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const userAgent = req.headers.get('user-agent') || '';

  // Parse the path from query param (set by Netlify redirect)
  const path = url.searchParams.get('path') || '';
  const isCrawlerRequest = isCrawler(userAgent);
  
  console.log('[og-meta] Request path:', path, 'UA:', userAgent.substring(0, 50), 'isCrawler:', isCrawlerRequest);

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

  // Fallback - serve a redirect page
  const redirectUrl = `${SITE_URL}${path}`;
  return new Response(generateOgHtml({ 
    title: 'FounderHQ', 
    description: 'The all-in-one GTM hub for founders', 
    url: redirectUrl,
    isCrawler: isCrawlerRequest 
  }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
