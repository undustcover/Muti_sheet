import React, { useMemo } from 'react';
import type { RowRecord, SelectOption } from '../../types';
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';

type KanbanProps = {
  rows: RowRecord[];
  columnMeta: Record<string, { name: string; type: string; options?: SelectOption[] }>;
  setData: (updater: RowRecord[] | ((prev: RowRecord[]) => RowRecord[])) => void;
  defaultSelectOptions?: SelectOption[];
  groupFieldId?: string;
  onChangeGroupFieldId?: (fieldId: string) => void;
};

export default function KanbanView({ rows, columnMeta, setData, defaultSelectOptions, groupFieldId, onChangeGroupFieldId }: KanbanProps) {
  const effectiveGroupFieldId = useMemo(() => {
    if (groupFieldId && (columnMeta[groupFieldId]?.type === 'single' || columnMeta[groupFieldId]?.type === 'singleSelect')) return groupFieldId;
    const entry = Object.entries(columnMeta).find(([id, m]) => m.type === 'single' || m.type === 'singleSelect');
    return entry ? entry[0] : null;
  }, [columnMeta, groupFieldId]);

  const options: SelectOption[] = useMemo(() => {
    if (!effectiveGroupFieldId) return [];
    return columnMeta[effectiveGroupFieldId]?.options ?? defaultSelectOptions ?? [];
  }, [effectiveGroupFieldId, columnMeta, defaultSelectOptions]);

  const grouped = useMemo(() => {
    const map: Record<string, RowRecord[]> = {};
    const optIds = new Set(options.map(o => o.id));
    rows.forEach(r => {
      const v: any = effectiveGroupFieldId ? (r as any)[effectiveGroupFieldId] : null;
      const key = v && optIds.has(v.id) ? v.id : '__null__';
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [rows, options, effectiveGroupFieldId]);

  const onDragEnd = (e: DragEndEvent) => {
    const overId = e.over?.id as string | undefined;
    const dragId = e.active?.id as string | undefined;
    if (!overId || !dragId || !effectiveGroupFieldId) return;
    const rowId = dragId.replace(/^card-/, '');
    const colOptId = overId.replace(/^col-/, '');
    const opt = colOptId === '__null__' ? null : options.find(o => o.id === colOptId) ?? null;
    setData(prev => prev.map(r => (r.id === rowId ? ({ ...r, [effectiveGroupFieldId]: opt }) as any : r)));
  };

  const singleSelectFields = useMemo(() => Object.entries(columnMeta).filter(([_, m]) => m.type === 'single' || m.type === 'singleSelect').map(([id, m]) => ({ id, name: m.name ?? id })), [columnMeta]);

  if (!effectiveGroupFieldId) {
    return (
      <div style={{ padding: 24 }}>
        <h3>看板</h3>
        <p>请添加一个“单选”字段以作为分组维度。</p>
        {singleSelectFields.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>选择分组字段:</span>
              <select onChange={(e) => onChangeGroupFieldId?.(e.currentTarget.value)} defaultValue="">
                <option value="">未选择</option>
                {singleSelectFields.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
              </select>
            </label>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>分组字段:</span>
          <select value={effectiveGroupFieldId ?? ''} onChange={(e) => onChangeGroupFieldId?.(e.currentTarget.value)}>
            {singleSelectFields.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
          </select>
        </label>
      </div>
      <DndContext onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {[...options, { id: '__null__', label: '未分组' } as SelectOption].map(opt => (
            <Column key={opt.id} id={`col-${opt.id}`} label={opt.label}>
              {(grouped[opt.id] || grouped['__null__'] || []).filter(r => {
                if (opt.id === '__null__') return (r as any)[effectiveGroupFieldId] == null;
                const v: any = (r as any)[effectiveGroupFieldId];
                return v && v.id === opt.id;
              }).map(r => (
                <Card key={r.id} id={`card-${r.id}`} title={(r as any).text || r.id} subtitle={`#${r.id}`} />
              ))}
            </Column>
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        width: 260,
        minWidth: 260,
        border: '1px solid #eee',
        borderRadius: 8,
        background: isOver ? '#f0faff' : '#fafafa',
        padding: 8,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'grid', gap: 8 }}>{children}</div>
    </div>
  );
}

function Card({ id, title, subtitle }: { id: string; title: string; subtitle?: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style: React.CSSProperties = {
    border: '1px solid #ddd',
    borderRadius: 6,
    background: '#fff',
    padding: '8px 10px',
    boxShadow: isDragging ? '0 4px 8px rgba(0,0,0,0.10)' : '0 1px 2px rgba(0,0,0,0.04)',
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    touchAction: 'none',
  };
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ color: '#666', fontSize: 12 }}>{subtitle}</div>}
    </div>
  );
}