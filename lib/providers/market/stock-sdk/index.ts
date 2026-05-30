// ═══════════════════════════════════════════════════════════════
// stock-sdk Market Provider — registration entry
// ═══════════════════════════════════════════════════════════════

import { registerMarketProvider } from '../../core/registry';
import { StockSDKProvider } from './provider';

registerMarketProvider('stock-sdk', () => new StockSDKProvider());
