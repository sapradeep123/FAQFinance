import { createError } from '../middleware/errorHandler';

export interface NewsSourceItem {
  title: string;
  site: string;
  date: string; // YYYY-MM-DD
  url: string;
  notes?: string;
}

export interface NewsAnswerMeta {
  used_sites: string[];
  fallback_used: boolean;
  search_window_days: number | null;
}

export interface NewsAnswerResult {
  summary: string;
  bullets: string[];
  advice_disclaimer: string;
  sources: NewsSourceItem[];
  meta: NewsAnswerMeta;
}

export interface NewsAnswerOptions {
  admin_allowed_sites?: string[]; // domains
  region_preference?: 'US' | 'EU' | 'WW';
  time_window_days?: number;
}

const DEFAULT_PRIMARY_SITES = [
  'finance.yahoo.com',
  'businessinsider.com',
  'moneyweek.com',
  'investing.com'
];

export class NewsService {
  async answerFromNews(userQuery: string, options: NewsAnswerOptions = {}): Promise<NewsAnswerResult> {
    const primarySites = (options.admin_allowed_sites && options.admin_allowed_sites.length > 0)
      ? options.admin_allowed_sites.slice(0, 5)
      : DEFAULT_PRIMARY_SITES;

    const windowDays = options.time_window_days ?? null;

    // NOTE: Placeholder implementation.
    // In production, integrate a search provider (e.g., Bing Web Search, Google CSE, GNews)
    // and run site-filtered queries in parallel, then rank by recency and relevance.

    // For now, return the "no adequate sources" structure to satisfy contract while
    // the real provider is configured.
    return {
      summary: "I couldn’t find solid coverage from the selected sources for this query.",
      bullets: [
        'Consider broadening the site list or widening the time window.',
        'Try alternate keywords (specify 2–3).'
      ],
      advice_disclaimer: 'This is information, not investment advice.',
      sources: [],
      meta: {
        used_sites: primarySites,
        fallback_used: false,
        search_window_days: windowDays
      }
    };
  }
}

export const newsService = new NewsService();


