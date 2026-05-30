// ═══════════════════════════════════════════════════════════════
// TushareProvider — A-Share market data via Tushare REST API
// ═══════════════════════════════════════════════════════════════

import type {
  MarketDataProvider,
  Quote,
  CompanyProfile,
  SearchResult,
  NewsArticle,
  NewsOptions,
  WatchlistItem,
} from '../../core/types';
import type { TushareDailyRow, TushareResponse } from './types';

const DEFAULT_BASE_URL = 'https://api.tushare.pro';

/**
 * Normalize a stock symbol to Tushare format (e.g. `600519.SH`).
 *
 * Handles these input forms:
 *   - `600519.SH`      → already normalized, returned as-is
 *   - `600519`          → 6-digit bare code; infer exchange from prefix
 *   - `sh600519`        → strip alphabetic prefix, use as exchange
 *   - `sz000001`        → strip alphabetic prefix, use as exchange
 *   - `bj123456`        → strip alphabetic prefix, use as exchange
 *   - `600519.SH`       → uppercase + pass through
 *   - `sh.600519` (stock-sdk alternative) → normalize to `600519.SH`
 */
function normalizeSymbol(input: string): string {
  let raw = input.trim().toUpperCase();

  // --- stock-sdk pattern: sh.600519 or sh600519 ---
  // Strip optional dot after exchange prefix (sh.600519 → sh600519)
  raw = raw.replace(/^(SH|SZ|BJ)\.(\d+)$/, '$1$2');

  // Match explicit suffix pattern like 600519.SH
  const explicitMatch = raw.match(/^(\d{5,6})\.(SH|SZ|BJ)$/);
  if (explicitMatch) {
    return `${explicitMatch[1]}.${explicitMatch[2]}`;
  }

  // Match exchange-prefixed form like SH600519 or SZ000001
  const prefixedMatch = raw.match(/^(SH|SZ|BJ)(\d{5,6})$/);
  if (prefixedMatch) {
    return `${prefixedMatch[2]}.${prefixedMatch[1]}`;
  }

  // Bare 6-digit code — infer exchange from leading digit
  const bareMatch = raw.match(/^(\d{5,6})$/);
  if (bareMatch) {
    const code = bareMatch[1];
    const firstDigit = code[0];
    if (firstDigit === '6') {
      return `${code}.SH`;
    }
    if (firstDigit === '0' || firstDigit === '3') {
      return `${code}.SZ`;
    }
    if (firstDigit === '8') {
      return `${code}.BJ`;
    }
    // Fallback: treat as SH
    return `${code}.SH`;
  }

  // If nothing matched, return the original (let the API call fail gracefully)
  return raw;
}

/** Return today's date as YYYYMMDD string. */
function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/** Safely coerce a value to a number (Tushare returns strings in some cases). */
function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
}

export class TushareProvider implements MarketDataProvider {
  readonly name = 'tushare';

  private readonly token: string;
  private readonly baseUrl: string;

  constructor() {
    const token = process.env.TUSHARE_API_TOKEN;
    if (!token) {
      throw new Error(
        'TUSHARE_API_TOKEN environment variable is not set. ' +
          'Please add it to your .env file.',
      );
    }
    this.token = token;
    this.baseUrl = process.env.TUSHARE_BASE_URL ?? DEFAULT_BASE_URL;
  }

  // ── Private helpers ──

  /**
   * Call the Tushare API.
   * POST to baseUrl with JSON body { api_name, token, params, fields }.
   * Throws on network error or non-zero response code.
   */
  private async call<T = unknown>(
    apiName: string,
    params?: Record<string, string>,
    fields?: string,
  ): Promise<TushareResponse<T>> {
    const body: Record<string, unknown> = {
      api_name: apiName,
      token: this.token,
    };
    if (params && Object.keys(params).length > 0) {
      body.params = params;
    }
    if (fields) {
      body.fields = fields;
    }

    let response: Response;
    try {
      response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error(`[Tushare] Network error calling "${apiName}":`, err);
      throw err;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(
        `[Tushare] HTTP ${response.status} for "${apiName}": ${text}`,
      );
      throw new Error(`Tushare API HTTP ${response.status}: ${text}`);
    }

    let json: TushareResponse<T>;
    try {
      json = (await response.json()) as TushareResponse<T>;
    } catch (err) {
      console.error(`[Tushare] Failed to parse JSON for "${apiName}":`, err);
      throw err;
    }

    if (json.code !== 0) {
      console.error(
        `[Tushare] API error for "${apiName}": code=${json.code}, msg="${json.msg}"`,
      );
      throw new Error(`Tushare API error: ${json.code} — ${json.msg}`);
    }

    return json;
  }

  // ── MarketDataProvider implementation ──

  async getQuote(symbol: string): Promise<Quote | null> {
    try {
      const normalized = normalizeSymbol(symbol);
      const today = todayString();
      const res = await this.call<TushareDailyRow>('daily', {
        ts_code: normalized,
        start_date: today,
        end_date: today,
      });

      const items = res.data?.items;
      if (!items || items.length === 0) {
        return null;
      }

      // Tushare returns items as arrays matching the fields order.
      // Parse the first (and only) row.
      const fields = res.data!.fields;
      const row = items[0];
      const record = fields.reduce<Record<string, unknown>>((acc, f, i) => {
        acc[f] = row[i];
        return acc;
      }, {});

      const close = toNumber(record.close);
      const preClose = toNumber(record.pre_close);
      const change = toNumber(record.change ?? close - preClose);
      const pctChg = toNumber(record.pct_chg ?? 0);

      return {
        symbol: normalized,
        price: close,
        change,
        changePercent: pctChg,
        open: toNumber(record.open),
        high: toNumber(record.high),
        low: toNumber(record.low),
        volume: toNumber(record.vol),
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }

  async getQuotes(
    symbols: string[],
  ): Promise<Record<string, Quote | null>> {
    const entries = await Promise.all(
      symbols.map(async (sym) => {
        const quote = await this.getQuote(sym);
        return [sym, quote] as const;
      }),
    );
    return Object.fromEntries(entries);
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    try {
      const normalized = normalizeSymbol(symbol);
      // Tushare daily API does not return company profile details.
      // Provide a minimal profile derived from the symbol.
      const exchange = normalized.endsWith('.SH')
        ? 'SSE'
        : normalized.endsWith('.SZ')
          ? 'SZSE'
          : normalized.endsWith('.BJ')
            ? 'BSE'
            : 'SSE';

      return {
        symbol: normalized,
        name: normalized,
        exchange,
        currency: 'CNY',
      };
    } catch {
      return null;
    }
  }

  async searchStocks(_query?: string): Promise<SearchResult[]> {
    // Basic (free) Tushare does not provide a stock search endpoint.
    return [];
  }

  async getNews(_options?: NewsOptions): Promise<NewsArticle[]> {
    // A-share news not implemented yet for this provider.
    return [];
  }

  async getWatchlistData(symbols: string[]): Promise<WatchlistItem[]> {
    try {
      const quotes = await this.getQuotes(symbols);
      const items: WatchlistItem[] = [];

      for (const sym of symbols) {
        const q = quotes[sym];
        if (q) {
          const normalized = normalizeSymbol(sym);
          const exchange = normalized.endsWith('.SH')
            ? 'SSE'
            : normalized.endsWith('.SZ')
              ? 'SZSE'
              : 'BSE';

          items.push({
            symbol: normalized,
            price: q.price,
            change: q.change,
            changePercent: q.changePercent,
            currency: 'CNY',
            name: normalized,
            marketCap: undefined,
          });
        }
      }

      return items;
    } catch {
      return [];
    }
  }
}
