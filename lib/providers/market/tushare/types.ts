// ═══════════════════════════════════════════════════════════════
// Tushare API — TypeScript type definitions
// ═══════════════════════════════════════════════════════════════

export interface TushareRequest {
  api_name: string;
  token: string;
  params?: Record<string, string>;
  fields?: string;
}

export interface TushareResponse<T = unknown> {
  code: number;
  msg: string;
  data?: {
    fields: string[];
    items: T[][];
    has_more?: boolean;
  };
}

// Daily K-line row from daily API
export interface TushareDailyRow {
  ts_code: string;    // '600519.SH'
  trade_date: string; // '20260515'
  open: number;
  high: number;
  low: number;
  close: number;
  pre_close: number;
  change?: number;
  pct_chg?: number;
  vol?: number;
  amount?: number;
}

// Calendar row from trade_cal API
export interface TushareCalendarRow {
  cal_date: string;
  is_open: 0 | 1;
  pretrade_date?: string;
}
