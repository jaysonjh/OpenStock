// ═══════════════════════════════════════════════════════════════
// Symbol Format Conversion — 美股 / A股 / TradingView 代码互转
// ═══════════════════════════════════════════════════════════════

/** A股交易所代码 ↔ TradingView 前缀映射 */
const EXCHANGE_TO_TV: Record<string, string> = {
  SH: 'SSE',
  SZ: 'SZSE',
  BJ: 'BSE',
};

const TV_TO_EXCHANGE: Record<string, string> = {
  SSE: 'SH',
  SZSE: 'SZ',
  BSE: 'BJ',
};

/** 数字代码推断交易所后缀（A股 6 位代码的默认规则） */
function inferAShareExchange(ticker: string): string {
  if (!/^\d{6}$/.test(ticker)) return 'SH';
  const first = ticker[0];
  if (first === '6' || first === '9') return 'SH';
  if (first === '0' || first === '3' || first === '2') return 'SZ';
  if (first === '8' || first === '4') return 'BJ';
  return 'SH';
}

/** 根据数字代码推断交易所后缀（A股5位代码兼容） */
function inferExchange5Digit(ticker: string): string {
  if (!/^\d{5}$/.test(ticker)) return 'SH';
  const first = ticker[0];
  if (first === '6') return 'SH';
  if (first === '0') return 'SZ';
  return 'SH';
}

// ── 市场检测 ──

export type Market = 'us' | 'ashare' | 'hk' | 'unknown';

export function detectMarket(symbol: string): Market {
  const s = symbol.trim().toUpperCase();

  // A股: 6位数字 + 后缀
  if (/^\d{6}\.(SH|SZ|BJ)$/.test(s)) return 'ashare';
  // A股: 5位数字 + 后缀
  if (/^\d{5}\.(SH|SZ)$/.test(s)) return 'ashare';
  // A股: stock-sdk 前缀格式
  if (/^(SH|SZ|BJ)\d{5,6}$/.test(s)) return 'ashare';
  // 港股
  if (/^\d{4,5}\.HK$/.test(s)) return 'hk';
  // 纯数字（5-6位）很可能是 A 股
  if (/^\d{5,6}$/.test(s)) return 'ashare';

  // 美股: 纯字母 1-5 位
  if (/^[A-Z]{1,5}$/.test(s)) return 'us';

  return 'unknown';
}

// ── Tushare 格式转换 ──

/** 任意格式 → Tushare 格式 (600519.SH) */
export function toTushareSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase();

  // 已经是 Tushare 格式
  if (/^\d{5,6}\.(SH|SZ|BJ)$/.test(s)) return s;

  // stock-sdk 前缀格式: sh600519 → 600519.SH
  const sdkMatch = s.match(/^(SH|SZ|BJ)(\d{5,6})$/);
  if (sdkMatch) {
    return `${sdkMatch[2]}.${sdkMatch[1]}`;
  }

  // TradingView 格式: SSE:600519 → 600519.SH
  const tvMatch = s.match(/^([A-Z]+):(\d{5,6})$/);
  if (tvMatch) {
    const exchange = TV_TO_EXCHANGE[tvMatch[1]];
    if (exchange) return `${tvMatch[2]}.${exchange}`;
  }

  // 纯数字 6 位: 600519 → 600519.SH
  if (/^\d{6}$/.test(s)) {
    return `${s}.${inferAShareExchange(s)}`;
  }

  // 纯数字 5 位
  if (/^\d{5}$/.test(s)) {
    return `${s}.${inferExchange5Digit(s)}`;
  }

  // 非 A 股(美股等): 原样返回
  return s;
}

// ── stock-sdk 格式转换 ──

/** 任意格式 → stock-sdk 前缀格式 (sh600519) */
export function toSDKSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase();

  // 已经是 stock-sdk 格式
  if (/^(SH|SZ|BJ)\d{5,6}$/.test(s)) return s;

  // Tushare 格式: 600519.SH → sh600519
  const tushareMatch = s.match(/^(\d{5,6})\.(SH|SZ|BJ)$/);
  if (tushareMatch) {
    return `${tushareMatch[2].toLowerCase()}${tushareMatch[1]}`;
  }

  // TradingView 格式: SSE:600519 → sh600519
  const tvMatch = s.match(/^([A-Z]+):(\d{5,6})$/);
  if (tvMatch) {
    const exchange = TV_TO_EXCHANGE[tvMatch[1]];
    if (exchange) return `${exchange.toLowerCase()}${tvMatch[2]}`;
  }

  // 纯数字: 600519 → sh600519
  if (/^\d{6}$/.test(s)) {
    return `${inferAShareExchange(s).toLowerCase()}${s}`;
  }
  if (/^\d{5}$/.test(s)) {
    return `${inferExchange5Digit(s).toLowerCase()}${s}`;
  }

  // 非 A 股: 原样返回
  return s;
}

// ── TradingView 格式转换 ──

/** 任意格式 → TradingView 格式 (SSE:600519) */
export function toTradingViewSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase();

  // 已经是 TradingView 格式
  if (/^[A-Z]+:\d{5,6}$/.test(s)) return s;

  // Tushare 格式: 600519.SH → SSE:600519
  const tushareMatch = s.match(/^(\d{5,6})\.(SH|SZ|BJ)$/);
  if (tushareMatch) {
    const tv = EXCHANGE_TO_TV[tushareMatch[2]];
    if (tv) return `${tv}:${tushareMatch[1]}`;
  }

  // stock-sdk 格式: sh600519 → SSE:600519
  const sdkMatch = s.match(/^(SH|SZ|BJ)(\d{5,6})$/);
  if (sdkMatch) {
    const tv = EXCHANGE_TO_TV[sdkMatch[1]];
    if (tv) return `${tv}:${sdkMatch[2]}`;
  }

  // 纯数字: 600519 → SSE:600519
  if (/^\d{6}$/.test(s)) {
    const exchange = inferAShareExchange(s);
    const tv = EXCHANGE_TO_TV[exchange];
    if (tv) return `${tv}:${s}`;
  }

  // 非 A 股: 原样返回
  return s;
}

// ── 通用格式转换 ──

export type TargetFormat = 'tushare' | 'sdk' | 'tradingview';

export function normalizeSymbol(symbol: string, target: TargetFormat): string {
  switch (target) {
    case 'tushare': return toTushareSymbol(symbol);
    case 'sdk': return toSDKSymbol(symbol);
    case 'tradingview': return toTradingViewSymbol(symbol);
  }
}
