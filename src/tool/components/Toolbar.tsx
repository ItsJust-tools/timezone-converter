'use client';

import React from 'react';
import type { ToolState } from '../tz-core';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2" role="group" aria-label="Timezone tool controls">
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-clear"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Clear
        </button>
        <button
          type="button"
          data-testid="btn-toolbar-now"
          onClick={() => {
            const now = new Date();
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
            onChange({
              ...state,
              dateInput: `${pick('year')}-${pick('month')}-${pick('day')}`,
              timeInput: `${hour}:${pick('minute')}`,
            });
          }}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Now
        </button>
        <button
          type="button"
          data-testid="btn-toolbar-swap"
          onClick={() =>
            onChange({ ...state, sourceZone: state.targetZone, targetZone: state.sourceZone })
          }
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          ⇄ Swap zones
        </button>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-result"
            className="rounded-md bg-sky-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
          >
            Copy ISO 8601
          </button>
        ) : null}
        {state.history.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange({ ...state, history: [] })}
            data-testid="btn-clear-history"
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Clear history
          </button>
        ) : null}
      </div>
    </div>
  );
};
