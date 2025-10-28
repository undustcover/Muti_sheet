import React, { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  mode: 'public' | 'locked' | 'personal';
  onModeChange: (m: 'public' | 'locked' | 'personal') => void;
};

export const ProtectDrawer: React.FC<Props> = ({ open, onClose, mode, onModeChange }) => {
  const [hover, setHover] = useState(false);
  if (!open && !hover) return null;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); onClose(); }}
      style={{
        position: 'fixed', right: 0, top: 0, height: '100vh', width: 280,
        background: 'var(--surface)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow)',
        zIndex: 50, padding: 'calc(var(--spacing) * 2)'
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 'calc(var(--spacing) * 1.5)' }}>保护视图</div>
      <label style={{ display: 'block', margin: 'var(--spacing) 0' }}>
        <input type="radio" checked={mode === 'public'} onChange={() => onModeChange('public')} /> 公共视图（协作者可改）
      </label>
      <label style={{ display: 'block', margin: 'var(--spacing) 0' }}>
        <input type="radio" checked={mode === 'locked'} onChange={() => onModeChange('locked')} /> 锁定视图（不可修改）
      </label>
      <label style={{ display: 'block', margin: 'var(--spacing) 0' }}>
        <input type="radio" checked={mode === 'personal'} onChange={() => onModeChange('personal')} /> 个人视图（仅自己可见）
      </label>
      <div style={{ marginTop: 'calc(var(--spacing) * 1.5)', fontSize: 12, color: 'var(--muted)' }}>鼠标移出选项区域后自动隐藏。</div>
    </div>
  );
};

export default ProtectDrawer;