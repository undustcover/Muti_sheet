import React from 'react';
import { render } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
// Mock Row to avoid dependency on TanStack table row shape
vi.mock('../Row', () => ({
  default: (props: any) => <div className="mock-row" data-rowindex={props.rowIndex} />,
}));
import VirtualGrid from '../VirtualGrid';
import { GridStateProvider } from '../context/GridStateContext';

function makeRows(count: number) {
  return Array.from({ length: count }).map((_, i) => ({ id: `row-${i}`, original: { id: `row-${i}` } }));
}

const baseProps = {
  templateColumns: '40px 120px 120px',
  totalWidth: 400,
  headerIds: ['colA', 'colB'],
  freezeCount: 0,
  indexColWidth: 40,
  computeStickyLeft: (idx: number) => idx * 10,
  getColWidth: (cid: string) => 120,
  getCellBg: (_row: any, _cid: string) => undefined,
  hoverResizeCid: null as string | null,
};

describe('VirtualGrid with rowVirtualizer', () => {
  it('renders only virtualized rows and sets container height/minWidth', () => {
    const rows = makeRows(100);
    const { container } = render(
      <GridStateProvider>
        <VirtualGrid
          virtualItems={[{ index: 0, start: 0, size: 24 }, { index: 2, start: 48, size: 24 }, { index: 5, start: 120, size: 24 }]}
          rows={rows as any}
          templateColumns={baseProps.templateColumns}
          totalWidth={baseProps.totalWidth}
          totalSize={1000}
          headerIds={baseProps.headerIds}
          freezeCount={baseProps.freezeCount}
          indexColWidth={baseProps.indexColWidth}
          computeStickyLeft={baseProps.computeStickyLeft}
          getColWidth={baseProps.getColWidth}
          getCellBg={baseProps.getCellBg}
          hoverResizeCid={baseProps.hoverResizeCid}
        />
      </GridStateProvider>
    );

    const root = container.firstElementChild as HTMLDivElement;
    expect(root).toBeTruthy();
    expect(root.style.height).toBe('1000px');
    expect(root.style.minWidth).toBe(`${baseProps.totalWidth}px`);

    const rowsEls = container.querySelectorAll('.sheet-grid-row');
    expect(rowsEls.length).toBe(3);
    const indices = Array.from(rowsEls).map(el => (el as HTMLDivElement).getAttribute('data-index'));
    expect(indices).toEqual(['0', '2', '5']);
  });

  it('updates rendered rows when virtual items change', () => {
    const rows = makeRows(100);
    const { container, rerender } = render(
      <GridStateProvider>
        <VirtualGrid
          virtualItems={[{ index: 10, start: 240, size: 24 }, { index: 11, start: 264, size: 24 }]}
          rows={rows as any}
          templateColumns={baseProps.templateColumns}
          totalWidth={baseProps.totalWidth}
          totalSize={2000}
          headerIds={baseProps.headerIds}
          freezeCount={baseProps.freezeCount}
          indexColWidth={baseProps.indexColWidth}
          computeStickyLeft={baseProps.computeStickyLeft}
          getColWidth={baseProps.getColWidth}
          getCellBg={baseProps.getCellBg}
          hoverResizeCid={baseProps.hoverResizeCid}
        />
      </GridStateProvider>
    );

    let rowsEls = container.querySelectorAll('.sheet-grid-row');
    let indices = Array.from(rowsEls).map(el => el.getAttribute('data-index'));
    expect(indices).toEqual(['10', '11']);

    rerender(
      <GridStateProvider>
        <VirtualGrid
          virtualItems={[{ index: 50, start: 1200, size: 24 }]}
          rows={rows as any}
          templateColumns={baseProps.templateColumns}
          totalWidth={baseProps.totalWidth}
          totalSize={2000}
          headerIds={baseProps.headerIds}
          freezeCount={baseProps.freezeCount}
          indexColWidth={baseProps.indexColWidth}
          computeStickyLeft={baseProps.computeStickyLeft}
          getColWidth={baseProps.getColWidth}
          getCellBg={baseProps.getCellBg}
          hoverResizeCid={baseProps.hoverResizeCid}
        />
      </GridStateProvider>
    );

    rowsEls = container.querySelectorAll('.sheet-grid-row');
    indices = Array.from(rowsEls).map(el => el.getAttribute('data-index'));
    expect(indices).toEqual(['50']);
  });

  it('renders nothing when virtualItems is empty (boundary)', () => {
    const rows = makeRows(10);
    const { container } = render(
      <GridStateProvider>
        <VirtualGrid
          virtualItems={[]}
          rows={rows as any}
          templateColumns={baseProps.templateColumns}
          totalWidth={baseProps.totalWidth}
          totalSize={0}
          headerIds={baseProps.headerIds}
          freezeCount={baseProps.freezeCount}
          indexColWidth={baseProps.indexColWidth}
          computeStickyLeft={baseProps.computeStickyLeft}
          getColWidth={baseProps.getColWidth}
          getCellBg={baseProps.getCellBg}
          hoverResizeCid={baseProps.hoverResizeCid}
        />
      </GridStateProvider>
    );

    const rowsEls = container.querySelectorAll('.sheet-grid-row');
    expect(rowsEls.length).toBe(0);
  });
});