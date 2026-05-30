// ═══════════════════════════════════════════════════════════════
// USTradingCalendar — 美国股市交易日历 (NYSE / Nasdaq)
// 纯静态实现，基于算法计算所有节假日，无需外部 API 调用
// ═══════════════════════════════════════════════════════════════

import type { TradingCalendarProvider, MarketHours } from '../../core/types';

// ── Day-of-week constants ──

const SUN = 0;
const MON = 1;
const THU = 4;
const FRI = 5;
const SAT = 6;

// ── Internal helpers ──

/** Return the Nth occurrence of `weekday` (0=Sun .. 6=Sat) in a given month. */
function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  n: number,
): Date {
  const date = new Date(year, month, 1);
  let count = 0;
  while (date.getMonth() === month) {
    if (date.getDay() === weekday) {
      count++;
      if (count === n) return new Date(date);
    }
    date.setDate(date.getDate() + 1);
  }
  throw new Error(
    `Cannot find ${n}th weekday ${weekday} in ${year}-${month + 1}`,
  );
}

/** Return the LAST occurrence of `weekday` in a given month. */
function lastWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
): Date {
  const date = new Date(year, month + 1, 0);
  while (date.getDay() !== weekday) {
    date.setDate(date.getDate() - 1);
  }
  return new Date(date);
}

/**
 * Anonymous Gregorian algorithm for Easter Sunday.
 * Valid for all years in the Gregorian calendar (1583+).
 */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Good Friday = Friday before Easter Sunday. */
function goodFriday(year: number): Date {
  const easter = easterSunday(year);
  const gf = new Date(easter);
  gf.setDate(gf.getDate() - 2);
  return gf;
}

/**
 * For fixed-date holidays (e.g. Jan 1, Jul 4, Dec 25):
 * - Saturday → observed on preceding Friday
 * - Sunday   → observed on following Monday
 * - Weekday  → observed on the day itself
 *
 * Returns the observed date, which may fall in a different year
 * (e.g. Jan 1 Saturday → observed Dec 31 of previous year).
 */
function observedFixedHoliday(
  year: number,
  month: number,
  day: number,
): Date {
  const date = new Date(year, month, day);
  const dow = date.getDay();
  if (dow === SAT) {
    const obs = new Date(date);
    obs.setDate(obs.getDate() - 1);
    return obs;
  }
  if (dow === SUN) {
    const obs = new Date(date);
    obs.setDate(obs.getDate() + 1);
    return obs;
  }
  return date;
}

/** Normalise a Date to midnight local time (year/month/day only). */
function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** YYYYMMDD string key for fast Set lookups. */
function yyyymmdd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// ── Holiday computation per year ──

const holidayCache = new Map<number, Set<string>>();

/**
 * Build the set of US market holidays (observed closing dates) for a given year.
 * All dates are at midnight in the local timezone.
 */
function buildHolidaySet(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const holidays: Date[] = [];

  // 1. New Year's Day (Jan 1)
  {
    const d = observedFixedHoliday(year, 0, 1);
    if (d.getFullYear() === year) holidays.push(d);
  }

  // 2. Martin Luther King Jr. Day (3rd Monday of January)
  holidays.push(nthWeekdayOfMonth(year, 0, MON, 3));

  // 3. Presidents' Day / Washington's Birthday (3rd Monday of February)
  holidays.push(nthWeekdayOfMonth(year, 1, MON, 3));

  // 4. Good Friday (Friday before Easter)
  holidays.push(goodFriday(year));

  // 5. Memorial Day (last Monday of May)
  holidays.push(lastWeekdayOfMonth(year, 4, MON));

  // 6. Juneteenth National Independence Day (Jun 19)
  {
    const d = observedFixedHoliday(year, 5, 19);
    if (d.getFullYear() === year) holidays.push(d);
  }

  // 7. Independence Day (Jul 4)
  {
    const d = observedFixedHoliday(year, 6, 4);
    if (d.getFullYear() === year) holidays.push(d);
  }

  // 8. Labor Day (1st Monday of September)
  holidays.push(nthWeekdayOfMonth(year, 8, MON, 1));

  // 9. Thanksgiving Day (4th Thursday of November)
  holidays.push(nthWeekdayOfMonth(year, 10, THU, 4));

  // 10. Christmas Day (Dec 25)
  {
    const d = observedFixedHoliday(year, 11, 25);
    if (d.getFullYear() === year) holidays.push(d);
  }

  const set = new Set(holidays.map(yyyymmdd));
  holidayCache.set(year, set);
  return set;
}

// ═══════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════

export class USTradingCalendar implements TradingCalendarProvider {
  readonly name = 'us';

  // ── Core interface ──

  isTradingDay(date: Date): boolean {
    const d = toDateOnly(date);
    const dow = d.getDay();

    // Weekend — never a trading day
    if (dow === SAT || dow === SUN) return false;

    // Holiday — check the year's holiday set
    const holidays = buildHolidaySet(d.getFullYear());
    return !holidays.has(yyyymmdd(d));
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
      close: '16:00',
      timezone: 'America/New_York',
    };
  }

  /**
   * Return the list of observed holidays for the given year.
   * Returns new Date copies to prevent external mutation of cached values.
   */
  getHolidays(year: number): Date[] {
    const keys = buildHolidaySet(year);
    const result: Date[] = [];
    for (const key of keys) {
      const y = Number(key.slice(0, 4));
      const m = Number(key.slice(4, 6)) - 1;
      const d = Number(key.slice(6, 8));
      result.push(new Date(y, m, d));
    }
    result.sort((a, b) => a.getTime() - b.getTime());
    return result;
  }
}
