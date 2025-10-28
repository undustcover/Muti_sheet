import { describe, it, expect, beforeEach } from 'vitest';
import { useColorRulesStore } from './colorRules';

describe('colorRules store', () => {
  beforeEach(() => {
    // reset store state
    useColorRulesStore.getState().clearRules();
  });

  it('adds and duplicates a rule', () => {
    const { addRule, duplicateRule, rules } = useColorRulesStore.getState();
    const id = addRule({ scope: 'column', columnId: 'text', color: '#f00' });

    expect(useColorRulesStore.getState().rules.length).toBe(1);
    duplicateRule(id);
    const curr = useColorRulesStore.getState().rules;
    expect(curr.length).toBe(2);

    const [r1, r2] = curr;
    expect(r1.id).not.toBe(r2.id);
    // other fields equal
    expect({ ...r1, id: undefined }).toEqual({ ...r2, id: undefined });
  });

  it('batch enables/disables rules', () => {
    const { addRule, setAllEnabled } = useColorRulesStore.getState();
    addRule({ scope: 'column', columnId: 'text', color: '#f00' });
    addRule({ scope: 'row', columnId: 'id', color: '#0f0' });
    addRule({ scope: 'cell', columnId: 'number', color: '#00f' });

    setAllEnabled(false);
    expect(useColorRulesStore.getState().rules.every((r) => r.enabled === false)).toBe(true);

    setAllEnabled(true);
    expect(useColorRulesStore.getState().rules.every((r) => r.enabled === true)).toBe(true);
  });
});