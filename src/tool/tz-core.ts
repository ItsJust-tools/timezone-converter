/**
 * Timezone core — pure DST-aware conversion and formatting helpers built on
 * the ECMAScript Internationalization API. All functions are side-effect free
 * so they can be unit-tested deterministically.
 */

export interface ZoneDisplay {
  /** Full localized zone name, e.g. "Central European Standard Time". */
  name: string;
  /** Abbreviation, e.g. "GMT+1", "CET", "EDT". */
  abbreviation: string;
  /** Offset from UTC in minutes (positive east of Greenwich). */
  offsetMinutes: number;
  /** Offset formatted as "UTC+HH:MM". */
  offsetLabel: string;
}

export interface ConversionResult {
  /** ISO 8601 string of the converted moment with zone offset, or null when invalid. */
  iso: string | null;
  /** Local date part in the source zone, e.g. "2026-03-28". */
  sourceDate: string | null;
  /** Local time part in the source zone, e.g. "23:30". */
  sourceTime: string | null;
  /** Local date part in the target zone. */
  targetDate: string | null;
  /** Local time part in the target zone. */
  targetTime: string | null;
  /** Difference in minutes between zone offsets (target − source). */
  differenceMinutes: number | null;
  /** Difference formatted as "H:MM" with sign (hours/minutes). */
  differenceLabel: string | null;
}

export interface ToolState {
  /** Source IANA timezone. */
  sourceZone: string;
  /** Target IANA timezone. */
  targetZone: string;
  /** Date part of the input in the source zone ("YYYY-MM-DD"), "" = today. */
  dateInput: string;
  /** Time part of the input ("HH:MM" or "HH:MM:SS"). */
  timeInput: string;
  /** Additional zones shown in the comparison list. */
  compareZones: string[];
  /** Saved snapshot entries, newest first. */
  history: HistoryEntry[];
}

export interface HistoryEntry {
  text: string;
  createdAt: string;
}

export const COMMON_ZONES: { zone: string; label: string }[] = [
  { zone: 'UTC', label: 'UTC' },
  { zone: 'Europe/London', label: 'London' },
  { zone: 'Europe/Berlin', label: 'Berlin' },
  { zone: 'Europe/Paris', label: 'Paris' },
  { zone: 'Europe/Moscow', label: 'Moscow' },
  { zone: 'America/New_York', label: 'New York' },
  { zone: 'America/Chicago', label: 'Chicago' },
  { zone: 'America/Denver', label: 'Denver' },
  { zone: 'America/Los_Angeles', label: 'Los Angeles' },
  { zone: 'America/Sao_Paulo', label: 'São Paulo' },
  { zone: 'Asia/Dubai', label: 'Dubai' },
  { zone: 'Asia/Kolkata', label: 'Mumbai' },
  { zone: 'Asia/Shanghai', label: 'Shanghai' },
  { zone: 'Asia/Tokyo', label: 'Tokyo' },
  { zone: 'Asia/Singapore', label: 'Singapore' },
  { zone: 'Australia/Sydney', label: 'Sydney' },
  { zone: 'Pacific/Auckland', label: 'Auckland' },
  { zone: 'Pacific/Honolulu', label: 'Honolulu' },
];

export const DEFAULT_STATE: ToolState = {
  sourceZone: 'Europe/London',
  targetZone: 'America/New_York',
  dateInput: '',
  timeInput: '12:00',
  compareZones: ['UTC'],
  history: [],
};

/** True when the runtime can resolve the given IANA zone. */
export function isValidZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Replace empty/invalid zones with sensible defaults. */
export function normalizeZone(zone: string, fallback = 'UTC'): string {
  return isValidZone(zone) ? zone : fallback;
}

/** Offset of `zone` from UTC, in minutes, at the given instant. */
export function zoneOffsetMinutes(date: Date, zone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string): number => {
    const part = parts.find((p) => p.type === type);
    return part ? Number(part.value) : 0;
  };
  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second')
  );
  return Math.round((asUTC - date.getTime()) / 60000);
}

/** "UTC+HH:MM" / "UTC-HH:MM" label from a minute offset. */
export function offsetLabel(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${hh}:${mm}`;
}

/** Difference formatted as "±H:MM" (e.g. "6:00", "-3:30", "0:00"). */
export function differenceLabel(minutes: number): string {
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}:${String(m).padStart(2, '0')}`;
}

/** Resolve an abbreviation like "CET" / "GMT+2" for a zone at an instant. */
export function zoneAbbreviation(date: Date, zone: string): string {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' });
  const parts = dtf.formatToParts(date);
  const name = parts.find((p) => p.type === 'timeZoneName');
  return name ? name.value : offsetLabel(zoneOffsetMinutes(date, zone));
}

