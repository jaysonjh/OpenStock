// ═══════════════════════════════════════════════════════════════
// Finnhub Market Provider — registration entry
// ═══════════════════════════════════════════════════════════════

import { registerMarketProvider } from '../../core/registry';
import { FinnhubAdapter } from './adapter';

registerMarketProvider('finnhub', () => new FinnhubAdapter());
