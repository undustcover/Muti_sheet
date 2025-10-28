import { describe, it, expect } from 'vitest';
import { matchesCondition, matchesGroup, applyColorBackground } from './logic';
import type { Condition, ConditionGroup, ColorRule } from '../stores/colorRules';

const columnMeta: Record<string, { type: string }> = {
  title: { type: 'text' },
  qty: { type: 'number' },
  date: { type: 'date' },
  assignee: { type: 'user' },
  tags: { type: 'multiSelect' },
  status: { type: 'select' },
  name: { type: 'text' },
};

describe('matchesCondition', () => {
  it('matches text eq/contains/empty', () => {
    const row = { title: 'Hello World' };
    expect(matchesCondition(row, { fieldId: 'title', operator: 'eq', value: 'Hello World' }, columnMeta)).toBe(true);
    expect(matchesCondition(row, { fieldId: 'title', operator: 'contains', value: 'World' }, columnMeta)).toBe(true);
    expect(matchesCondition({ title: '' }, { fieldId: 'title', operator: 'isEmpty' }, columnMeta)).toBe(true);
    expect(matchesCondition({ title: '' }, { fieldId: 'title', operator: 'notEmpty' }, columnMeta)).toBe(false);
  });

  it('matches number gt/lt/eq', () => {
    const row = { qty: 10 };
    expect(matchesCondition(row, { fieldId: 'qty', operator: 'gt', value: '5' }, columnMeta)).toBe(true);
    expect(matchesCondition(row, { fieldId: 'qty', operator: 'lt', value: '20' }, columnMeta)).toBe(true);
    expect(matchesCondition(row, { fieldId: 'qty', operator: 'eq', value: '10' }, columnMeta)).toBe(true);
  });

  it('matches date eq/gt/lt/contains', () => {
    const row = { date: '2024-01-05' };
    expect(matchesCondition(row, { fieldId: 'date', operator: 'eq', value: '2024-01-05' }, columnMeta)).toBe(true);
    expect(matchesCondition(row, { fieldId: 'date', operator: 'gt', value: '2024-01-01' }, columnMeta)).toBe(true);
    expect(matchesCondition(row, { fieldId: 'date', operator: 'lt', value: '2024-02-01' }, columnMeta)).toBe(true);
    expect(matchesCondition(row, { fieldId: 'date', operator: 'contains', value: '2024-01' }, columnMeta)).toBe(true);
  });

  it('matches select/user/relation eq and contains', () => {
    const row = {
      assignee: { id: 'u1', name: 'Alice' },
      status: { id: 'done', label: 'Done' },
      tags: ['alpha', { id: 'beta', label: 'Beta' }],
    };
    expect(matchesCondition(row, { fieldId: 'assignee', operator: 'eq', value: 'Alice' }, columnMeta)).toBe(true);
    expect(matchesCondition(row, { fieldId: 'assignee', operator: 'eq', value: 'u1' }, columnMeta)).toBe(true);
    expect(matchesCondition(row, { fieldId: 'assignee', operator: 'contains', value: 'li' }, columnMeta)).toBe(true);
    expect(matchesCondition(row, { fieldId: 'status', operator: 'eq', value: 'done' }, columnMeta)).toBe(true);
    expect(matchesCondition(row, { fieldId: 'status', operator: 'contains', value: 'Don' }, columnMeta)).toBe(true);
    expect(matchesCondition(row, { fieldId: 'tags', operator: 'eq', value: 'beta' }, columnMeta)).toBe(true);
    expect(matchesCondition(row, { fieldId: 'tags', operator: 'contains', value: 'bet' }, columnMeta)).toBe(true);
  });
});

describe('matchesGroup', () => {
  it('AND group and OR group', () => {
    const row = { title: 'Hello', qty: 10 };
    const condA: Condition = { fieldId: 'title', operator: 'contains', value: 'Hell' };
    const condB: Condition = { fieldId: 'qty', operator: 'gt', value: '5' };
    const andGroup: ConditionGroup = { operator: 'AND', conditions: [condA, condB] };
    const orGroup: ConditionGroup = { operator: 'OR', conditions: [condA, { fieldId: 'qty', operator: 'lt', value: '5' }] };

    expect(matchesGroup(row, andGroup, columnMeta)).toBe(true);
    expect(matchesGroup(row, orGroup, columnMeta)).toBe(true);
  });

  it('nested groups', () => {
    const row = { title: 'Hello', qty: 3 };
    const g1: ConditionGroup = {
      operator: 'AND',
      conditions: [
        { fieldId: 'title', operator: 'contains', value: 'Hell' },
        { fieldId: 'qty', operator: 'lt', value: '5' },
      ],
    };
    const g2: ConditionGroup = {
      operator: 'OR',
      conditions: [g1, { fieldId: 'qty', operator: 'gt', value: '100' }],
    };
    expect(matchesGroup(row, g2, columnMeta)).toBe(true);
  });
});

describe('applyColorBackground', () => {
  const columnColors = { name: '#eee' };
  const row = { status: { id: 'done', label: 'Done' }, name: 'RowName' };
  const condDone: Condition = { fieldId: 'status', operator: 'eq', value: 'done' };

  it('applies cell > column > row precedence', () => {
    const rules: ColorRule[] = [
      { id: 'r1', scope: 'row', columnId: '', color: '#00f', enabled: true, condition: condDone },
      { id: 'r2', scope: 'column', columnId: 'name', color: '#f00', enabled: true },
      { id: 'r3', scope: 'cell', columnId: 'name', color: '#0f0', enabled: true },
    ];
    const { cellBg, rowBg } = applyColorBackground(rules, row, 'name', columnColors, columnMeta);
    expect(rowBg).toBe('#00f');
    expect(cellBg).toBe('#0f0');
  });

  it('disabled cell rule lets column rule win', () => {
    const rules: ColorRule[] = [
      { id: 'r1', scope: 'row', columnId: '', color: '#00f', enabled: true, condition: condDone },
      { id: 'r2', scope: 'column', columnId: 'name', color: '#f00', enabled: true },
      { id: 'r3', scope: 'cell', columnId: 'name', color: '#0f0', enabled: false },
    ];
    const { cellBg, rowBg } = applyColorBackground(rules, row, 'name', columnColors, columnMeta);
    expect(rowBg).toBe('#00f');
    expect(cellBg).toBe('#f00');
  });

  it('base column color applies when no column rule', () => {
    const rules: ColorRule[] = [
      { id: 'r1', scope: 'row', columnId: '', color: '#00f', enabled: true, condition: condDone },
    ];
    const { cellBg, rowBg } = applyColorBackground(rules, row, 'name', columnColors, columnMeta);
    expect(rowBg).toBe('#00f');
    expect(cellBg).toBe('#eee');
  });

  it('condition controls rule application', () => {
    const notDone: Condition = { fieldId: 'status', operator: 'eq', value: 'pending' };
    const rules: ColorRule[] = [
      { id: 'r2', scope: 'column', columnId: 'name', color: '#f00', enabled: true, condition: notDone },
    ];
    const { cellBg } = applyColorBackground(rules, row, 'name', columnColors, columnMeta);
    expect(cellBg).toBe('#eee');
  });
});