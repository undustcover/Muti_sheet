import React from 'react';
import CellEditor from '../editors/CellEditor';
import { useGridState } from './context/GridStateContext';
import type { RowRecord, SelectOption } from '../../types';

type Props = {
  row: any; // TanStack Row
  columnId: string;
  editorType: 'select' | 'multiSelect' | 'date' | 'user' | string;
  value: any;
  options?: SelectOption[];
  setData: (updater: RowRecord[] | ((prev: RowRecord[]) => RowRecord[])) => void;
};

const Cell: React.FC<Props> = ({ row, columnId, editorType, value, options = [], setData }) => {
  const { selectedCell, editingCell } = useGridState();

  const isSelected = selectedCell.rowId === row.original.id && selectedCell.columnId === columnId;
  const isEditing = editingCell.rowId === row.original.id && editingCell.columnId === columnId;

  const renderDisplay = (val: any) => {
    if (editorType === 'select') {
      return <span>{val?.label ?? ''}</span>;
    }
    if (editorType === 'multiSelect') {
      return <span>{Array.isArray(val) ? val.map((x: SelectOption) => x.label).join(', ') : ''}</span>;
    }
    if (editorType === 'date') {
      try {
        const d = new Date(val);
        return <span>{isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)}</span>;
      } catch {
        return <span />;
      }
    }
    if (editorType === 'user') {
      return <span>{val?.name ?? ''}</span>;
    }
    return <span>{val ?? ''}</span>;
  };

  if (!isSelected || !isEditing) {
    return renderDisplay(value);
  }

  return (
    <CellEditor
      type={editorType as any}
      value={value}
      options={options}
      onChange={(v) => {
        (row as any)._valuesCache = undefined;
        setData((prev) => prev.map((r) => (r.id === row.original.id ? { ...r, [columnId]: v } : r)));
      }}
    />
  );
};

export default Cell;