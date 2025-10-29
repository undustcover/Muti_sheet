import dayjs from 'dayjs';
import type { Condition, ConditionGroup, ColorRule } from '../stores/colorRules';

export type RowRecord = Record<string, any>;

export function isGroup(obj: Condition | ConditionGroup): obj is ConditionGroup {
  return (obj as ConditionGroup).conditions !== undefined;
}

function normalize(value: any) {
  if (value == null) return '';
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return value;
  return String(value);
}

export function matchesCondition(row: RowRecord, cond: Condition, columnMeta?: Record<string, { type: string }>): boolean {
  const raw = row[cond.fieldId];
  const v = normalize(raw);
  const op = cond.operator;
  const target = cond.value ?? '';
  const metaType = columnMeta?.[cond.fieldId]?.type ?? 'text';

  // helpers for select-like types
  const eqSelect = (option: any, t: string) => {
    if (option == null) return false;
    if (typeof option === 'string') return option === t || option.toLowerCase() === t.toLowerCase();
    if (typeof option === 'object') {
      const label = option.label ?? option.name ?? option.title ?? '';
      const id = option.id ?? option.value ?? '';
      return label === t || id === t;
    }
    return false;
  };
  const containsSelect = (option: any, t: string) => {
    if (option == null) return false;
    if (typeof option === 'string') return option.toLowerCase().includes(t.toLowerCase());
    if (typeof option === 'object') {
      const label = option.label ?? option.name ?? option.title ?? '';
      return String(label).toLowerCase().includes(t.toLowerCase());
    }
    return false;
  };

  switch (op) {
    case 'isEmpty': {
      if (Array.isArray(v)) return v.length === 0;
      return v === '' || v == null;
    }
    case 'notEmpty': {
      if (Array.isArray(v)) return v.length > 0;
      return !(v === '' || v == null);
    }
    case 'eq': {
      if (metaType === 'number') return Number(v) === Number(target);
      if (metaType === 'date') return dayjs(v).isSame(dayjs(target), 'day');
      if (metaType === 'select' || metaType === 'user' || metaType === 'relation') {
        return eqSelect(v, target);
      }
      if (metaType === 'multiSelect') {
        if (!Array.isArray(v)) return false;
        return v.some((opt) => eqSelect(opt, target));
      }
      return String(v) === String(target);
    }
    case 'contains': {
      if (metaType === 'number') return String(v).includes(String(target));
      if (metaType === 'date') return dayjs(v).format('YYYY-MM-DD').includes(String(target));
      if (metaType === 'select' || metaType === 'user' || metaType === 'relation') {
        return containsSelect(v, target);
      }
      if (metaType === 'multiSelect') {
        if (!Array.isArray(v)) return false;
        return v.some((opt) => containsSelect(opt, target));
      }
      return String(v).toLowerCase().includes(String(target).toLowerCase());
    }
    case 'gt': {
      if (metaType === 'date') return dayjs(v).isAfter(dayjs(target), 'day');
      return Number(v) > Number(target);
    }
    case 'lt': {
      if (metaType === 'date') return dayjs(v).isBefore(dayjs(target), 'day');
      return Number(v) < Number(target);
    }
    default:
      return false;
  }
}

export function matchesGroup(row: RowRecord, group: ConditionGroup, columnMeta?: Record<string, { type: string }>): boolean {
  const results = group.conditions.map((c) =>
    isGroup(c) ? matchesGroup(row, c, columnMeta) : matchesCondition(row, c, columnMeta)
  );
  return group.operator === 'AND'
    ? results.every(Boolean)
    : results.some(Boolean);
}

export function applyColorBackground(
  rules: ColorRule[],
  row: RowRecord,
  columnId: string,
  columnColors: Record<string, string>,
  columnMeta?: Record<string, { type: string }>
): { cellBg?: string; rowBg?: string } {
  let rowBg: string | undefined;
  let cellBg: string | undefined;

  // base column color
  const baseColor = columnColors[columnId];
  if (baseColor) cellBg = baseColor;

  // apply rules in order, only when enabled
  for (const r of rules) {
    if (!r.enabled) continue;
    if (r.condition && !matchesGroup(row, isGroup(r.condition) ? r.condition : { operator: 'AND', conditions: [r.condition] }, columnMeta)) {
      continue;
    }
    if (r.scope === 'row') {
      rowBg = r.color; // row scope overrides row background
    } else if (r.scope === 'cell' && r.columnId === columnId) {
      cellBg = r.color; // cell scope overrides cell background
    } else if (r.scope === 'column' && r.columnId === columnId) {
      cellBg = r.color; // column scope applies if column matches
    }
  }

  return { cellBg, rowBg };
}