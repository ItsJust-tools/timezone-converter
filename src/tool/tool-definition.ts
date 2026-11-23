import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  convert,
  isValidZone,
  normalizeZone,
  type HistoryEntry,
  type ToolState,
} from './tz-core';

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function validZones(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((zone): zone is string => typeof zone === 'string' && isValidZone(zone))
    .filter((zone, index, all) => all.indexOf(zone) === index)
    .slice(0, 24);
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, 20);
}

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    sourceZone: state.sourceZone,
    targetZone: state.targetZone,
    dateInput: state.dateInput,
    timeInput: state.timeInput,
    compareZones: state.compareZones,
    history: state.history,
  });
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected timezone converter state object',
    };
  }
  const v = data as Record<string, unknown>;
  const timeInput = stringOr(v.timeInput, DEFAULT_STATE.timeInput);
  const dateInput = stringOr(v.dateInput, DEFAULT_STATE.dateInput);
  const state: ToolState = {
    sourceZone: normalizeZone(
      stringOr(v.sourceZone, DEFAULT_STATE.sourceZone),
      DEFAULT_STATE.sourceZone
    ),
    targetZone: normalizeZone(
      stringOr(v.targetZone, DEFAULT_STATE.targetZone),
      DEFAULT_STATE.targetZone
    ),
    dateInput: DATE_RE.test(dateInput) ? dateInput : DEFAULT_STATE.dateInput,
    timeInput: TIME_RE.test(timeInput) ? timeInput : DEFAULT_STATE.timeInput,
    compareZones: validZones(v.compareZones),
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Append a history entry to state, capped at 20, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, 20) };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

/** Human-readable one-line summary of the current conversion. */
export function summaryText(state: ToolState): string {
  const result = convert(state.dateInput, state.timeInput, state.sourceZone, state.targetZone);
  if (result.iso === null) return 'Enter a valid date and time to convert';
  return `${result.sourceDate} ${result.sourceTime} (${state.sourceZone}) → ${result.targetDate} ${result.targetTime} (${state.targetZone})`;
}

export const timezoneConverterTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};
