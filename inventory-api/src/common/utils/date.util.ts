/**
 * Formats a date/time in the system's configured timezone
 * (SYSTEM_TIMEZONE env var, defaults to Asia/Colombo).
 *
 * Used by report generation (PDF/Excel) and report emails so timestamps
 * reflect local Sri Lanka time instead of the container's UTC clock.
 */
export function formatInSystemTz(
  value: Date | string | number = new Date(),
  options: Intl.DateTimeFormatOptions = {},
): string {
  const tz = process.env.SYSTEM_TIMEZONE || 'Asia/Colombo';
  const date = value instanceof Date ? value : new Date(value);
  try {
    return date.toLocaleString('en-US', { timeZone: tz, ...options });
  } catch {
    // Fallback if an invalid timezone string is configured
    return date.toLocaleString('en-US', options);
  }
}

/** The configured system timezone (defaults to Asia/Colombo). */
export function getSystemTimezone(): string {
  return process.env.SYSTEM_TIMEZONE || 'Asia/Colombo';
}

/**
 * Returns how many minutes `tz` is ahead of UTC at the given instant
 * (e.g. +330 for Asia/Colombo). Works for fixed-offset and DST zones.
 */
export function tzOffsetMinutes(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const m: Record<string, number> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') m[p.type] = Number(p.value);
  }
  // hour can come back as 24 for midnight in some engines; normalize
  const hour = m.hour === 24 ? 0 : m.hour;
  const asUtc = Date.UTC(m.year, m.month - 1, m.day, hour, m.minute, m.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/**
 * Converts a wall-clock time expressed in `tz` to the corresponding absolute
 * UTC Date. e.g. (2026,6,2,8,0,'Asia/Colombo') -> the instant that reads
 * 08:00 in Colombo (02:30 UTC).
 */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const off = tzOffsetMinutes(new Date(guess), tz);
  let utcMs = guess - off * 60000;
  // Re-evaluate the offset at the computed instant to handle DST boundaries
  const off2 = tzOffsetMinutes(new Date(utcMs), tz);
  if (off2 !== off) utcMs = guess - off2 * 60000;
  return new Date(utcMs);
}

/** Returns YYYY-MM-DD for the given instant in the system timezone. */
export function systemDateStamp(value: Date | string | number = new Date()): string {
  const tz = getSystemTimezone();
  const date = value instanceof Date ? value : new Date(value);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}
