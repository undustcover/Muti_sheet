import React from 'react';
import Toolbar from '../Toolbar';
import type { ColumnItem } from '../../types';

export type MainToolbarProps = {
  columns: ColumnItem[];
  rowHeight: 'low' | 'medium' | 'high' | 'xhigh';
  columnVisibility: Record<string, boolean | undefined>;
  onColumnsChange: (cols: ColumnItem[]) => void;
  onRowHeightChange: (h: 'low' | 'medium' | 'high' | 'xhigh') => void;
  onFilterOpen: () => void;
  onColorOpen: () => void;
  onShowAllHidden: () => void;
  onAddRecord: () => void;
  onImport?: (rows: any[]) => void;
  onExport?: () => void;
  onToggleFieldVisibility: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onQuery: () => void;
  onDelete: () => void;
  onSortOpen?: () => void;
  onCreateField?: () => void;
  onEditField?: (id: string) => void;
};

const MainToolbar: React.FC<MainToolbarProps> = ({
  columns,
  rowHeight,
  columnVisibility,
  onColumnsChange,
  onRowHeightChange,
  onFilterOpen,
  onColorOpen,
  onShowAllHidden,
  onAddRecord,
  onImport,
  onExport,
  onToggleFieldVisibility,
  onUndo,
  onRedo,
  onQuery,
  onDelete,
  onSortOpen,
  onCreateField,
  onEditField,
}) => {
  return (
    <Toolbar
      columns={columns}
      onColumnsChange={onColumnsChange}
      rowHeight={rowHeight}
      onRowHeightChange={onRowHeightChange}
      onFilterOpen={onFilterOpen}
      onColorOpen={onColorOpen}
      onShowAllHidden={onShowAllHidden}
      onAddRecord={onAddRecord}
      onImport={onImport}
      onExport={onExport}
      columnVisibility={columnVisibility}
      onToggleFieldVisibility={onToggleFieldVisibility}
      onUndo={onUndo}
      onRedo={onRedo}
      onQuery={onQuery}
      onDelete={onDelete}
      onSortOpen={onSortOpen}
      onCreateField={onCreateField}
      onEditField={onEditField}
    />
  );
};

export default MainToolbar;