/** Full localized zone name at an instant, e.g. "Central European Summer Time". */
export function zoneLongName(date: Date, zone: string): string {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'long' });
    const parts = dtf.formatToParts(date);
    const name = parts.find((p) => p.type === 'timeZoneName');
    return name ? name.value : zone;
  } catch {
    return zone;
  }
}

/** ZoneDisplay for one zone at one instant. */
export function zoneDisplay(date: Date, zone: string): ZoneDisplay {
  const offsetMinutes = zoneOffsetMinutes(date, zone);
  let abbreviation = offsetLabel(offsetMinutes);
  try {
    abbreviation = zoneAbbreviation(date, zone);
  } catch {
    // keep offset label
  }
  return {
    name: zoneLongName(date, zone),
    abbreviation,
    offsetMinutes,
    offsetLabel: offsetLabel(offsetMinutes),
  };
}

/** Local "YYYY-MM-DD" and "HH:MM" parts of an instant in a zone. */
export function localParts(date: Date, zone: string): { date: string; time: string } {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const pick = (type: string): string => {
    const p = parts.find((x) => x.type === type);
    return p ? p.value : '';
  };
  const hour = pick('hour') === '24' ? '00' : pick('hour');
  return {
    date: `${pick('year')}-${pick('month')}-${pick('day')}`,
    time: `${hour}:${pick('minute')}`,
  };
}

/** "YYYY-MM-DD" for the current date in a zone. */
export function todayInZone(date: Date, zone: string): string {
  return localParts(date, zone).date;
}

function padSeconds(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

/**
 * Parse a wall-clock date/time in the source zone into an absolute instant.
 * Returns null for missing or unparseable input (never throws).
 */
export function parseLocalInput(
  dateInput: string,
  timeInput: string,
  zone: string
): { instant: Date; usedNow: boolean } | null {
  const date = (dateInput || '').trim();
  const time = (timeInput || '').trim();
  if (!date && !time) return null;
  const datePart = date || todayInZone(new Date(), zone);
  const timePart = time || '00:00';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(timePart)) return null;
  // Resolve in UTC first, then correct by the zone's offset (two-pass handles DST).
  const naive = Date.parse(`${datePart}T${padSeconds(timePart)}Z`);
  if (Number.isNaN(naive)) return null;
  // Two-pass: estimate with the offset at the naive instant, then refine.
  const first = new Date(naive - zoneOffsetMinutes(new Date(naive), zone) * 60000);
  const corrected = new Date(naive - zoneOffsetMinutes(first, zone) * 60000);
  return { instant: corrected, usedNow: !date };
}

/**
 * Convert a parsed instant between zones and produce all display fields.
 * Invalid input or unknown zones return a result with null fields (no throw).
 */
export function convert(
  dateInput: string,
  timeInput: string,
  sourceZone: string,
  targetZone: string
): ConversionResult {
  const empty: ConversionResult = {
    iso: null,
    sourceDate: null,
    sourceTime: null,
    targetDate: null,
    targetTime: null,
    differenceMinutes: null,
    differenceLabel: null,
  };
  if (!isValidZone(sourceZone) || !isValidZone(targetZone)) return empty;
  const parsed = parseLocalInput(dateInput, timeInput, sourceZone);
  if (!parsed) return empty;
  const instant = parsed.instant;
  const sourceOffset = zoneOffsetMinutes(instant, sourceZone);
  const targetOffset = zoneOffsetMinutes(instant, targetZone);
  const source = localParts(instant, sourceZone);
  const target = localParts(instant, targetZone);
  const diff = targetOffset - sourceOffset;
  return {
    iso: toIsoWithOffset(instant, targetZone),
    sourceDate: source.date,
    sourceTime: source.time,
    targetDate: target.date,
    targetTime: target.time,
    differenceMinutes: diff,
    differenceLabel: differenceLabel(diff),
  };
}

/** ISO 8601 string including the zone's own offset, e.g. 2026-03-28T23:30:00+01:00. */
export function toIsoWithOffset(instant: Date, zone: string): string {
  const offset = zoneOffsetMinutes(instant, zone);
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  const parts = localParts(instant, zone);
  const secondsDtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const secParts = secondsDtf.formatToParts(instant);
  const pickSec = (type: string): string => {
    const p = secParts.find((x) => x.type === type);
    return p ? p.value : '';
  };
  const seconds = pickSec('second');
  return `${parts.date}T${parts.time}:${seconds}${sign}${hh}:${mm}`;
}

/** Copy text for the converted moment (ISO 8601 in the target zone). */
export function isoCopyText(result: ConversionResult): string {
  return result.iso ?? '';
}
