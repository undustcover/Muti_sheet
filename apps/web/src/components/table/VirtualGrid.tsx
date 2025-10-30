import React from 'react';
import type { VirtualItem } from '@tanstack/react-virtual';
import Row from './Row';
import { makeRowContainerStyle } from './utils';

type Props = {
  virtualItems: VirtualItem[];
  rows: any[];
  templateColumns: string;
  totalWidth: number;
  totalSize: number;
  headerIds: string[];
  freezeCount: number;
  indexColWidth: number;
  computeStickyLeft: (idx: number) => number;
  getColWidth: (cid: string) => number;
  getCellBg: (row: any, columnId: string) => string | undefined;
  hoverResizeCid: string | null;
  onRowContextMenu?: (index: number, x: number, y: number) => void;
};

const VirtualGrid: React.FC<Props> = ({
  virtualItems,
  rows,
  templateColumns,
  totalWidth,
  totalSize,
  headerIds,
  freezeCount,
  indexColWidth,
  computeStickyLeft,
  getColWidth,
  getCellBg,
  hoverResizeCid,
  onRowContextMenu,
}) => {
  return (
    <div style={{ height: totalSize, position: 'relative', minWidth: `${totalWidth}px` }}>
      {virtualItems.map((virtualRow) => {
        const row = rows[virtualRow.index]!;
        return (
          <div
            key={row.id}
            data-index={virtualRow.index}
            className="sheet-grid-row"
            style={{
              ...makeRowContainerStyle(templateColumns, totalWidth, virtualRow.start),
              height: virtualRow.size,
            }}
            onContextMenu={(e) => {
              if (!onRowContextMenu) return;
              e.preventDefault();
              e.stopPropagation();
              onRowContextMenu(virtualRow.index, e.clientX, e.clientY);
            }}
          >
            <Row
              row={row}
              rowIndex={virtualRow.index}
              headerIds={headerIds}
              freezeCount={freezeCount}
              indexColWidth={indexColWidth}
              computeStickyLeft={(idx) => computeStickyLeft(idx)}
              getColWidth={getColWidth}
              getCellBg={getCellBg}
              hoverResizeCid={hoverResizeCid}
            />
          </div>
        );
      })}
    </div>
  );
};

export default VirtualGrid;