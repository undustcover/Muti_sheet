import type { SelectOption } from '../../types';

export type ColumnMeta = Record<string, { name: string; type: string; description?: string; options?: SelectOption[]; }> & Record<string, any>;

export type Virtualizer = {
  getVirtualItems: () => Array<{ index: number; start: number; size: number }>;
  getTotalSize: () => number;
};