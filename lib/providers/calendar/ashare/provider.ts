// ═══════════════════════════════════════════════════════════════
// AShareTradingCalendar — 中国 A 股交易日历 (基于 Tushare trade_cal)
// ═══════════════════════════════════════════════════════════════

import type { TradingCalendarProvider, MarketHours } from '../../core/types';

// ── Tushare API 响应类型 ──

interface TushareTradeCalResponse {
  code: number;
  data?: {
    fields: string[];
    items: (string | number)[][];
  };
}

// ── Provider ──

export class AShareTradingCalendar implements TradingCalendarProvider {
  readonly name = 'ashare';

  /** 交易日缓存: YYYYMMDD 字符串集合, null 表示不可用 (走 weekday 降级) */
  private tradingDays: Set<string> | null = null;

  constructor() {
    // 异步拉取并填充缓存; 失败时静默降级 (tradingDays 保持 null)
    this.init().catch(() => {
      /* 静默降级 — weekday 兜底 */
    });
  }

  // ── 初始化 ──

  private async init(): Promise<void> {
    const token = process.env.TUSHARE_API_TOKEN;
    if (!token) {
      // 无 token — 使用 weekday 降级
      return;
    }

    const year = new Date().getFullYear();
    const startDate = `${year}0101`;
    const endDate = `${year}1231`;

    const response = await fetch('https://api.tushare.pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_name: 'trade_cal',
        token,
        params: { exchange: 'SSE', start_date: startDate, end_date: endDate },
        fields: 'cal_date,is_open,pretrade_date',
      }),
    });

    if (!response.ok) {
      throw new Error(`Tushare API 返回 HTTP ${response.status}`);
    }

    const json: TushareTradeCalResponse = await response.json();

    if (json.code !== 0 || !json.data) {
      throw new Error(`Tushare API 返回 code ${json.code}`);
    }

    const dateIdx = json.data.fields.indexOf('cal_date');
    const openIdx = json.data.fields.indexOf('is_open');
    if (dateIdx === -1 || openIdx === -1) {
      throw new Error('Tushare trade_cal 响应字段格式异常');
    }

    const tradingDays = new Set<string>();
    for (const item of json.data.items) {
      if (Number(item[openIdx]) === 1) {
        tradingDays.add(String(item[dateIdx]));
      }
    }

    this.tradingDays = tradingDays;
  }

  // ── 日期格式化 ──

  private toYYYYMMDD(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  // ── 接口实现 ──

  isTradingDay(date: Date): boolean {
    const key = this.toYYYYMMDD(date);

    // 缓存可用时优先查缓存
    if (this.tradingDays !== null) {
      return this.tradingDays.has(key);
    }

    // 降级: 仅按周末判断 (周一至周五均为交易日)
    const day = date.getDay();
    return day !== 0 && day !== 6;
  }

  getNextTradingDay(from: Date): Date {
    const next = new Date(from);
    next.setDate(next.getDate() + 1);
    while (!this.isTradingDay(next)) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  getPrevTradingDay(from: Date): Date {
    const prev = new Date(from);
    prev.setDate(prev.getDate() - 1);
    while (!this.isTradingDay(prev)) {
      prev.setDate(prev.getDate() - 1);
    }
    return prev;
  }

  getMarketHours(_date: Date): MarketHours {
    return {
      open: '09:30',
      close: '15:00',
      timezone: 'Asia/Shanghai',
    };
  }

  getHolidays(_year: number): Date[] {
    // A 股假期未单独列举; 非交易日已在 cached/isTradingDay 中体现
    return [];
  }
}
