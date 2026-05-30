import { describe, it, expect } from 'vitest';
import {
  detectMarket,
  toTushareSymbol,
  toSDKSymbol,
  toTradingViewSymbol,
  normalizeSymbol,
} from '@/lib/providers/market/symbol-code';
// Import from core/index.ts (not registry.ts) to trigger auto-registration side-effects
import {
  getMarketProvider,
  getRegisteredMarketProviders,
  getMarketProviderForSymbol,
  getRegisteredCalendarProviders,
} from '@/lib/providers/core';

// ═══════════════════════════════════════════════════════
// symbol-code.ts
// ═══════════════════════════════════════════════════════

describe('detectMarket', () => {
  it('detects US stocks', () => {
    expect(detectMarket('AAPL')).toBe('us');
    expect(detectMarket('MSFT')).toBe('us');
    expect(detectMarket('TSLA')).toBe('us');
  });

  it('detects A-share stocks with SH suffix', () => {
    expect(detectMarket('600519.SH')).toBe('ashare');
    expect(detectMarket('000001.SZ')).toBe('ashare');
    expect(detectMarket('430047.BJ')).toBe('ashare');
  });

  it('detects A-share with stock-sdk prefix format', () => {
    expect(detectMarket('sh600519')).toBe('ashare');
    expect(detectMarket('sz000001')).toBe('ashare');
  });

  it('detects bare numeric codes as A-share', () => {
    expect(detectMarket('600519')).toBe('ashare');
    expect(detectMarket('000001')).toBe('ashare');
  });

  it('returns unknown for unrecognized formats', () => {
    expect(detectMarket('BTCUSD')).toBe('unknown');
    expect(detectMarket('')).toBe('unknown');
  });
});

describe('toTushareSymbol', () => {
  it('keeps tushare format unchanged', () => {
    expect(toTushareSymbol('600519.SH')).toBe('600519.SH');
    expect(toTushareSymbol('000001.SZ')).toBe('000001.SZ');
  });

  it('converts stock-sdk prefix format', () => {
    expect(toTushareSymbol('sh600519')).toBe('600519.SH');
    expect(toTushareSymbol('sz000001')).toBe('000001.SZ');
    expect(toTushareSymbol('BJ430047')).toBe('430047.BJ');
  });

  it('infers exchange for bare A-share codes', () => {
    expect(toTushareSymbol('600519')).toBe('600519.SH');
    expect(toTushareSymbol('000001')).toBe('000001.SZ');
    expect(toTushareSymbol('300750')).toBe('300750.SZ');
  });

  it('passes US tickers unchanged', () => {
    expect(toTushareSymbol('AAPL')).toBe('AAPL');
    expect(toTushareSymbol('MSFT')).toBe('MSFT');
  });
});

describe('toSDKSymbol', () => {
  it('converts Tushare format to stock-sdk prefix', () => {
    expect(toSDKSymbol('600519.SH')).toBe('sh600519');
    expect(toSDKSymbol('000001.SZ')).toBe('sz000001');
  });

  it('passes US tickers unchanged', () => {
    expect(toSDKSymbol('AAPL')).toBe('AAPL');
  });
});

describe('toTradingViewSymbol', () => {
  it('converts Tushare format to TradingView format', () => {
    expect(toTradingViewSymbol('600519.SH')).toBe('SSE:600519');
    expect(toTradingViewSymbol('000001.SZ')).toBe('SZSE:000001');
  });

  it('converts stock-sdk prefix to TradingView format', () => {
    expect(toTradingViewSymbol('sh600519')).toBe('SSE:600519');
    expect(toTradingViewSymbol('sz000001')).toBe('SZSE:000001');
  });

  it('passes US tickers unchanged', () => {
    expect(toTradingViewSymbol('AAPL')).toBe('AAPL');
  });
});

describe('normalizeSymbol', () => {
  it('normalizes to all target formats', () => {
    const input = '600519.SH';
    expect(normalizeSymbol(input, 'tushare')).toBe('600519.SH');
    expect(normalizeSymbol(input, 'sdk')).toBe('sh600519');
    expect(normalizeSymbol(input, 'tradingview')).toBe('SSE:600519');
  });
});

// ═══════════════════════════════════════════════════════
// registry.ts
// ═══════════════════════════════════════════════════════

describe('registry', () => {
  it('registers finnhub as default market provider', () => {
    const registered = getRegisteredMarketProviders();
    expect(registered).toContain('finnhub');
  });

  it('returns finnhub provider by name', () => {
    const provider = getMarketProvider('finnhub');
    expect(provider).toBeDefined();
    expect(provider.name).toBe('finnhub');
  });

  it('auto-routes US symbol to finnhub', () => {
    const provider = getMarketProviderForSymbol('AAPL');
    expect(provider.name).toBe('finnhub');
  });

  it('auto-routes A-share symbol to tushare if registered, otherwise finnhub', () => {
    const registered = getRegisteredMarketProviders();
    const expected = registered.includes('tushare') ? 'tushare' : 'finnhub';
    const provider = getMarketProviderForSymbol('600519.SH');
    expect(provider.name).toBe(expected);
  });

  it('throws for unknown provider name', () => {
    expect(() => getMarketProvider('nonexistent')).toThrow();
  });
});

// ═══════════════════════════════════════════════════════
// calendar/us/provider.ts
// ═══════════════════════════════════════════════════════

describe('USTradingCalendar', () => {
  it('correctly identifies weekends', async () => {
    const { USTradingCalendar } = await import('@/lib/providers/calendar/us/provider');
    const cal = new USTradingCalendar();
    // Saturday
    expect(cal.isTradingDay(new Date('2026-05-16'))).toBe(false);
    // Sunday
    expect(cal.isTradingDay(new Date('2026-05-17'))).toBe(false);
    // Monday
    expect(cal.isTradingDay(new Date('2026-05-18'))).toBe(true);
  });

  it('calculates next trading day from Saturday', async () => {
    const { USTradingCalendar } = await import('@/lib/providers/calendar/us/provider');
    const cal = new USTradingCalendar();
    const next = cal.getNextTradingDay(new Date('2026-05-16'));
    expect(next.getDay()).toBe(1); // Monday
    expect(next.getDate()).toBe(18);
  });

  it('returns correct market hours', async () => {
    const { USTradingCalendar } = await import('@/lib/providers/calendar/us/provider');
    const cal = new USTradingCalendar();
    const hours = cal.getMarketHours(new Date());
    expect(hours.open).toBe('09:30');
    expect(hours.close).toBe('16:00');
    expect(hours.timezone).toBe('America/New_York');
  });
});
