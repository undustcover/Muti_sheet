import React, { useState, useEffect } from 'react';

type Props = {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onInsertAbove: (count: number) => void;
  onInsertBelow: (count: number) => void;
  onAddComment: () => void;
  onDeleteRow: () => void;
};

// Windows 风格行右键菜单：图标+文本，含插入数量控制
const RowContextMenu: React.FC<Props> = ({ open, x, y, onClose, onInsertAbove, onInsertBelow, onAddComment, onDeleteRow }) => {
  const [count, setCount] = useState<number>(1);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '6px 10px', cursor: 'pointer',
    userSelect: 'none', borderRadius: 4,
  };

  const iconStyle: React.CSSProperties = { width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

  return (
    <div
      style={{ position: 'fixed', left: x, top: y, zIndex: 1000 }}
      onClick={(e) => { e.stopPropagation(); }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        style={{
          minWidth: 220,
          background: '#fff',
          border: '1px solid #cfcfcf',
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
          borderRadius: 6,
          padding: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 8px 8px' }}>
          <span style={{ color: '#666' }}>插入数量</span>
          <input
            type="number"
            min={1}
            max={999}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
            style={{ width: 68, padding: '6px 8px', border: '1px solid #d0d0d0', borderRadius: 4 }}
          />
        </div>
        <div style={{ height: 1, background: '#e9e9e9', margin: '4px 0 6px 0' }} />

        <div
          style={itemStyle}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#e6f2ff'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          onClick={() => { onInsertAbove(count); onClose(); }}
        >
          <span style={iconStyle} aria-hidden>
            {/* 上箭头 */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5l-6 6h4v8h4v-8h4l-6-6z" fill="#333"/></svg>
          </span>
          <span>向上插入{count}行</span>
        </div>

        <div
          style={itemStyle}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#e6f2ff'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          onClick={() => { onInsertBelow(count); onClose(); }}
        >
          <span style={iconStyle} aria-hidden>
            {/* 下箭头 */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19l6-6h-4V5h-4v8H6l6 6z" fill="#333"/></svg>
          </span>
          <span>向下插入{count}行</span>
        </div>

        <div
          style={itemStyle}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#e6f2ff'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          onClick={() => { onAddComment(); onClose(); }}
        >
          <span style={iconStyle} aria-hidden>
            {/* 评论图标 */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v12H7l-3 3V4z" fill="#333"/></svg>
          </span>
          <span>添加评论</span>
        </div>

        <div
          style={{ ...itemStyle, color: '#d32f2f' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#ffecec'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          onClick={() => { onDeleteRow(); onClose(); }}
        >
          <span style={iconStyle} aria-hidden>
            {/* 删除图标 */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 7h12v2H6V7zm2 3h8l-1 9H9L8 10zm3-6h2l1 2H10l1-2z" fill="#d32f2f"/></svg>
          </span>
          <span>删除该行</span>
        </div>
      </div>
    </div>
  );
};

export default RowContextMenu;