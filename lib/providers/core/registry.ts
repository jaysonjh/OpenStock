// ═══════════════════════════════════════════════════════════════
// Provider Registry — 注册 / 获取 / 多市场路由
// 三个领域各自独立注册表，环境变量驱动 Provider 选择
// ═══════════════════════════════════════════════════════════════

import type {
  MarketDataProvider,
  SentimentProvider,
  TradingCalendarProvider,
} from './types';

// ── 三个领域的注册表 ──

const marketProviders = new Map<string, () => MarketDataProvider>();
const sentimentProviders = new Map<string, () => SentimentProvider>();
const calendarProviders = new Map<string, () => TradingCalendarProvider>();

// ── 注册函数 ──

export function registerMarketProvider(
  name: string,
  factory: () => MarketDataProvider,
): void {
  marketProviders.set(name, factory);
}

export function registerSentimentProvider(
  name: string,
  factory: () => SentimentProvider,
): void {
  sentimentProviders.set(name, factory);
}

export function registerCalendarProvider(
  name: string,
  factory: () => TradingCalendarProvider,
): void {
  calendarProviders.set(name, factory);
}

// ── 辅助: 从 env 或默认值获取 provider 名称 ──

function resolveName(
  explicit: string | undefined,
  envKey: string,
  defaultName: string,
): string {
  return explicit ?? process.env[envKey] ?? defaultName;
}

// ── 辅助: 从注册表解析 provider ──

function resolveProvider<T>(
  name: string,
  registry: Map<string, () => T>,
): T {
  const factory = registry.get(name);
  if (!factory) {
    const available = [...registry.keys()].join(', ');
    throw new Error(
      `Unknown provider: "${name}". Available: ${available || '(none registered)'}`,
    );
  }
  return factory();
}

// ── 获取 Provider (env 驱动) ──

export function getMarketProvider(name?: string): MarketDataProvider {
  const key = resolveName(name, 'MARKET_DATA_PROVIDER', 'finnhub');
  return resolveProvider(key, marketProviders);
}

export function getSentimentProvider(name?: string): SentimentProvider {
  const key = resolveName(name, 'SENTIMENT_PROVIDER', 'adanos');
  return resolveProvider(key, sentimentProviders);
}

export function getCalendarProvider(name?: string): TradingCalendarProvider {
  const key = resolveName(name, 'CALENDAR_PROVIDER', 'us');
  return resolveProvider(key, calendarProviders);
}

// ── 查询已注册的 Provider ──

export function getRegisteredMarketProviders(): string[] {
  return [...marketProviders.keys()];
}

export function getRegisteredSentimentProviders(): string[] {
  return [...sentimentProviders.keys()];
}

export function getRegisteredCalendarProviders(): string[] {
  return [...calendarProviders.keys()];
}

// ═══════════════════════════════════════════════════════════════
// 多市场自动路由
// ═══════════════════════════════════════════════════════════════

/**
 * 符号格式 → 推荐 Provider 的路由表
 * 正则按优先级排序：更具体的模式在前
 */
const SYMBOL_ROUTE_TABLE: Array<[RegExp, string]> = [
  // A股: 6位数字 + SH/SZ/BJ (如 600519.SH)
  [/^\d{6}\.(SH|SZ|BJ)$/i, 'tushare'],
  // A股: 5位数字 + SH/SZ (如 00001.SZ  — 有些代码是5位)
  [/^\d{5}\.(SH|SZ)$/i, 'tushare'],
];

/**
 * 根据符号格式自动选择 Provider
 * - 匹配路由表时返回对应 Provider (若已注册)
 * - 不匹配或目标未注册时 fallback 到默认 Provider
 */
export function getMarketProviderForSymbol(symbol: string): MarketDataProvider {
  const normalized = symbol.trim().toUpperCase();

  for (const [pattern, providerName] of SYMBOL_ROUTE_TABLE) {
    if (pattern.test(normalized) && marketProviders.has(providerName)) {
      return resolveProvider(providerName, marketProviders);
    }
  }

  // Fallback: 默认 Provider (finnhub)
  return getMarketProvider();
}
