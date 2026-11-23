import { DEFAULT_STATE, COMMON_ZONES, type ToolState } from './tz-core';

export { DEFAULT_STATE } from './tz-core';
export type { ToolState } from './tz-core';

export { COMMON_ZONES };
export const MAX_COMPARE_ZONES = 8;

/** Zone options for a select, keeping the current selection available. */
export function zoneOptions(selected: string): { zone: string; label: string }[] {
  const base = [...COMMON_ZONES];
  if (selected && !base.some((z) => z.zone === selected)) {
    base.unshift({ zone: selected, label: selected });
  }
  return base;
}

/** Add a zone to the comparison list (deduped, capped). */
export function addCompareZone(state: ToolState, zone: string, max = MAX_COMPARE_ZONES): ToolState {
  if (!zone || state.compareZones.includes(zone)) return state;
  if (state.compareZones.length >= max) return state;
  return { ...state, compareZones: [...state.compareZones, zone] };
}

/** Remove a zone from the comparison list. */
export function removeCompareZone(state: ToolState, zone: string): ToolState {
  return { ...state, compareZones: state.compareZones.filter((z) => z !== zone) };
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.sourceZone === 'string' && typeof v.targetZone === 'string';
}
