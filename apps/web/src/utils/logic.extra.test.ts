import { describe, it, expect } from 'vitest';
import { applyColorBackground } from './logic';
import type { ColorRule, Condition } from '../stores/colorRules';

describe('applyColorBackground - cell rules with condition', () => {
  const columnMeta: Record<string, { type: string }> = {
    text: { type: 'text' },
  };
  const columnColors: Record<string, string> = {};

  it('applies cell color only when condition matches', () => {
    const cond: Condition = { fieldId: 'text', operator: 'eq', value: 'A' };
    const rules: ColorRule[] = [
      { id: 'c1', scope: 'cell', columnId: 'text', color: '#0f0', enabled: true, condition: cond },
    ];

    // match
    const rowA = { text: 'A' } as any;
    const { cellBg: matchBg } = applyColorBackground(rules, rowA, 'text', columnColors, columnMeta);
    expect(matchBg).toBe('#0f0');

    // not match
    const rowB = { text: 'B' } as any;
    const { cellBg: missBg } = applyColorBackground(rules, rowB, 'text', columnColors, columnMeta);
    expect(missBg).toBeUndefined();
  });
});