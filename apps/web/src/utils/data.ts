import type { RowRecord, SelectOption, FormulaConfig, NumberFormat } from '../types';

export function generateMockRows(count = 15): RowRecord[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `rec-${i + 1}`,
    text: '',
    number: 0,
    time: '',
  })) as any;
}

export const initialColumnMeta: Record<string, { name: string; type: string; description?: string; options?: SelectOption[]; formula?: FormulaConfig; format?: NumberFormat }> = {
  id: { name: '首字段', type: 'text', description: '' },
  number: { name: '序号', type: 'number', description: '', format: { decimals: 0, thousand: false } },
  text: { name: '文本', type: 'text', description: '' },
  time: { name: '时间', type: 'time', description: '' },
};