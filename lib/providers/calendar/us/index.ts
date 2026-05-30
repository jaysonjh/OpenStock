// ═══════════════════════════════════════════════════════════════
// USTradingCalendar — registration entry
// ═══════════════════════════════════════════════════════════════

import { registerCalendarProvider } from '../../core/registry';
import { USTradingCalendar } from './provider';

registerCalendarProvider('us', () => new USTradingCalendar());
