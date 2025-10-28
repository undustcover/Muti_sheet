import React, { useState } from 'react';

type Props = {
  columnId: string;
  index: number;
  disabled?: boolean;
  disableHide?: boolean;
  disableDelete?: boolean;
  onEditField?: (id: string) => void;
  onFreezeTo?: (indexInclusive: number) => void;
  onHideField?: (id: string) => void;
  onSortAsc?: (id: string) => void;
  onSortDesc?: (id: string) => void;
  onDeleteField?: (id: string) => void;
  // 新增：整列填色/插入/复制
  onFillColorColumn?: (id: string, color: string) => void;
  onInsertLeft?: (id: string) => void;
  onInsertRight?: (id: string) => void;
  onDuplicateField?: (id: string) => void;
};

export const HeaderMenu: React.FC<Props> = ({ columnId, index, disabled, disableHide, disableDelete, onEditField, onFreezeTo, onHideField, onSortAsc, onSortDesc, onDeleteField, onFillColorColumn, onInsertLeft, onInsertRight, onDuplicateField }) => {
  const [open, setOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const colors = ['#fffce8', '#e6fffa', '#eef2ff', '#fef9c3', '#fee2e2', '#dcfce7', '#e0f2fe'];
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span
        role="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{ marginLeft: 6, cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? '#bbb' : '#666' }}
      >▾</span>
      {open && !disabled && (
        <div style={{ position: 'absolute', top: '120%', right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', minWidth: 220, zIndex: 60 }}>
          <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { onEditField?.(columnId); setOpen(false); }}>编辑字段</div>
          <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { onEditField?.(columnId); setOpen(false); }}>编辑描述</div>
          <div style={{ padding: 'var(--spacing)', cursor: 'pointer', position: 'relative' }} onClick={() => setColorOpen(!colorOpen)}>
            整列填色 ▾
            {colorOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 'calc(var(--spacing) - 2px)', display: 'grid', gridTemplateColumns: 'repeat(7, 18px)', gap: 6, boxShadow: 'var(--shadow)' }}>
                {colors.map((c) => (
                  <span key={c} title={c} onClick={() => { onFillColorColumn?.(columnId, c); setColorOpen(false); setOpen(false); }} style={{ width: 18, height: 18, borderRadius: 4, background: c, border: '1px solid var(--border)', cursor: 'pointer' }} />
                ))}
              </div>
            )}
          </div>
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { onFreezeTo?.(index + 1); setOpen(false); }}>冻结至此字段</div>
          <div style={{ padding: 'var(--spacing)', cursor: disableHide ? 'not-allowed' : 'pointer', color: disableHide ? 'var(--muted)' : undefined }} onClick={() => { if (!disableHide) { onHideField?.(columnId); setOpen(false); } }}>隐藏字段</div>
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { onInsertLeft?.(columnId); setOpen(false); }}>插入左侧</div>
          <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { onInsertRight?.(columnId); setOpen(false); }}>插入右侧</div>
          <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { onDuplicateField?.(columnId); setOpen(false); }}>复制字段</div>
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { onSortAsc?.(columnId); setOpen(false); }}>升序</div>
          <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { onSortDesc?.(columnId); setOpen(false); }}>降序</div>
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <div style={{ padding: 'var(--spacing)', cursor: disableDelete ? 'not-allowed' : 'pointer', color: disableDelete ? 'var(--muted)' : '#c00' }} onClick={() => { if (!disableDelete) { onDeleteField?.(columnId); setOpen(false); } }}>删除字段</div>
        </div>
      )}
    </div>
  );
};

export default HeaderMenu;