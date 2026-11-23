'use client';

import React from 'react';
import {
  COMMON_ZONES,
  convert,
  zoneDisplay,
  todayInZone,
  isoCopyText,
  type ToolState,
} from '../tz-core';
import { addCompareZone, removeCompareZone, MAX_COMPARE_ZONES } from '../ui-shared';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

const cardClass =
  'rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900';

function ZoneSelect({
  id,
  label,
  value,
  onChangeState,
  testid,
}: {
  id: string;
  label: string;
  value: string;
  onChangeState: (next: string) => void;
  testid: string;
}) {
  const options = React.useMemo(() => {
    const base = [...COMMON_ZONES];
    if (value && !base.some((z) => z.zone === value)) {
      base.unshift({ zone: value, label: value });
    }
    return base;
  }, [value]);
  return (
    <label htmlFor={id} className="block text-xs font-medium text-gray-700 dark:text-gray-300">
      {label}
      <select
        id={id}
        value={value}
        onChange={(e) => onChangeState(e.target.value)}
        data-testid={testid}
        className={inputClass}
      >
        {options.map((z) => (
          <option key={z.zone} value={z.zone}>
            {z.label} — {z.zone}
          </option>
        ))}
      </select>
    </label>
  );
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const result = convert(state.dateInput, state.timeInput, state.sourceZone, state.targetZone);
  const [comparePick, setComparePick] = React.useState('UTC');

  const nowIso = todayInZone(new Date(), state.sourceZone);
  const showInvalid =
    (state.dateInput && !/^\d{4}-\d{2}-\d{2}$/.test(state.dateInput)) ||
    (state.timeInput && !/^\d{2}:\d{2}(:\d{2})?$/.test(state.timeInput));

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="timezone-canvas">
      <div className="grid gap-4 sm:grid-cols-2" data-testid="zone-inputs">
        <ZoneSelect
          id="source-zone"
          label="From timezone"
          value={state.sourceZone}
          onChangeState={(v) => update({ sourceZone: v })}
          testid="select-source-zone"
        />
        <ZoneSelect
          id="target-zone"
          label="To timezone"
          value={state.targetZone}
          onChangeState={(v) => update({ targetZone: v })}
          testid="select-target-zone"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3" data-testid="datetime-inputs">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Date
          <input
            type="date"
            value={state.dateInput || nowIso}
            onChange={(e) => update({ dateInput: e.target.value })}
            data-testid="input-date"
            className={inputClass}
          />
        </label>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Time
          <input
            type="time"
            value={state.timeInput}
            onChange={(e) => update({ timeInput: e.target.value })}
            data-testid="input-time"
            className={inputClass}
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="button"
            data-testid="btn-use-now"
            onClick={() => {
              const now = new Date();
              const parts = (() => {
                const dtf = new Intl.DateTimeFormat('en-CA', {
                  timeZone: state.sourceZone,
                  hour12: false,
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const parts = dtf.formatToParts(now);
                const pick = (type: string): string => {
                  const p = parts.find((x) => x.type === type);
                  return p ? p.value : '';
                };
                const hour = pick('hour') === '24' ? '00' : pick('hour');
                return {
                  date: `${pick('year')}-${pick('month')}-${pick('day')}`,
                  time: `${hour}:${pick('minute')}`,
                };
              })();
              update({ dateInput: parts.date, timeInput: parts.time });
            }}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
          >
            Now
          </button>
          <button
            type="button"
            data-testid="btn-swap-zones"
            onClick={() => update({ sourceZone: state.targetZone, targetZone: state.sourceZone })}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
          >
            ⇄ Swap
          </button>
        </div>
      </div>

      {showInvalid ? (
        <div
          role="alert"
          data-testid="invalid-input"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200"
        >
          Invalid date or time — use the pickers or the Now button.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2" data-testid="comparison-cards">
        <div className={cardClass} data-testid="card-source">
          <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
            {state.sourceZone}
          </span>
          <span className="block font-mono text-2xl font-bold" data-testid="source-time">
            {result.sourceTime ?? '—'}
          </span>
          <span
            className="block text-xs text-gray-600 dark:text-gray-300"
            data-testid="source-date"
          >
            {result.sourceDate ?? '—'}
          </span>
          <span
            className="mt-2 block text-xs text-gray-500 dark:text-gray-400"
            data-testid="source-offset"
          >
            {result.sourceTime === null
              ? '—'
              : (() => {
                  const d = zoneDisplay(new Date(), state.sourceZone);
                  return `${d.abbreviation} · ${d.offsetLabel}`;
                })()}
          </span>
        </div>
        <div className={cardClass} data-testid="card-target">
          <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
            {state.targetZone}
          </span>
          <span className="flex items-center justify-center gap-2">
            <span className="block font-mono text-2xl font-bold" data-testid="target-time">
              {result.targetTime ?? '—'}
            </span>
            {result.iso ? (
              <button
                type="button"
                data-testid="copy-iso"
                aria-label="Copy ISO 8601 string"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(isoCopyText(result));
                    onSaveHistory?.(isoCopyText(result));
                  } catch {
                    // clipboard unavailable; ignore
                  }
                }}
                className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Copy ISO
              </button>
            ) : null}
          </span>
          <span
            className="block text-xs text-gray-600 dark:text-gray-300"
            data-testid="target-date"
          >
            {result.targetDate ?? '—'}
          </span>
          <span
            className="mt-2 block text-xs text-gray-500 dark:text-gray-400"
            data-testid="target-offset"
          >
            {result.targetTime === null
              ? '—'
              : (() => {
                  const d = zoneDisplay(new Date(), state.targetZone);
                  return `${d.abbreviation} · ${d.offsetLabel}`;
                })()}
          </span>
        </div>
      </div>

      <div className={cardClass} data-testid="difference-card" role="status">
        <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
          Time difference
        </span>
        <span className="block font-mono text-2xl font-bold" data-testid="difference-label">
          {result.differenceLabel ?? '—'}
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">h:mm</span>
        </span>
      </div>

      {result.iso ? (
        <div
          className="text-center text-xs text-gray-600 dark:text-gray-300"
          data-testid="iso-line"
        >
          <span className="font-mono">{result.iso}</span>
        </div>
      ) : null}

      <div data-testid="compare-section">
        <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">Compare zones</h3>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Add zone
            <select
              value={comparePick}
              onChange={(e) => setComparePick(e.target.value)}
              data-testid="select-compare-zone"
              className={inputClass}
            >
              {COMMON_ZONES.map((z) => (
                <option key={z.zone} value={z.zone}>
                  {z.label} — {z.zone}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            data-testid="btn-add-compare"
            onClick={() => {
              onChange?.(addCompareZone(state, comparePick));
            }}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
          >
            Add
          </button>
        </div>
        {state.compareZones.length === 0 ? (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400" data-testid="compare-empty">
            No extra zones yet.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="compare-list">
            {state.compareZones.map((zone) => {
              const conv = convert(state.dateInput, state.timeInput, state.sourceZone, zone);
              return (
                <li key={zone} className={cardClass} data-testid={`compare-card-${zone}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {zone}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${zone}`}
                      data-testid={`btn-remove-${zone}`}
                      onClick={() => onChange?.(removeCompareZone(state, zone))}
                      className="text-xs rounded border border-gray-200 px-2 py-0.5 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      ✕
                    </button>
                  </div>
                  <span
                    className="block font-mono text-lg font-semibold"
                    data-testid="compare-time"
                  >
                    {conv.targetTime ?? '—'}
                  </span>
                  <span
                    className="block text-xs text-gray-500 dark:text-gray-400"
                    data-testid="compare-date"
                  >
                    {conv.targetDate ?? '—'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {state.compareZones.length >= MAX_COMPARE_ZONES ? (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400" data-testid="compare-limit">
            Maximum of {MAX_COMPARE_ZONES} comparison zones.
          </p>
        ) : null}
      </div>
    </div>
  );
};
