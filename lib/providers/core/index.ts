// ═══════════════════════════════════════════════════════════════
// Provider Core — 条件加载入口
// 默认 Provider 无条件加载; 条件 Provider 仅 env 存在时加载
// ═══════════════════════════════════════════════════════════════

export * from './types';
export * from './registry';

// ── 无条件加载: 默认 Provider ──
import '../market/finnhub';
import '../sentiment/adanos';
import '../calendar/us';

// ── 条件加载: A股市场数据 ──
if (process.env.TUSHARE_API_TOKEN) {
  import('../market/tushare');
}

// stock-sdk 始终可用 (零配置)
try {
  import('../market/stock-sdk');
} catch {
  // stock-sdk 未安装时静默跳过
}

// ── 条件加载: A股交易日历 ──
if (process.env.TUSHARE_API_TOKEN) {
  import('../calendar/ashare');
}
