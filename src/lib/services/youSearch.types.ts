export type ResearchMode = 'search' | 'news' | 'rag' | 'images';

export interface YouSearchHit {
  title?: string;
  description?: string;
  url?: string;
  snippets?: string[];
  thumbnail?: string;
  source?: string;
  publishedAt?: string;
}

export interface YouSearchNewsItem {
  title?: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  age?: string;
  source?: string;
}

export interface YouSearchImageResult {
  title?: string;
  url?: string;
  imageUrl: string;
  thumbnail?: string;
  source?: string;
}

export interface YouSearchMetadata {
  provider?: string;
  mode: ResearchMode;
  query: string;
  count?: number;
  fetchedAt: string;
  durationMs?: number;
}

export interface YouSearchResponse {
  hits?: YouSearchHit[];
  news?: YouSearchNewsItem[];
  images?: YouSearchImageResult[];
  qa?: {
    answer: string;
    sources?: string[];
  };
  metadata?: YouSearchMetadata;
}
