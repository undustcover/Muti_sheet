import React, { useMemo, useState } from 'react';
import type { Condition, ConditionGroup } from '../stores/colorRules';
import type { ColumnItem } from '../types';

export type ConditionBuilderProps = {
  open: boolean;
  columns: ColumnItem[];
  onClose: () => void;
  onApply: (group: ConditionGroup) => void;
  initialGroup?: ConditionGroup | null;
  onClear?: () => void;
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'flex-end', zIndex: 50,
};
const drawerStyle: React.CSSProperties = {
  width: '100%', maxHeight: '70vh', background: '#fff', borderTopLeftRadius: 8, borderTopRightRadius: 8,
  boxShadow: '0 -8px 24px rgba(0,0,0,0.12)', padding: 16,
};

const operators: Array<{ label: string; value: Condition['operator'] }> = [
  { label: '等于', value: 'eq' },
  { label: '包含', value: 'contains' },
  { label: '大于', value: 'gt' },
  { label: '小于', value: 'lt' },
  { label: '为空', value: 'isEmpty' },
  { label: '不为空', value: 'notEmpty' },
];

function ConditionRow({
  columns,
  condition,
  onChange,
  onRemove,
}: {
  columns: ColumnItem[];
  condition: Condition;
  onChange: (next: Condition) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 140px 1fr 80px', gap: 8, alignItems: 'center' }}>
      <select value={condition.fieldId} onChange={(e) => onChange({ ...condition, fieldId: e.target.value })}>
        {columns.map((col) => (
          <option key={col.id} value={col.id}>{col.name}</option>
        ))}
      </select>
      <select value={condition.operator} onChange={(e) => onChange({ ...condition, operator: e.target.value as Condition['operator'] })}>
        {operators.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>
      <input value={condition.value ?? ''} onChange={(e) => onChange({ ...condition, value: e.target.value })} placeholder="值" />
      <button onClick={onRemove}>删除</button>
    </div>
  );
}

function GroupEditor({
  group,
  columns,
  onChange,
}: {
  group: ConditionGroup;
  columns: ColumnItem[];
  onChange: (next: ConditionGroup) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>组逻辑</span>
        <select value={group.operator} onChange={(e) => onChange({ ...group, operator: e.target.value as ConditionGroup['operator'] })}>
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
        <button onClick={() => onChange({ ...group, conditions: [...group.conditions, { fieldId: columns[0]?.id ?? 'text', operator: 'contains', value: '' } as Condition] })}>+ 条件</button>
        <button onClick={() => onChange({ ...group, conditions: [...group.conditions, { operator: 'AND', conditions: [] } as ConditionGroup] })}>+ 子组</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {group.conditions.map((item, idx) => (
          <div key={idx} style={{ border: '1px solid #eee', borderRadius: 6, padding: 8 }}>
            {'conditions' in (item as any) ? (
              <GroupEditor
                group={item as ConditionGroup}
                columns={columns}
                onChange={(next) => {
                  const nextList = group.conditions.slice();
                  nextList[idx] = next;
                  onChange({ ...group, conditions: nextList });
                }}
              />
            ) : (
              <ConditionRow
                columns={columns}
                condition={item as Condition}
                onChange={(next) => {
                  const nextList = group.conditions.slice();
                  nextList[idx] = next;
                  onChange({ ...group, conditions: nextList });
                }}
                onRemove={() => {
                  const nextList = group.conditions.filter((_, i) => i !== idx);
                  onChange({ ...group, conditions: nextList });
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConditionBuilder({ open, columns, onClose, onApply, initialGroup, onClear }: ConditionBuilderProps) {
  const defaultFieldId = useMemo(() => (columns[1]?.id ?? columns[0]?.id ?? 'text'), [columns]);
  const [group, setGroup] = useState<ConditionGroup>(initialGroup ?? { operator: 'AND', conditions: [
    { fieldId: defaultFieldId, operator: 'contains', value: '' },
  ]});
  React.useEffect(() => {
    if (!open) return;
    if (initialGroup) setGroup(initialGroup);
  }, [open, initialGroup]);

  if (!open) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={drawerStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>筛选器</h3>
          <button onClick={onClose}>关闭</button>
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: '#666' }}>支持 AND/OR 以及嵌套子组。应用后按条件组过滤数据。</div>
        {group.conditions.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#374151' }}>当前筛选项（{group.conditions.length}）</span>
            {group.conditions.map((item, idx) => (
              <span key={`chip-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, background: '#e0e7ff', color: '#111827', fontSize: 12 }}>
                {'conditions' in (item as any) ? `子组 (${(item as ConditionGroup).operator})` : (() => {
                  const cond = item as Condition;
                  const fname = columns.find((c) => c.id === cond.fieldId)?.name ?? cond.fieldId;
                  const opMap: Record<string, string> = { eq: '等于', contains: '包含', gt: '大于', lt: '小于', isEmpty: '为空', notEmpty: '非空' };
                  const val = cond.value ?? '';
                  return `${fname} ${opMap[cond.operator] ?? cond.operator}${val ? ` ${val}` : ''}`;
                })()}
                <button onClick={() => {
                  const nextList = group.conditions.filter((_, i) => i !== idx);
                  setGroup({ ...group, conditions: nextList });
                }} title="删除" style={{ border: 'none', background: 'transparent', color: '#6b7280', cursor: 'pointer' }}>×</button>
              </span>
            ))}
            <span style={{ marginLeft: 'auto' }}>
              <button onClick={() => onClear?.()} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer' }}>清除全部</button>
            </span>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <GroupEditor group={group} columns={columns} onChange={setGroup} />
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          <button onClick={() => onApply(group)}>应用筛选</button>
          <button onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}

export default ConditionBuilder;