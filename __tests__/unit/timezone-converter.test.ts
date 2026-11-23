import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STATE,
  COMMON_ZONES,
  isValidZone,
  normalizeZone,
  zoneOffsetMinutes,
  offsetLabel,
  differenceLabel,
  zoneAbbreviation,
  zoneLongName,
  zoneDisplay,
  localParts,
  todayInZone,
  parseLocalInput,
  convert,
  toIsoWithOffset,
  isoCopyText,
  type ToolState,
} from '@/tool/tz-core';
import { deserializeState, serializeState, withHistory, roundTrips } from '@/tool/tool-definition';
import { timezoneConverterTool } from '@/tool/tool-definition';
import { addCompareZone, removeCompareZone, isState, MAX_COMPARE_ZONES } from '@/tool/ui-shared';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('isValidZone and normalizeZone', () => {
  it('accepts IANA zones and rejects unknown ones', () => {
    expect(isValidZone('Europe/Berlin')).toBe(true);
    expect(isValidZone('UTC')).toBe(true);
    expect(isValidZone('Not/A_Zone')).toBe(false);
    expect(isValidZone('')).toBe(false);
  });

  it('normalizes invalid zones to fallbacks', () => {
    expect(normalizeZone('Europe/Berlin')).toBe('Europe/Berlin');
    expect(normalizeZone('Bogus/Zone')).toBe('UTC');
    expect(normalizeZone('Bogus/Zone', 'Europe/London')).toBe('Europe/London');
  });
});

describe('offset helpers', () => {
  it('computes offsets including DST', () => {
    // Berlin is CET (UTC+1) in winter and CEST (UTC+2) in summer.
    const winter = new Date('2026-01-15T12:00:00Z');
    const summer = new Date('2026-07-15T12:00:00Z');
    expect(zoneOffsetMinutes(winter, 'Europe/Berlin')).toBe(60);
    expect(zoneOffsetMinutes(summer, 'Europe/Berlin')).toBe(120);
    // New York: EST (UTC-5) winter, EDT (UTC-4) summer.
    expect(zoneOffsetMinutes(winter, 'America/New_York')).toBe(-300);
    expect(zoneOffsetMinutes(summer, 'America/New_York')).toBe(-240);
    // UTC is always zero.
    expect(zoneOffsetMinutes(winter, 'UTC')).toBe(0);
  });

  it('formats offset labels', () => {
    expect(offsetLabel(0)).toBe('UTC+00:00');
    expect(offsetLabel(60)).toBe('UTC+01:00');
    expect(offsetLabel(-300)).toBe('UTC-05:00');
    expect(offsetLabel(330)).toBe('UTC+05:30');
  });

  it('formats difference labels', () => {
    expect(differenceLabel(0)).toBe('0:00');
    expect(differenceLabel(360)).toBe('6:00');
    expect(differenceLabel(-210)).toBe('-3:30');
    expect(differenceLabel(90)).toBe('1:30');
  });

  it('resolves abbreviations and long names', () => {
    const winter = new Date('2026-01-15T12:00:00Z');
    const summer = new Date('2026-07-15T12:00:00Z');
    expect(zoneAbbreviation(winter, 'Europe/Berlin')).toMatch(/GMT\+1|CET/);
    expect(zoneAbbreviation(summer, 'Europe/Berlin')).toMatch(/GMT\+2|CEST/);
    expect(zoneLongName(summer, 'Europe/Berlin')).toContain('Time');
    expect(zoneLongName(summer, 'Not/A_Zone')).toBe('Not/A_Zone');
  });

  it('builds zone display objects', () => {
    const winter = new Date('2026-01-15T12:00:00Z');
    const d = zoneDisplay(winter, 'Europe/Berlin');
    expect(d.offsetMinutes).toBe(60);
    expect(d.offsetLabel).toBe('UTC+01:00');
    expect(d.abbreviation.length).toBeGreaterThan(0);
    expect(d.name.length).toBeGreaterThan(0);
  });
});

describe('localParts and todayInZone', () => {
  it('splits an instant into zone-local date and time', () => {
    const instant = new Date('2026-03-10T23:30:00Z');
    expect(localParts(instant, 'UTC')).toEqual({ date: '2026-03-10', time: '23:30' });
    // Berlin is UTC+1 in March (CET until Mar 29, 2026).
    expect(localParts(instant, 'Europe/Berlin')).toEqual({ date: '2026-03-11', time: '00:30' });
  });

  it('gives today in a zone', () => {
    const instant = new Date('2026-03-10T23:30:00Z');
    expect(todayInZone(instant, 'Europe/Berlin')).toBe('2026-03-11');
    expect(todayInZone(instant, 'UTC')).toBe('2026-03-10');
  });
});

