// ═══════════════════════════════════════════════════════════════
// Tushare Market Provider — registration entry
// ═══════════════════════════════════════════════════════════════

import { registerMarketProvider } from '../../core/registry';
import { TushareProvider } from './provider';

registerMarketProvider('tushare', () => new TushareProvider());
