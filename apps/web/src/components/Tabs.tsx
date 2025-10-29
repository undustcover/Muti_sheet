import React, { useState } from 'react';
import type { View } from '../types';

type Props = {
  views: View[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onProtectClick: (id: string) => void;
};

export const Tabs: React.FC<Props> = ({ views, activeId, onSelect, onAdd, onRename, onDuplicate, onDelete, onProtectClick }) => {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renameFor, setRenameFor] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing)' }}>
      {views.slice(0, 10).map((v) => {
        const isActive = v.id === activeId;
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
            {menuFor === v.id && (
              <div
                style={{
                  position: 'absolute', top: '110%', left: 0, zIndex: 20,
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
      <button onClick={onAdd} style={{ padding: '6px 10px', borderRadius: 'var(--radius)' }}>+ 新建视图</button>
    </div>
  );
};

export default Tabs;