// ═══════════════════════════════════════════════════════════════
// StockSDKProvider — MarketDataProvider backed by stock-sdk
// Provides A-share (SH/SZ/BJ) real-time data via 东方财富 / Tencent
// ═══════════════════════════════════════════════════════════════

import { StockSDK } from 'stock-sdk';
import type {
  MarketDataProvider,
  Quote,
  CompanyProfile,
  SearchResult,
  NewsArticle,
  NewsOptions,
  WatchlistItem,
} from '../../core/types';

// ── Exchange prefix helpers ──

/** Map internal suffix (.SH/.SZ/.BJ) to stock-sdk prefix (sh/sz/bj) */
const EXCHANGE_PREFIX: Record<string, string> = {
  SH: 'sh',
  SZ: 'sz',
  BJ: 'bj',
};

/** Reverse map: stock-sdk prefix → canonical suffix */
const EXCHANGE_SUFFIX: Record<string, string> = {
  sh: 'SH',
  sz: 'SZ',
  bj: 'BJ',
};

// ── Provider ──

export class StockSDKProvider implements MarketDataProvider {
  readonly name = 'stock-sdk';

  private readonly sdk: StockSDK;

  constructor() {
    this.sdk = new StockSDK({ timeout: 8000 });
  }

  // ── Symbol conversion ──

  /**
   * Convert canonical symbol (e.g. "600519.SH", "000001.SZ") to stock-sdk
   * format (e.g. "sh600519", "sz000001").
   * US tickers like "AAPL" pass through unchanged.
   */
  private toSDKSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    const match = upper.match(/^(\d{5,6})\.(SH|SZ|BJ)$/);
    if (match) {
      const prefix = EXCHANGE_PREFIX[match[2]!];
      return `${prefix}${match[1]!}`;
    }
    // Non-A-share (US, HK, etc.) — pass through as-is
    return symbol;
  }

  /**
   * Convert stock-sdk symbol (e.g. "sh600519", "sz000001") back to
   * canonical format (e.g. "600519.SH", "000001.SZ").
   * Returns the original string if it doesn't match a known prefix.
   */
  private fromSDKSymbol(sdkCode: string): string {
    const match = sdkCode.match(/^(sh|sz|bj)(\d{5,6})$/i);
    if (match) {
      const suffix = EXCHANGE_SUFFIX[match[1]!.toLowerCase()];
      return `${match[2]!}.${suffix}`;
    }
    // Not an A-share code — return as-is
    return sdkCode;
  }

  // ── MarketDataProvider implementation ──

  async getQuote(symbol: string): Promise<Quote | null> {
    try {
      const results = await this.sdk.getSimpleQuotes([this.toSDKSymbol(symbol)]);
      if (!results || results.length === 0) return null;
      return this.toQuote(results[0]!);
    } catch {
      return null;
    }
  }

  async getQuotes(symbols: string[]): Promise<Record<string, Quote | null>> {
    try {
      const sdkSymbols = symbols.map((s) => this.toSDKSymbol(s));
      const results = await this.sdk.getSimpleQuotes(sdkSymbols);

      const map: Record<string, Quote | null> = {};
      for (const symbol of symbols) {
        const sdkCode = this.toSDKSymbol(symbol);
        const item = results.find((r) => r.code === sdkCode);
        map[symbol] = item ? this.toQuote(item) : null;
      }
      return map;
    } catch {
      const map: Record<string, Quote | null> = {};
      for (const symbol of symbols) map[symbol] = null;
      return map;
    }
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    try {
      const results = await this.sdk.getSimpleQuotes([this.toSDKSymbol(symbol)]);
      if (!results || results.length === 0) return null;

      const item = results[0]!;
      const canonicalSymbol = this.fromSDKSymbol(item.code);

      return {
        symbol: canonicalSymbol,
        name: item.name,
        exchange: this.inferExchange(item.code),
        currency: 'CNY',
      };
    } catch {
      return null;
    }
  }

  async searchStocks(query?: string): Promise<SearchResult[]> {
    if (!query || query.trim().length === 0) return [];

    try {
      const results = await this.sdk.search(query.trim());
      return results.map((r): SearchResult => ({
        symbol: this.fromSDKSymbol(r.code),
        name: r.name,
        exchange: this.mapExchange(r.market),
        type: this.mapSearchType(r.type, r.category),
      }));
    } catch {
      return [];
    }
  }

  async getNews(_options?: NewsOptions): Promise<NewsArticle[]> {
    // stock-sdk does not provide news endpoints
    return [];
  }

  async getWatchlistData(symbols: string[]): Promise<WatchlistItem[]> {
    try {
      const sdkSymbols = symbols.map((s) => this.toSDKSymbol(s));
      const results = await this.sdk.getSimpleQuotes(sdkSymbols);

      return results.map((item): WatchlistItem => {
        const canonicalSymbol = this.fromSDKSymbol(item.code);
        return {
          symbol: canonicalSymbol,
          price: item.price,
          change: item.change,
          changePercent: item.changePercent,
          currency: 'CNY',
          name: item.name,
        };
      });
    } catch {
      return [];
    }
  }

  // ── Private helpers ──

  private toQuote(item: { code: string; name: string; price: number; change: number; changePercent: number; volume: number; amount: number }): Quote {
    return {
      symbol: this.fromSDKSymbol(item.code),
      price: item.price,
      change: item.change,
      changePercent: item.changePercent,
      volume: item.volume,
      timestamp: Date.now(),
    };
  }

  /**
   * Infer exchange display name from stock-sdk code prefix.
   */
  private inferExchange(sdkCode: string): string {
    const lower = sdkCode.toLowerCase();
    if (lower.startsWith('sh')) return 'SSE';
    if (lower.startsWith('sz')) return 'SZSE';
    if (lower.startsWith('bj')) return 'BSE';
    return 'OTHER';
  }

  /**
   * Map stock-sdk market identifier to a canonical exchange string.
   */
  private mapExchange(market: string): string {
    const m = market.toLowerCase();
    if (m === 'sh') return 'SSE';
    if (m === 'sz') return 'SZSE';
    if (m === 'bj') return 'BSE';
    if (m === 'hk') return 'HKEX';
    if (m === 'us') return 'NASDAQ';
    return market.toUpperCase();
  }

  /**
   * Map stock-sdk type/category to canonical type string
   * (e.g. 'Common Stock', 'ETF', 'Index').
   */
  private mapSearchType(type: string, category?: string): string {
    // Prefer the normalized category if available
    if (category) {
      const map: Record<string, string> = {
        stock: 'Common Stock',
        index: 'Index',
        fund: 'ETF',
        bond: 'Bond',
        futures: 'Futures',
        option: 'Option',
        other: 'Other',
      };
      return map[category] ?? type;
    }
    // Fall back to the raw type string
    if (type === 'GP-A') return 'Common Stock';
    if (type === 'ZS') return 'Index';
    if (type === 'KJ') return 'ETF';
    return type;
  }
}
