import { useMemo } from 'react';
import { applyColorBackground } from '../utils/logic';
import type { RowRecord } from '../types';
import type { ColorRule } from '../stores/colorRules';

export function useColorRules(params: {
  rules: ColorRule[];
  columnColors: Record<string, string>;
  columnMeta: Record<string, { type: string }>;
}) {
  const { rules, columnColors, columnMeta } = params;

  const getCellBg = useMemo(() => {
    return (row: RowRecord, columnId: string): string | undefined => {
      const { cellBg, rowBg } = applyColorBackground(rules, row, columnId, columnColors, columnMeta);
      return cellBg ?? rowBg;
    };
  }, [rules, columnColors, columnMeta]);

  return { getCellBg } as const;
}