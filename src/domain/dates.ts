import {
  addDays as addDaysToDate,
  addMonths as addMonthsToDate,
  differenceInCalendarDays,
  endOfMonth as endOfMonthDate,
  format,
  isValid,
  parse,
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
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// Only fills fields missing from the parsed string; a full date key overrides all of them.
const PARSE_REFERENCE = new Date(0);

function parseOrNull(value: string): Date | null {
  if (!DATE_KEY_PATTERN.test(value)) return null;
  const date = parse(value, DATE_KEY_FORMAT, PARSE_REFERENCE);
  return isValid(date) ? date : null;
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
  return format(date, DATE_KEY_FORMAT);
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
