import { create } from 'zustand';

export type Condition = {
  fieldId: string;
  operator: 'eq' | 'contains' | 'gt' | 'lt' | 'isEmpty' | 'notEmpty';
  value?: string;
};
export type ConditionGroup = {
  operator: 'AND' | 'OR';
  conditions: Array<Condition | ConditionGroup>;
};

export type ColorRule = {
  id: string;
  scope: 'column' | 'row' | 'cell';
  columnId: string;
  color: string;
  enabled: boolean;
  condition?: Condition | ConditionGroup; // optional: can apply when condition matches
};

export type ColorRulesState = {
  rules: ColorRule[];
  addRule: (rule: Omit<ColorRule, 'id' | 'enabled'> & { enabled?: boolean }) => string;
  removeRule: (id: string) => void;
  clearRules: () => void;
  setRules: (rules: ColorRule[]) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
  toggleRule: (id: string, enabled?: boolean) => void;
  updateRule: (id: string, patch: Partial<ColorRule>) => void;
  // 新增：复制与批量启用/禁用
  duplicateRule: (id: string) => void;
  setAllEnabled: (enabled: boolean) => void;
};

export const useColorRulesStore = create<ColorRulesState>((set) => ({
  rules: [],
  addRule: (rule) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const enabled = rule.enabled ?? true;
    set((s) => ({ rules: [...s.rules, { id, enabled, ...rule }] }));
    return id;
  },
  removeRule: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),
  clearRules: () => set({ rules: [] }),
  setRules: (rules) => set({ rules }),
  moveUp: (id) => set((s) => {
    const idx = s.rules.findIndex((r) => r.id === id);
    if (idx <= 0) return s;
    const next = [...s.rules];
    const [item] = next.splice(idx, 1);
    next.splice(idx - 1, 0, item);
    return { rules: next };
  }),
  moveDown: (id) => set((s) => {
    const idx = s.rules.findIndex((r) => r.id === id);
    if (idx < 0 || idx >= s.rules.length - 1) return s;
    const next = [...s.rules];
    const [item] = next.splice(idx, 1);
    next.splice(idx + 1, 0, item);
    return { rules: next };
  }),
  toggleRule: (id, enabled) => set((s) => ({
    rules: s.rules.map((r) => r.id === id ? { ...r, enabled: enabled ?? !r.enabled } : r),
  })),
  updateRule: (id, patch) => set((s) => ({
    rules: s.rules.map((r) => r.id === id ? { ...r, ...patch } : r),
  })),
  // 新增：复制与批量启用/禁用
  duplicateRule: (id) => set((s) => {
    const src = s.rules.find((r) => r.id === id);
    if (!src) return s;
    const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const copy: ColorRule = { ...src, id: newId };
    return { rules: [...s.rules, copy] };
  }),
  setAllEnabled: (enabled) => set((s) => ({
    rules: s.rules.map((r) => ({ ...r, enabled })),
  })),
}));