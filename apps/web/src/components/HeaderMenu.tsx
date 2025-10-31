import React, { useEffect, useRef, useState } from 'react';

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
  const [menuPosition, setMenuPosition] = useState<'left' | 'right'>('right');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const colors = ['#fffce8', '#e6fffa', '#eef2ff', '#fef9c3', '#fee2e2', '#dcfce7', '#e0f2fe'];
  const closeTimerRef = useRef<number | null>(null);
  const colorCloseTimerRef = useRef<number | null>(null);

  // 取消关闭定时器
  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  // 设置延迟关闭定时器
  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setColorOpen(false);
      closeTimerRef.current = null;
    }, 400);
  };

  // 取消颜色菜单关闭定时器
  const cancelColorClose = () => {
    if (colorCloseTimerRef.current) {
      clearTimeout(colorCloseTimerRef.current);
      colorCloseTimerRef.current = null;
    }
  };

  // 设置颜色菜单延迟关闭定时器
  const scheduleColorClose = () => {
    cancelColorClose();
    colorCloseTimerRef.current = window.setTimeout(() => {
      setColorOpen(false);
      colorCloseTimerRef.current = null;
    }, 400);
  };

  const checkMenuPosition = () => {
    const root = rootRef.current;
    const menu = menuRef.current;
    if (!root || !menu) return;
    const container = root.closest('[data-app-ready="1"]') as HTMLElement | null;
    const containerRect = container?.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    if (!containerRect) return;
    const willOverflowRight = (rootRect.left + menuRect.width) > containerRect.right;
    setMenuPosition(willOverflowRight ? 'left' : 'right');
  };

  // 当菜单打开时，检查位置并添加鼠标事件监听
  useEffect(() => {
    if (!open) return;
    
    // 延迟检查位置，确保DOM已更新
    setTimeout(checkMenuPosition, 0);
    
    // 监听窗口大小变化
    const handleResize = () => checkMenuPosition();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelClose();
      cancelColorClose();
    };
  }, [open]);

  return (
    <div 
      ref={rootRef} 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <span
        role="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{ marginLeft: 6, cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? '#bbb' : '#666' }}
      >▾</span>
      {open && !disabled && (
        <div 
          ref={menuRef}
          style={{ 
            position: 'absolute', 
            top: '100%', 
            // 默认向右展开（与触发元素左边对齐）；必要时智能翻转到左侧
            ...(menuPosition === 'left' ? { right: '100%' } : { left: 0 }),
            background: 'var(--surface)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius)', 
            boxShadow: 'var(--shadow)', 
            minWidth: 220, 
            zIndex: 60 
          }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { onEditField?.(columnId); setOpen(false); }}>编辑字段</div>
          <div style={{ padding: 'var(--spacing)', cursor: 'pointer' }} onClick={() => { onEditField?.(columnId); setOpen(false); }}>编辑描述</div>
          {/* 新增：隐藏字段 */}
          <div style={{ padding: 'var(--spacing)', cursor: disableHide ? 'not-allowed' : 'pointer', color: disableHide ? 'var(--muted)' : undefined }} onClick={() => { if (!disableHide) { onHideField?.(columnId); setOpen(false); } }}>隐藏字段</div>
          <div 
            style={{ 
              padding: 'var(--spacing)', 
              cursor: 'pointer', 
              position: 'relative' 
            }} 
            onClick={() => setColorOpen(!colorOpen)}
            onMouseEnter={cancelColorClose}
            onMouseLeave={scheduleColorClose}
          >
            整列填色 ▾
            {colorOpen && (
              <div 
                style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  left: 8, 
                  background: 'var(--surface)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius)', 
                  padding: 'calc(var(--spacing) - 2px)', 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(7, 18px)', 
                  gap: 6, 
                  boxShadow: 'var(--shadow)' 
                }}
                onMouseEnter={cancelColorClose}
                onMouseLeave={scheduleColorClose}
              >
                {colors.map((c) => (
                  <span 
                    key={c} 
                    role="button" 
                    title={c}
                    style={{ width: 18, height: 18, background: c, borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer' }}
                    onClick={() => { onFillColorColumn?.(columnId, c); setOpen(false); }}
                  />
                ))}
              </div>
            )}
          </div>
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