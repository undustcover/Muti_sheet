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
        background: '#fff', borderLeft: '1px solid #eee', boxShadow: '0 0 24px rgba(0,0,0,0.06)',
        zIndex: 50, padding: 16
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 12 }}>保护视图</div>
      <label style={{ display: 'block', margin: '8px 0' }}>
        <input type="radio" checked={mode === 'public'} onChange={() => onModeChange('public')} /> 公共视图（协作者可改）
      </label>
      <label style={{ display: 'block', margin: '8px 0' }}>
        <input type="radio" checked={mode === 'locked'} onChange={() => onModeChange('locked')} /> 锁定视图（不可修改）
      </label>
      <label style={{ display: 'block', margin: '8px 0' }}>
        <input type="radio" checked={mode === 'personal'} onChange={() => onModeChange('personal')} /> 个人视图（仅自己可见）
      </label>
      <div style={{ marginTop: 12, fontSize: 12, color: '#888' }}>鼠标移出选项区域后自动隐藏。</div>
    </div>
  );
};

export default ProtectDrawer;