describe('parseLocalInput', () => {
  it('resolves wall-clock input in the source zone', () => {
    const parsed = parseLocalInput('2026-01-15', '12:00', 'Europe/Berlin');
    expect(parsed).not.toBeNull();
    if (parsed) {
      // 12:00 CET === 11:00 UTC
      expect(parsed.instant.toISOString()).toBe('2026-01-15T11:00:00.000Z');
      expect(parsed.usedNow).toBe(false);
    }
  });

  it('defaults missing date to today and missing time to midnight', () => {
    const parsed = parseLocalInput('', '09:30', 'UTC');
    expect(parsed).not.toBeNull();
    if (parsed) {
      expect(parsed.usedNow).toBe(true);
      expect(parsed.instant.getUTCHours()).toBe(9);
      expect(parsed.instant.getUTCMinutes()).toBe(30);
    }
  });

  it('returns null for invalid or missing input without throwing', () => {
    expect(parseLocalInput('', '', 'UTC')).toBeNull();
    expect(parseLocalInput('15-01-2026', '12:00', 'UTC')).toBeNull();
    expect(parseLocalInput('2026-01-15', '25:00', 'UTC')).toBeNull();
    expect(parseLocalInput('not-a-date', '12:00', 'UTC')).toBeNull();
    expect(parseLocalInput('2026-13-01', '12:00', 'UTC')).toBeNull();
  });
});

describe('convert', () => {
  it('converts across zones exactly, including DST cases', () => {
    // Winter: London UTC+0 → New York UTC-5 = 5h behind.
    const winter = convert('2026-01-15', '12:00', 'Europe/London', 'America/New_York');
    expect(winter.targetDate).toBe('2026-01-15');
    expect(winter.targetTime).toBe('07:00');
    expect(winter.differenceMinutes).toBe(-300);
    expect(winter.differenceLabel).toBe('-5:00');
    expect(winter.iso).toBe('2026-01-15T07:00:00-05:00');

    // Summer: London UTC+1, New York UTC-4 = 5h behind despite different offsets.
    const summer = convert('2026-07-15', '12:00', 'Europe/London', 'America/New_York');
    expect(summer.targetTime).toBe('07:00');
    expect(summer.differenceMinutes).toBe(-300);

    // Crossing the DST boundary: Berlin 2026-03-28 23:30 (CET, UTC+1).
    const before = convert('2026-03-28', '23:30', 'Europe/Berlin', 'UTC');
    expect(before.targetTime).toBe('22:30');
    // One day later Berlin is CEST (UTC+2): 23:30 CEST === 21:30 UTC.
    const after = convert('2026-03-29', '23:30', 'Europe/Berlin', 'UTC');
    expect(after.targetTime).toBe('21:30');
  });

  it('produces ISO 8601 with the zone offset', () => {
    const r = convert('2026-01-15', '12:00', 'Europe/Berlin', 'Europe/Berlin');
    expect(r.iso).toBe('2026-01-15T12:00:00+01:00');
    expect(isoCopyText(r)).toBe(r.iso);
  });

  it('matches source when zones are equal', () => {
    const r = convert('2026-06-01', '08:15', 'Asia/Tokyo', 'Asia/Tokyo');
    expect(r.targetTime).toBe('08:15');
    expect(r.differenceMinutes).toBe(0);
    expect(r.differenceLabel).toBe('0:00');
  });

  it('handles day rollover', () => {
    // Tokyo is UTC+9; 23:30 UTC is already the next day in Tokyo.
    const r = convert('2026-01-15', '23:30', 'UTC', 'Asia/Tokyo');
    expect(r.targetDate).toBe('2026-01-16');
    expect(r.targetTime).toBe('08:30');
  });

  it('returns null fields for invalid input without crashing', () => {
    expect(convert('', '', 'UTC', 'Europe/Berlin').iso).toBeNull();
    expect(convert('bad', '12:00', 'UTC', 'Europe/Berlin').targetTime).toBeNull();
    expect(convert('2026-01-15', '99:99', 'UTC', 'Europe/Berlin').iso).toBeNull();
    expect(convert('2026-01-15', '12:00', 'Nope/Zone', 'UTC').iso).toBeNull();
    expect(convert('2026-01-15', '12:00', 'UTC', 'Nope/Zone').iso).toBeNull();
  });
});

