import { flexRender } from '@tanstack/react-table';
import HeaderMenu from '../HeaderMenu';
import { isFirstVisibleField } from '../../utils/table';
import type { SortingState, VisibilityState } from '@tanstack/react-table';
import type { SelectOption } from '../../types';
import { makeIndexHeaderStyle } from './utils';
import { useGridState } from './context/GridStateContext';

// Keep ColumnMeta shape aligned with DataTable
type ColumnMeta = Record<string, { name: string; type: string; description?: string; options?: SelectOption[]; }> & Record<string, any>;

type Props = {
  table: any;
  headerIds: string[];
  freezeCount: number;
  templateColumns: string;
  totalWidth: number;
  indexColWidth: number;
  getColWidth: (cid: string) => number;
  computeStickyLeft: (idx: number) => number;
  columnMeta: ColumnMeta;
  columnOrder: string[];
  columnVisibility: VisibilityState;
  sorting: SortingState;
  setSorting: (updater: SortingState | ((prev: SortingState) => SortingState)) => void;
  setColumnOrder: (updater: string[] | ((prev: string[]) => string[])) => void;
  onFreezeTo: (n: number) => void;
  onEditField: (id: string) => void;
  onHideField: (id: string) => void;
  onDeleteField: (id: string) => void;
  onInsertLeft: (id: string) => void;
  onInsertRight: (id: string) => void;
  onDuplicateField: (id: string) => void;
  onFillColorColumn: (id: string, color: string) => void;
  hoverResizeCid: string | null;
  setHoverResizeCid: (cid: string | null | ((prev: string | null) => string | null)) => void;
  startResize: (cid: string, startX: number) => void;
  onCreateField: () => void;
};

export default function Header({
  table,
  headerIds,
  freezeCount,
  templateColumns,
  totalWidth,
  indexColWidth,
  getColWidth,
  computeStickyLeft,
  columnMeta,
  columnOrder,
  columnVisibility,
  sorting,
  setSorting,
  onFreezeTo,
  onEditField,
  onHideField,
  onDeleteField,
  onInsertLeft,
  onInsertRight,
  onDuplicateField,
  onFillColorColumn,
  hoverResizeCid,
  setHoverResizeCid,
  startResize,
  setColumnOrder,
  onCreateField,
}: Props) {
  const { headerSelectedCid, setHeaderSelectedCid } = useGridState();
  const flatHeaders = table.getFlatHeaders();
  return (
    <div style={{
      position: 'sticky',
      top: 0,
      background: '#fff',
      display: 'grid',
      gridTemplateColumns: templateColumns,
      gap: 0,
      fontWeight: 600,
      borderBottom: '1px solid #ddd',
      paddingBottom: 2,
      zIndex: 10,
      minWidth: `${totalWidth}px`,
    }}>
      <div style={makeIndexHeaderStyle(indexColWidth)} />
      {headerIds.map((cid) => {
        const header = flatHeaders.find((h: any) => h.column.id === cid);
        const hIdx = headerIds.indexOf(cid);
        const isFrozen = hIdx >= 0 && hIdx < freezeCount;
        const isSelected = headerSelectedCid === cid;
        return (
          <div
            key={header?.id ?? cid}
            className="sheet-header-cell"
            draggable={isSelected}
            onClick={() => setHeaderSelectedCid(cid)}
            onDragStart={(e) => {
              if (!isSelected) return;
              try { e.dataTransfer.setData('text/plain', cid); } catch {}
            }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault();
              const srcId = e.dataTransfer.getData('text/plain');
              const dstId = cid;
              if (!srcId || !dstId || srcId === dstId || srcId === 'id' || dstId === 'id') return;
              setColumnOrder((prev) => {
                const arr = prev.filter((x) => x !== srcId);
                const dstIdx = arr.indexOf(dstId);
                const insertIdx = dstIdx < 0 ? arr.length : dstIdx;
                const next = [...arr.slice(0, insertIdx), srcId, ...arr.slice(insertIdx)];
                return next;
              });
              setHeaderSelectedCid(null);
            }}
            style={{
              cursor: isSelected ? 'grab' : 'default',
              position: isFrozen ? 'sticky' : 'relative',
              left: isFrozen ? `${computeStickyLeft(hIdx)}px` : undefined,
              zIndex: isFrozen ? 11 : 1,
              background: isSelected ? 'rgba(31, 111, 235, 0.15)' : (isFrozen ? '#f7faff' : undefined),
              width: `${getColWidth(cid)}px`,
              borderRight: `1px solid ${hoverResizeCid === cid ? '#1f6feb' : '#eee'}`,
              boxSizing: 'border-box',
              outline: undefined,
            }}
          >
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px', boxSizing: 'border-box' }}>
              <span style={{ flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                {header ? flexRender(header.column.columnDef.header, header.getContext()) : (columnMeta[cid]?.name ?? cid)}
                {(() => {
                  const sorted = header ? (header.column.getIsSorted() as 'asc' | 'desc' | false) : (sorting?.find((s) => s && s.id === cid) ? ((sorting.find((s) => s && s.id === cid)!.desc ? 'desc' : 'asc') as 'asc' | 'desc') : false);
                  return ({ asc: ' ▲', desc: ' ▼' }[sorted as 'asc' | 'desc'] ?? '');
                })()}
              </span>
              <HeaderMenu
                columnId={cid}
                index={hIdx}
                disabled={false}
                disableHide={cid === 'id'}
                disableDelete={cid === 'id' || isFirstVisibleField(cid, columnOrder, columnVisibility)}
                onFreezeTo={(n) => onFreezeTo(n)}
                onSortAsc={(id) => setSorting([{ id, desc: false }])}
                onSortDesc={(id) => setSorting([{ id, desc: true }])}
                onEditField={onEditField}
                onHideField={onHideField}
                onDeleteField={onDeleteField}
                onInsertLeft={onInsertLeft}
                onInsertRight={onInsertRight}
                onDuplicateField={onDuplicateField}
                onFillColorColumn={onFillColorColumn}
              />
            </div>
            {/* 列宽拖拽手柄 */}
            <div
              onMouseDown={(e) => { e.stopPropagation(); startResize(cid, e.clientX); }}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => setHoverResizeCid(cid)}
              onMouseLeave={() => setHoverResizeCid((prev) => (prev === cid ? null : prev))}
              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 10, cursor: 'col-resize', background: hoverResizeCid === cid ? '#1f6feb' : 'transparent', zIndex: 12 }}
              title="拖拽调整列宽"
            />
          </div>
        );
      })}
      <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
        <span role="button" title="新建字段" onClick={onCreateField} style={{ display: 'inline-flex', alignItems: 'center', padding: '4px' }}>+</span>
      </div>
    </div>
  );
}