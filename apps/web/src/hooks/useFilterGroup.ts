import { useMemo, useState } from 'react';
import type { RowRecord } from '../types';
import type { ConditionGroup } from '../stores/colorRules';
import { matchesGroup } from '../utils/logic';

export function useFilterGroup(params: {
  data: RowRecord[];
  columnMeta: Record<string, { type: string }>;
}) {
  const { data, columnMeta } = params;
  const [activeGroup, setActiveGroup] = useState<ConditionGroup | null>(null);

  const filteredByGroup = useMemo(() => {
    if (!activeGroup) return data;
    return data.filter((r) => matchesGroup(r, activeGroup, columnMeta));
  }, [data, activeGroup, columnMeta]);

  const applyGroup = (group: ConditionGroup) => {
    setActiveGroup(group);
    return data.filter((r) => matchesGroup(r, group, columnMeta)).length;
  };

  const clearGroup = () => setActiveGroup(null);

  return { activeGroup, setActiveGroup, filteredByGroup, applyGroup, clearGroup } as const;
}