// ═══════════════════════════════════════════════════════════════
// Provider Core Types — 所有 Provider 的接口契约和统一数据类型
// ═══════════════════════════════════════════════════════════════

// ── 市场行情: 统一数据类型 ──

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  timestamp: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  logo?: string;
  marketCap?: number;
  industry?: string;
  website?: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string; // 'Common Stock', 'ETF', etc.
}

export interface NewsArticle {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  category: string;
  related: string;
  image?: string;
}

export interface NewsOptions {
  symbols?: string[];
  category?: string;
  limit?: number;
}

export interface WatchlistItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  name: string;
  logo?: string;
  marketCap?: number;
}

// ── 市场行情: Provider 接口 ──

export interface MarketDataProvider {
  readonly name: string;

  /** 单只股票实时报价 */
  getQuote(symbol: string): Promise<Quote | null>;

  /** 批量报价 (Provider 内部可并发优化) */
  getQuotes(symbols: string[]): Promise<Record<string, Quote | null>>;

  /** 公司概况 */
  getCompanyProfile(symbol: string): Promise<CompanyProfile | null>;

  /** 股票搜索 */
  searchStocks(query?: string): Promise<SearchResult[]>;

  /** 市场/个股新闻 (可能返回空数组——A股 Provider 暂不支持) */
  getNews(options?: NewsOptions): Promise<NewsArticle[]>;

  /** 自选列表批量数据 */
  getWatchlistData(symbols: string[]): Promise<WatchlistItem[]>;
}

// ── 情绪分析: 统一数据类型 ──

export interface SentimentSource {
  sourceKey: string;      // 'reddit' | 'x' | 'news' | 'polymarket' | 'gjzq' | ...
  sourceLabel: string;     // 'Reddit' | 'X.com' | ...
  buzzScore: number;       // 0-100
  bullishPct: number | null; // 0-100
  trend: 'rising' | 'falling' | 'stable' | null;
  metricLabel: string;     // 'Mentions' | 'Trades'
  metricValue: number;
}

export interface SentimentResult {
  symbol: string;
  companyName: string | null;
  averageBuzz: number;           // 0-100
  bullishAverage: number | null; // 0-100
  sourceAlignment: string;       // 'Bullish alignment' | ...
  availableSources: number;
  sources: SentimentSource[];
}

// ── 情绪分析: Provider 接口 ──

export interface SentimentProvider {
  readonly name: string;

  /** 单只股票跨源情绪快照 */
  getSentiment(symbol: string, days?: number): Promise<SentimentResult | null>;

  /** (可选) 批量情绪 */
  getSentiments?(symbols: string[], days?: number): Promise<Record<string, SentimentResult | null>>;
}

// ── 交易日历: 数据类型 ──

export interface MarketHours {
  open: string;
  close: string;
  timezone: string;
}

// ── 交易日历: Provider 接口 ──

export interface TradingCalendarProvider {
  readonly name: string;

  isTradingDay(date: Date): boolean;
  getNextTradingDay(from: Date): Date;
  getPrevTradingDay(from: Date): Date;
  getMarketHours(date: Date): MarketHours;
  getHolidays(year: number): Date[];
}
