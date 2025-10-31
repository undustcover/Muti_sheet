import React, { useState, useRef } from 'react';
import type { View } from '../types';
import type { ViewKind } from '../services/viewsStore';

type Props = {
  views: View[];
  activeId: string;
  tableId: string;
  onSelect: (id: string) => void;
  onAddWithKind: (kind: ViewKind) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onProtectClick: (id: string) => void;
};

const kindIcon = (kind?: ViewKind) => {
  switch (kind) {
    case 'table': return '📋';
    case 'query': return '🔍';
    case 'kanban': return '🗂️';
    case 'calendar': return '📅';
    case 'gantt': return '📈';
    case 'gallery': return '🖼️';
    case 'form': return '📝';
    default: return '📋';
  }
};

const kindLabel = (kind?: ViewKind) => {
  switch (kind) {
    case 'table': return '表格';
    case 'query': return '查询';
    case 'kanban': return '看板';
    case 'calendar': return '日历';
    case 'gantt': return '甘特';
    case 'gallery': return '画册';
    case 'form': return '表单';
    default: return '表格';
  }
};

export const Tabs: React.FC<Props> = ({ views, activeId, tableId, onSelect, onAddWithKind, onRename, onDuplicate, onDelete, onProtectClick }) => {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renameFor, setRenameFor] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing)' }}>
      {views.slice(0, 10).map((v) => {
        const isActive = v.id === activeId;
        const kind = v.kind as ViewKind | undefined;
        return (
          <div key={v.id} style={{ position: 'relative' }}>
            <div
              onClick={() => onSelect(v.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius)',
                border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--border)',
                background: isActive ? 'var(--surface-accent)' : 'var(--surface)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 'var(--spacing)'
              }}
            >
              <span aria-hidden style={{ fontSize: 12, opacity: 0.9 }}>{kindIcon(kind)}</span>
              {renameFor === v.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => {
                    onRename(v.id, renameValue || v.name);
                    setRenameFor(null);
                  }}
                  style={{ border: 'none', outline: 'none', width: 120 }}
                />
              ) : (
                <span>{v.name}</span>
              )}
              {isActive && (
                <span
                  onClick={(e) => { e.stopPropagation(); setMenuFor(v.id === menuFor ? null : v.id); }}
                  style={{ fontWeight: 700, cursor: 'pointer' }}
                >···</span>
              )}
            </div>
            {isActive && (
              <div style={{
                position: 'absolute', left: 8, right: 8, bottom: -2, height: 3,
                background: `linear-gradient(90deg, var(--color-primary), var(--color-accent))`,
                borderRadius: 2,
                boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
              }} />
            )}
            {menuFor === v.id && (
              <div
                style={{
                  position: 'absolute', top: '110%', left: 0, zIndex: 60,
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)'
                }}
              >
                <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { setRenameFor(v.id); setRenameValue(v.name); setMenuFor(null); }}>重命名</div>
                <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { onDuplicate(v.id); setMenuFor(null); }}>复制视图</div>
                <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { onProtectClick(v.id); setMenuFor(null); }}>保护视图</div>
                <div style={{ borderTop: '1px solid var(--border)' }} />
                <div style={{ padding: 'var(--spacing)', cursor: 'pointer', color: '#c00' }} onClick={() => { onDelete(v.id); setMenuFor(null); }}>删除视图</div>
              </div>
            )}
          </div>
        );
      })}
      <div style={{ position: 'relative' }}>
        <button ref={addBtnRef} onClick={() => setAddOpen((o) => !o)} style={{ padding: '6px 10px', borderRadius: 'var(--radius)' }}>+ 新建视图 ▾</button>
        {addOpen && (
          <div
            style={{
              position: 'absolute', top: '110%', right: 0, zIndex: 50,
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', minWidth: 180
            }}
            onMouseLeave={() => setAddOpen(false)}
          >
            <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { onAddWithKind('table'); setAddOpen(false); }}>表格视图</div>
            <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { onAddWithKind('query'); setAddOpen(false); }}>查询页视图</div>
            <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { onAddWithKind('kanban'); setAddOpen(false); }}>看板视图</div>
            <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { onAddWithKind('calendar'); setAddOpen(false); }}>日历视图</div>
            <div style={{ borderTop: '1px solid var(--border)' }} />
            <div style={{ padding: 'var(--spacing)', cursor: 'pointer', opacity: 0.85 }} onClick={() => { onAddWithKind('gantt'); setAddOpen(false); }}>甘特图视图（占位）</div>
            <div style={{ padding: 'var(--spacing)', cursor: 'pointer', opacity: 0.85 }} onClick={() => { onAddWithKind('gallery'); setAddOpen(false); }}>画册视图（占位）</div>
            <div style={{ padding: 'var(--spacing)', cursor: 'pointer', opacity: 0.85 }} onClick={() => { onAddWithKind('form'); setAddOpen(false); }}>表单视图（占位）</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tabs;