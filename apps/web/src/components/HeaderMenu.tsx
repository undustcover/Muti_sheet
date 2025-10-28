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
};

export const HeaderMenu: React.FC<Props> = ({ columnId, index, disabled, disableHide, disableDelete, onEditField, onFreezeTo, onHideField, onSortAsc, onSortDesc, onDeleteField }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span
        role="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{ marginLeft: 6, cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? '#bbb' : '#666' }}
      >▾</span>
      {open && !disabled && (
        <div style={{ position: 'absolute', top: '120%', right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,0.08)', minWidth: 180, zIndex: 60 }}>
          <div style={{ padding: 8, cursor: 'pointer' }} onClick={() => { onEditField?.(columnId); setOpen(false); }}>编辑字段</div>
          <div style={{ padding: 8, cursor: 'pointer' }} onClick={() => { onFreezeTo?.(index + 1); setOpen(false); }}>冻结至此字段</div>
          <div style={{ padding: 8, cursor: disableHide ? 'not-allowed' : 'pointer', color: disableHide ? '#bbb' : undefined }} onClick={() => { if (!disableHide) { onHideField?.(columnId); setOpen(false); } }}>隐藏字段</div>
          <div style={{ borderTop: '1px solid #eee' }} />
          <div style={{ padding: 8, cursor: 'pointer' }} onClick={() => { onSortAsc?.(columnId); setOpen(false); }}>升序</div>
          <div style={{ padding: 8, cursor: 'pointer' }} onClick={() => { onSortDesc?.(columnId); setOpen(false); }}>降序</div>
          <div style={{ borderTop: '1px solid #eee' }} />
          <div style={{ padding: 8, cursor: disableDelete ? 'not-allowed' : 'pointer', color: disableDelete ? '#bbb' : '#c00' }} onClick={() => { if (!disableDelete) { onDeleteField?.(columnId); setOpen(false); } }}>删除字段</div>
        </div>
      )}
    </div>
  );
};

export default HeaderMenu;