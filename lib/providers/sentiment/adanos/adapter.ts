// ═══════════════════════════════════════════════════════════════
// AdanosAdapter — Adanos → SentimentProvider 适配器
// 将 adanos.actions.getStockSentimentInsights 的返回类型
// 映射到统一的 SentimentResult / SentimentSource 接口
// ═══════════════════════════════════════════════════════════════

import type { SentimentProvider, SentimentResult, SentimentSource } from '../../core/types';
import { getStockSentimentInsights } from '@/lib/actions/adanos.actions';
import type { StockSentimentInsights, SentimentSourceInsight } from '@/lib/actions/adanos.helpers';

/**
 * 将 Adanos 专有的 SentimentSourceInsight 映射到统一的 SentimentSource。
 */
function mapSource(source: SentimentSourceInsight): SentimentSource {
  return {
    sourceKey: source.source,
    sourceLabel: source.label,
    buzzScore: source.buzzScore,
    bullishPct: source.bullishPct,
    trend: source.trend,
    metricLabel: source.metricLabel,
    metricValue: source.metricValue,
  };
}

/**
 * 将 Adanos 专有的 StockSentimentInsights 映射到统一的 SentimentResult。
 */
function mapResult(insights: StockSentimentInsights): SentimentResult {
  return {
    symbol: insights.symbol,
    companyName: insights.companyName,
    averageBuzz: insights.averageBuzz,
    bullishAverage: insights.bullishAverage,
    sourceAlignment: insights.sourceAlignment,
    availableSources: insights.availableSources,
    sources: insights.sources.map(mapSource),
  };
}

/**
 * AdanosAdapter — 实现 SentimentProvider 接口，底层委托给
 * adanos.actions.getStockSentimentInsights。
 */
export class AdanosAdapter implements SentimentProvider {
  readonly name = 'adanos';

  async getSentiment(symbol: string, days?: number): Promise<SentimentResult | null> {
    try {
      const raw = await getStockSentimentInsights(symbol, days ?? 7);
      if (!raw) return null;
      return mapResult(raw);
    } catch {
      return null;
    }
  }

  async getSentiments(
    symbols: string[],
    days?: number,
  ): Promise<Record<string, SentimentResult | null>> {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const result = await this.getSentiment(symbol, days);
        return [symbol, result] as const;
      }),
    );
    return Object.fromEntries(results);
  }
}
