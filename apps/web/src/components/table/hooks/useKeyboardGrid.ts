import type { ColumnDef } from '@tanstack/react-table';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useKeyboard } from './useKeyboard';

export function useKeyboardGrid<TData = any>(params: {
  table: any;
  columns: ColumnDef<TData, any>[];
  onCopyKey: (e: ReactKeyboardEvent<HTMLDivElement>) => boolean;
  onFillKey?: (e: ReactKeyboardEvent<HTMLDivElement>) => boolean;
}) {
  const { table, columns, onCopyKey, onFillKey } = params;

  return useKeyboard<TData>({
    table,
    columns,
    onCopyKey,
    onFillKey,
  });
}