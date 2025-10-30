import React, { useState } from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { useKeyboard } from '../useKeyboard';
import { GridStateProvider } from '../../context/GridStateContext';

function makeTableMock(rows: any[]) {
  return {
    getRowModel() {
      return { rows: rows.map((r) => ({ original: r })) };
    },
  };
}

describe('useKeyboard defensive early return', () => {
  test('does nothing when selectedCell is empty', () => {
    const rows = [{ id: 'r1' }, { id: 'r2' }];
    const columns: any[] = [
      { id: 'colA', header: 'A' },
      { id: 'colB', header: 'B' },
    ];
    const table = makeTableMock(rows);

    const setSelectedCell = vi.fn();
    const setEditingCell = vi.fn();

    function Harness() {
      const { onKeyDown } = useKeyboard({ table, columns, onCopyKey: () => false });
      return <div data-testid="target" onKeyDown={onKeyDown} />;
    }

    const { getByTestId } = render(
      <GridStateProvider
        value={{
          selectedCell: { rowId: null, columnId: null },
          editingCell: { rowId: null, columnId: null },
          setSelectedCell,
          setEditingCell,
          selectionRange: { start: null, end: null },
          setSelectionRange: vi.fn(),
          isDragging: false,
          setIsDragging: vi.fn(),
          isInRange: () => false,
          headerSelectedCid: null,
          setHeaderSelectedCid: vi.fn(),
          focusGrid: () => {},
        }}
      >
        <Harness />
      </GridStateProvider>
    );

    const target = getByTestId('target');
    fireEvent.keyDown(target, { key: 'ArrowRight' });
    fireEvent.keyDown(target, { key: 'Enter' });
    fireEvent.keyDown(target, { key: 'Tab' });

    expect(setSelectedCell).not.toHaveBeenCalled();
    expect(setEditingCell).not.toHaveBeenCalled();
  });
});