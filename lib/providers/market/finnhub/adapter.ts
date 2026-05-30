// ═══════════════════════════════════════════════════════════════
// FinnhubAdapter — wraps lib/actions/finnhub.actions into MarketDataProvider
// ═══════════════════════════════════════════════════════════════

import * as finnhub from '@/lib/actions/finnhub.actions';
import type {
  MarketDataProvider,
  Quote,
  CompanyProfile,
  SearchResult,
  NewsArticle,
  NewsOptions,
  WatchlistItem,
} from '../../core/types';

export class FinnhubAdapter implements MarketDataProvider {
  readonly name = 'finnhub';

  async getQuote(symbol: string): Promise<Quote | null> {
    try {
      const result = await finnhub.getQuote(symbol);
      if (!result) return null;

      return {
        symbol,
        price: result.c ?? 0,
        change: result.d ?? 0,
        changePercent: result.dp ?? 0,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }

  async getQuotes(symbols: string[]): Promise<Record<string, Quote | null>> {
    const entries = await Promise.all(
      symbols.map(async (symbol) => {
        const quote = await this.getQuote(symbol);
        return [symbol, quote] as const;
      }),
    );
    return Object.fromEntries(entries);
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    try {
      const result = await finnhub.getCompanyProfile(symbol);
      if (!result) return null;

      return {
        symbol: result.ticker || symbol,
        name: result.name || result.ticker || symbol,
        exchange: result.exchange || '',
        currency: result.currency || 'USD',
        logo: result.logo,
        marketCap: result.marketCapitalization,
      };
    } catch {
      return null;
    }
  }

  async searchStocks(query?: string): Promise<SearchResult[]> {
    try {
      const results = await finnhub.searchStocks(query);
      return results.map((r) => ({
        symbol: r.symbol,
        name: r.name,
        exchange: r.exchange,
        type: r.type,
      }));
    } catch {
      return [];
    }
  }

  async getNews(options?: NewsOptions): Promise<NewsArticle[]> {
    try {
      const articles = await finnhub.getNews(options?.symbols);
      return articles.map((a) => ({
        id: a.id,
        headline: a.headline,
        summary: a.summary,
        source: a.source,
        url: a.url,
        datetime: a.datetime,
        category: a.category,
        related: a.related,
        image: a.image,
      }));
    } catch {
      return [];
    }
  }

  async getWatchlistData(symbols: string[]): Promise<WatchlistItem[]> {
    try {
      const items = await finnhub.getWatchlistData(symbols);
      return items.map((item) => ({
        symbol: item.symbol,
        price: item.price,
        change: item.change,
        changePercent: item.changePercent,
        currency: item.currency,
        name: item.name,
        logo: item.logo,
        marketCap: item.marketCap,
      }));
    } catch {
      return [];
    }
  }
}
