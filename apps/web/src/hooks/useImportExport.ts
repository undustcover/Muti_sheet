import dayjs from 'dayjs';
import type { RowRecord, SelectOption } from '../types';

export type UseImportExportParams = {
  data: RowRecord[];
  setData: (updater: RowRecord[] | ((prev: RowRecord[]) => RowRecord[])) => void;
  columnMeta: Record<string, { type: string; options?: SelectOption[] }>;
  show: (msg: string, level?: 'success' | 'info' | 'error', opts?: any) => void;
  requestMeasure: () => void;
};

export function useImportExport(params: UseImportExportParams) {
  const { data, setData, columnMeta, show, requestMeasure } = params;

  const onExport = async () => {
    const XLSX = await import('xlsx');
    const header = ['text', 'number', 'date', 'select', 'multiSelect', 'relation', 'user'];
    const rows = data.map((r) => [
      (r as any).text ?? '',
      (r as any).number ?? 0,
      r?.date ? dayjs(r.date).format('YYYY-MM-DD') : '',
      (r as any).select?.label ?? '',
      Array.isArray((r as any).multiSelect) ? (r as any).multiSelect.map((m: any) => m.label).join(',') : '',
      (r as any).relation ?? '',
      (r as any).user?.name ?? '',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'export.xlsx');
    requestMeasure();
  };

  const onImport = (rawRows: any[][]) => {
    const selOpts = columnMeta['select']?.options ?? [];
    const tagOpts = columnMeta['multiSelect']?.options ?? [];

    const toOption = (val: string, options: SelectOption[]) => {
      const trimmed = (val ?? '').trim();
      if (!trimmed) return null;
      const found = options.find((o) => o.label === trimmed);
      return found ?? null;
    };

    const toMultiOptions = (val: string, options: SelectOption[]) => {
      if (!val) return [] as SelectOption[];
      return String(val)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => !!s)
        .map((label) => options.find((o) => o.label === label))
        .filter((o): o is SelectOption => !!o);
    };

    const next: RowRecord[] = rawRows.map((arr, i) => {
      const text = String(arr?.[0] ?? '');
      const number = Number(arr?.[1] ?? 0) || 0;
      const dateStr = (arr?.[2] ?? '') as string;
      const dateISO = dateStr && dayjs(dateStr).isValid() ? dayjs(dateStr).toISOString() : dayjs().toISOString();
      const select = toOption(String(arr?.[3] ?? ''), selOpts);
      const multiSelect = toMultiOptions(String(arr?.[4] ?? ''), tagOpts);
      const relation = (arr?.[5] ?? '') ? String(arr?.[5]) : null;
      const userName = String(arr?.[6] ?? '').trim();
      const user = userName ? { id: `u-${i + 1}-${Date.now()}`, name: userName } : null;
      const id = `rec-${i + 1}-${Date.now()}`;
      const row: any = { id, text, number, date: dateISO, select, multiSelect, relation, user };
      // 兼容当前列元数据中存在的 time 字段（若有），填入同值
      if (columnMeta['time']) row.time = dateISO;
      return row as RowRecord;
    });

    setData(next);
    show('已导入 Excel 数据', 'success');
    requestMeasure();
  };

  return { onExport, onImport };
}