import {
  addDays as addDaysToDate,
  addMonths as addMonthsToDate,
  differenceInCalendarDays,
  endOfMonth as endOfMonthDate,
  format,
  startOfMonth as startOfMonthDate,
  startOfWeek as startOfWeekDate,
} from "date-fns";

/**
 * A local calendar date as `YYYY-MM-DD`. Keys sort and compare chronologically
 * with plain string comparison (`<`, `>`, `===`).
 */
export type DateKey = string;

/** 0 = Sunday ... 6 = Saturday, matching `Date#getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const DATE_KEY_FORMAT = "yyyy-MM-dd";
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Date keys are parsed and formatted thousands of times per render (streaks walk
// every day of a habit's life), so both use plain Date arithmetic: date-fns's
// generic parse/format is ~40x slower. Results match date-fns exactly
// (see dates.test.ts), including where DST skips local midnight.

function parseOrNull(value: string): Date | null {
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11 || day < 1 || day > daysInMonth(year, month)) return null;
  const date = new Date(0);
  // setFullYear (unlike the Date constructor) keeps years 0-99 as written.
  date.setFullYear(year, month, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysInMonth(year: number, month: number): number {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return month === 1 && leap ? 29 : (DAYS_IN_MONTH[month] ?? 31);
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

export function isDateKey(value: string): boolean {
  return parseOrNull(value) !== null;
}

/** Local midnight (or the first valid instant of that day) for a date key. */
export function parseDateKey(key: DateKey): Date {
  const date = parseOrNull(key);
  if (date === null) {
    throw new RangeError(`Invalid date key: "${key}"`);
  }
  return date;
}

/** The local calendar date of `date`, never its UTC date. */
export function toDateKey(date: Date): DateKey {
  const year = date.getFullYear();
  // Same output as date-fns for every 4-digit year; anything else (or an
  // invalid date, which date-fns rejects) goes through date-fns.
  if (!(year >= 0 && year <= 9999)) return format(date, DATE_KEY_FORMAT);
  return `${pad(year, 4)}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;
}

/** The current local date. The only clock read in the domain layer, so tests can mock it. */
export function today(): DateKey {
  return toDateKey(new Date());
}

export function addDays(key: DateKey, amount: number): DateKey {
  return toDateKey(addDaysToDate(parseDateKey(key), amount));
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: DateKey, to: DateKey): number {
  return differenceInCalendarDays(parseDateKey(to), parseDateKey(from));
}

export function getWeekday(key: DateKey): Weekday {
  return parseDateKey(key).getDay() as Weekday;
}

/** The Monday on or before `key`. Weeks run Monday to Sunday. */
export function startOfWeek(key: DateKey): DateKey {
  return toDateKey(startOfWeekDate(parseDateKey(key), { weekStartsOn: 1 }));
}

/** The first day of the month containing `key`. */
export function startOfMonth(key: DateKey): DateKey {
  return toDateKey(startOfMonthDate(parseDateKey(key)));
}

/** The last day of the month containing `key`. */
export function endOfMonth(key: DateKey): DateKey {
  return toDateKey(endOfMonthDate(parseDateKey(key)));
}

/** Moves by whole months, clamping to the month's last day (Jan 31 + 1 month = Feb 28). */
export function addMonths(key: DateKey, amount: number): DateKey {
  return toDateKey(addMonthsToDate(parseDateKey(key), amount));
}

/** Every date from `from` to `to`, inclusive. Empty if `from` is after `to`. */
export function eachDay(from: DateKey, to: DateKey): DateKey[] {
  // Count calendar days rather than comparing instants: where a DST change skips
  // midnight, a day starts at 01:00 and would compare as after the end date.
  const start = parseDateKey(from);
  const count = differenceInCalendarDays(parseDateKey(to), start);
  const days: DateKey[] = [];
  for (let offset = 0; offset <= count; offset += 1) {
    days.push(toDateKey(addDaysToDate(start, offset)));
  }
  return days;
}

export function minDateKey(a: DateKey, b: DateKey): DateKey {
  return a < b ? a : b;
}

export function maxDateKey(a: DateKey, b: DateKey): DateKey {
  return a > b ? a : b;
}
