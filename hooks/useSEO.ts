// hooks/useSEO.ts
// Custom hook for managing SEO meta tags without external dependencies
// Works with React 19 and supports Open Graph, Twitter Cards, and standard meta tags

import { useEffect } from 'react';

export interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  siteName?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterSite?: string;
  author?: string;
  publishedTime?: string;
  noindex?: boolean;
}

const DEFAULT_SITE_NAME = 'FounderHQ';
const DEFAULT_TWITTER_SITE = '@setique';
const DEFAULT_IMAGE = 'https://founderhq.setique.com/og-image.png';
const BASE_URL = 'https://founderhq.setique.com';

/**
 * Custom hook to manage SEO meta tags dynamically
 * Updates document head with Open Graph, Twitter Card, and standard meta tags
 */
export function useSEO({
  title,
  description,
  image,
  url,
  type = 'website',
  siteName = DEFAULT_SITE_NAME,
  twitterCard = 'summary_large_image',
  twitterSite = DEFAULT_TWITTER_SITE,
  author,
  publishedTime,
  noindex = false,
}: SEOProps) {
  useEffect(() => {
    const originalTitle = document.title;
    const addedTags: HTMLElement[] = [];

    // Helper to create or update meta tag
    const setMetaTag = (property: string, content: string, isName = false) => {
      if (!content) return;
      
      const attr = isName ? 'name' : 'property';
      let tag = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement;
      
      if (tag) {
        tag.setAttribute('content', content);
      } else {
        tag = document.createElement('meta');
        tag.setAttribute(attr, property);
        tag.setAttribute('content', content);
        document.head.appendChild(tag);
        addedTags.push(tag);
      }
    };

    // Set document title
    if (title) {
      document.title = `${title} | ${siteName}`;
    }

    // Standard meta tags
    if (description) {
      setMetaTag('description', description, true);
    }
    if (author) {
      setMetaTag('author', author, true);
    }
    if (noindex) {
      setMetaTag('robots', 'noindex, nofollow', true);
    }

    // Open Graph tags
    if (title) {
      setMetaTag('og:title', title);
    }
    if (description) {
      setMetaTag('og:description', description);
    }
    setMetaTag('og:type', type);
    setMetaTag('og:site_name', siteName);
    if (url) {
      setMetaTag('og:url', url.startsWith('http') ? url : `${BASE_URL}${url}`);
    }
    setMetaTag('og:image', image || DEFAULT_IMAGE);
    if (image) {
      setMetaTag('og:image:width', '1200');
      setMetaTag('og:image:height', '630');
    }

    // Twitter Card tags
    setMetaTag('twitter:card', twitterCard, true);
    if (twitterSite) {
      setMetaTag('twitter:site', twitterSite, true);
    }
    if (title) {
      setMetaTag('twitter:title', title, true);
    }
    if (description) {
      setMetaTag('twitter:description', description, true);
    }
    setMetaTag('twitter:image', image || DEFAULT_IMAGE, true);

    // Article-specific tags
    if (type === 'article' && publishedTime) {
      setMetaTag('article:published_time', publishedTime);
    }

    // Cleanup: restore original title and remove added tags
    return () => {
      document.title = originalTitle;
      addedTags.forEach(tag => {
        if (tag.parentNode) {
          tag.parentNode.removeChild(tag);
        }
      });
    };
  }, [title, description, image, url, type, siteName, twitterCard, twitterSite, author, publishedTime, noindex]);
}

/**
 * Generate a preview-friendly description from content
 */
export function generateDescription(content: string, maxLength = 160): string {
  // Strip markdown/HTML
  const stripped = content
    .replace(/#{1,6}\s/g, '') // Remove markdown headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();

  if (stripped.length <= maxLength) {
    return stripped;
  }

  // Truncate at word boundary
  const truncated = stripped.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}

/**
 * Generate OG image URL for dynamic content
 * Uses a service like og-image.vercel.app or similar
 * For now, returns a static branded image
 */
export function generateOGImageUrl(title: string, _subtitle?: string): string {
  // In the future, this could generate dynamic images using:
  // - Vercel OG Image Generation
  // - Cloudinary transformations
  // - Custom edge function
  
  // For now, return the default branded image
  return DEFAULT_IMAGE;
}