describe('toIsoWithOffset', () => {
  it('formats negative offsets correctly', () => {
    const instant = new Date('2026-01-15T17:00:00Z');
    expect(toIsoWithOffset(instant, 'America/New_York')).toBe('2026-01-15T12:00:00-05:00');
  });
});

describe('ui-shared helpers', () => {
  it('adds compare zones deduped and capped', () => {
    const s1 = addCompareZone(state(), 'Asia/Tokyo');
    expect(s1.compareZones).toEqual(['UTC', 'Asia/Tokyo']);
    const s2 = addCompareZone(s1, 'Asia/Tokyo');
    expect(s2.compareZones).toEqual(['UTC', 'Asia/Tokyo']);
    const s3 = addCompareZone(s1, 'Europe/Berlin');
    expect(s3.compareZones.length).toBe(3);
    expect(addCompareZone(s1, '')).toBe(s1);
    // Filling to the cap returns the same state.
    let filled = state({ compareZones: [] });
    for (let i = 0; i < 30; i++) filled = addCompareZone(filled, `Zone${i}`);
    expect(filled.compareZones.length).toBeLessThanOrEqual(MAX_COMPARE_ZONES);
  });

  it('removes compare zones', () => {
    const s = state({ compareZones: ['UTC', 'Asia/Tokyo'] });
    expect(removeCompareZone(s, 'Asia/Tokyo').compareZones).toEqual(['UTC']);
    expect(removeCompareZone(s, 'Nope').compareZones).toEqual(['UTC', 'Asia/Tokyo']);
  });

  it('isState checks shape', () => {
    expect(isState({ sourceZone: 'UTC', targetZone: 'UTC' })).toBe(true);
    expect(isState({})).toBe(false);
    expect(isState(null)).toBe(false);
  });
});

describe('serialize/deserialize round-trip', () => {
  it('round-trips the full state', () => {
    const full = state({
      sourceZone: 'Europe/Berlin',
      targetZone: 'Asia/Tokyo',
      dateInput: '2026-05-01',
      timeInput: '09:30',
      compareZones: ['UTC', 'America/New_York'],
      history: [{ text: 'converted', createdAt: '2026-05-01T09:30:00.000Z' }],
    });
    const serialized = serializeState(full);
    const restored = deserializeState(JSON.parse(serialized));
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(JSON.stringify(restored.data)).toBe(JSON.stringify(full));
    }
    expect(roundTrips(full)).toBe(true);
  });

  it('repairs invalid or missing fields with defaults', () => {
    const repaired = deserializeState({
      sourceZone: 'Not/A_Zone',
      targetZone: 42,
      dateInput: '15-01-2026',
      timeInput: 'nope',
      compareZones: ['UTC', 'Bogus/Zone', 'UTC', 7],
      history: [{ text: 'ok', createdAt: 'nope' }, 'junk'],
    });
    expect(repaired.success).toBe(true);
    if (repaired.success) {
      expect(repaired.data.sourceZone).toBe(DEFAULT_STATE.sourceZone);
      expect(repaired.data.targetZone).toBe(DEFAULT_STATE.targetZone);
      expect(repaired.data.dateInput).toBe(DEFAULT_STATE.dateInput);
      expect(repaired.data.timeInput).toBe(DEFAULT_STATE.timeInput);
      expect(repaired.data.compareZones).toEqual(['UTC']);
      expect(repaired.data.history).toEqual([{ text: 'ok', createdAt: 'nope' }]);
    }
  });

  it('rejects non-object payloads', () => {
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState(42).success).toBe(false);
  });
});

describe('withHistory and tool object', () => {
  it('caps history at 20 entries, newest first', () => {
    let s = state({ history: [] });
    for (let i = 0; i < 25; i++) {
      s = withHistory(s, `entry ${i}`, new Date(2026, 0, 1, 0, 0, i));
    }
    expect(s.history.length).toBe(20);
    expect(s.history[0]?.text).toBe('entry 24');
  });

  it('exposes the configured tool', () => {
    expect(timezoneConverterTool.id).toBe('timezone-converter');
    expect(timezoneConverterTool.name).toBe('Timezone Converter');
    expect(timezoneConverterTool.initialState.sourceZone).toBe(DEFAULT_STATE.sourceZone);
    expect(timezoneConverterTool.exporters?.length).toBe(4);
  });

  it('lists common zones with labels', () => {
    expect(COMMON_ZONES.length).toBeGreaterThan(10);
    expect(COMMON_ZONES.every((z) => isValidZone(z.zone))).toBe(true);
  });
});
