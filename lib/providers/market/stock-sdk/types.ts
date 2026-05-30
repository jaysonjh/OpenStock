// ═══════════════════════════════════════════════════════════════
// stock-sdk — Internal type aliases for SDK response shapes
// ═══════════════════════════════════════════════════════════════

export interface SDKQuoteItem {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
}

export interface SDKSearchItem {
  code: string;
  name: string;
  type?: string;
  exchange?: string;
}
