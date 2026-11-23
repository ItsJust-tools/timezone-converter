'use client';

import React from 'react';
import { COMMON_ZONES, type ToolState } from '../tz-core';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="timezone-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Popular zones</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {COMMON_ZONES.slice(0, 10).map((z) => (
            <li key={z.zone} className="flex justify-between gap-2">
              <span>{z.label}</span>
              <span className="font-mono text-gray-500 dark:text-gray-400">{z.zone}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Comparison list</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-compare-count">
          {state.compareZones.length} extra zone
          {state.compareZones.length === 1 ? '' : 's'} in the comparison list
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>N</kbd> — Use now
          </li>
          <li>
            <kbd>S</kbd> — Swap zones
          </li>
          <li>
            <kbd>Y</kbd> — Copy ISO 8601
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">DST aware</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Conversions use the IANA time zone database through the browser, so daylight saving
          transitions on the chosen date are respected automatically.
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current zones and inputs; open
          it to restore this conversion.
        </p>
      </div>
    </div>
  );
};
