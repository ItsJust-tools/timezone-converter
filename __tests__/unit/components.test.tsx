import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Canvas } from '@/tool/components/Canvas';
import { Toolbar } from '@/tool/components/Toolbar';
import { Sidebar } from '@/tool/components/Sidebar';
import { DEFAULT_STATE, type ToolState } from '@/tool/tz-core';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

const clipboardDef = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    writable: true,
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe('Canvas', () => {
  it('renders source and target cards for a valid conversion', () => {
    render(<Canvas state={state({ dateInput: '2026-01-15', timeInput: '12:00' })} />);
    expect(screen.getByTestId('source-time')).toHaveTextContent('12:00');
    expect(screen.getByTestId('target-time')).toHaveTextContent('07:00');
    expect(screen.getByTestId('difference-label')).toHaveTextContent('-5:00');
    expect(screen.getByTestId('iso-line')).toHaveTextContent('2026-01-15T07:00:00-05:00');
  });

  it('shows the invalid-input warning for bad time values', () => {
    render(<Canvas state={state({ dateInput: '2026-01-15', timeInput: 'ab:cd' })} />);
    expect(screen.getByTestId('invalid-input')).toBeInTheDocument();
  });

  it('updates state when zones or inputs change', () => {
    const onChange = vi.fn();
    render(<Canvas state={state()} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('select-target-zone'), {
      target: { value: 'Asia/Tokyo' },
    });
    expect(onChange).toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('input-date'), { target: { value: '2026-05-01' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('use-now button fills date and time from the source zone', () => {
    const onChange = vi.fn();
    render(<Canvas state={state()} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('btn-use-now'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]?.[0] as ToolState;
    expect(next.dateInput).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(next.timeInput).toMatch(/^\d{2}:\d{2}$/);
  });

  it('swap button exchanges source and target', () => {
    const onChange = vi.fn();
    render(<Canvas state={state()} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('btn-swap-zones'));
    const next = onChange.mock.calls[0]?.[0] as ToolState;
    expect(next.sourceZone).toBe(DEFAULT_STATE.targetZone);
    expect(next.targetZone).toBe(DEFAULT_STATE.sourceZone);
  });

  it('copy ISO writes the converted ISO string to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: { writeText },
    });
    const onSaveHistory = vi.fn();
    render(
      <Canvas
        state={state({ dateInput: '2026-01-15', timeInput: '12:00' })}
        onSaveHistory={onSaveHistory}
      />
    );
    fireEvent.click(screen.getByTestId('copy-iso'));
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('2026-01-15T07:00:00-05:00');
    });
    expect(onSaveHistory).toHaveBeenCalledWith('2026-01-15T07:00:00-05:00');
  });

  it('adds and removes comparison zones', () => {
    const onChange = vi.fn();
    render(<Canvas state={state()} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('btn-add-compare'));
    const added = onChange.mock.calls[0]?.[0] as ToolState;
    expect(added.compareZones).toEqual(['UTC']); // deduped since UTC already present
    fireEvent.click(screen.getByTestId(`btn-remove-UTC`));
    const removed = onChange.mock.calls[1]?.[0] as ToolState;
    expect(removed.compareZones).toEqual([]);
  });

  it('shows compare cards for each extra zone', () => {
    render(
      <Canvas
        state={state({
          dateInput: '2026-01-15',
          timeInput: '12:00',
          compareZones: ['Asia/Tokyo'],
        })}
      />
    );
    expect(screen.getByTestId('compare-card-Asia/Tokyo')).toBeInTheDocument();
    expect(screen.getByTestId('compare-time')).toHaveTextContent('21:00');
  });
});

describe('Toolbar', () => {
  it('clears history and fires copy', () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    const onCopy = vi.fn();
    render(
      <Toolbar
        state={state({ history: [{ text: 'x', createdAt: 'now' }] })}
        onChange={onChange}
        onClear={onClear}
        onCopy={onCopy}
      />
    );
    fireEvent.click(screen.getByTestId('btn-clear'));
    expect(onClear).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('btn-copy-result'));
    expect(onCopy).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('btn-clear-history'));
    const next = onChange.mock.calls[0]?.[0] as ToolState;
    expect(next.history).toEqual([]);
  });

  it('toolbar now and swap buttons update state', () => {
    const onChange = vi.fn();
    render(<Toolbar state={state()} onChange={onChange} onClear={() => {}} />);
    fireEvent.click(screen.getByTestId('btn-toolbar-now'));
    const nowNext = onChange.mock.calls[0]?.[0] as ToolState;
    expect(nowNext.dateInput).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    fireEvent.click(screen.getByTestId('btn-toolbar-swap'));
    const swap = onChange.mock.calls[1]?.[0] as ToolState;
    expect(swap.sourceZone).toBe(DEFAULT_STATE.targetZone);
    expect(swap.targetZone).toBe(DEFAULT_STATE.sourceZone);
  });
});

describe('Sidebar', () => {
  it('shows compare count and shortcuts', () => {
    render(<Sidebar state={state({ compareZones: ['UTC', 'Asia/Tokyo'] })} onChange={() => {}} />);
    expect(screen.getByTestId('sidebar-compare-count')).toHaveTextContent('2 extra zones');
    expect(screen.getByText('DST aware')).toBeInTheDocument();
  });
});
