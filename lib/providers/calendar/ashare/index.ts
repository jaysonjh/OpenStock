// ═══════════════════════════════════════════════════════════════
// AShareTradingCalendar — registration entry
// ═══════════════════════════════════════════════════════════════

import { registerCalendarProvider } from '../../core/registry';
import { AShareTradingCalendar } from './provider';

registerCalendarProvider('ashare', () => new AShareTradingCalendar());
