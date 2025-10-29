import { useEffect, useRef, useState } from 'react';
import { makeListHandlerAdapter } from './keyboard';
import { createPortal } from 'react-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { SelectEditorProps } from './types';
import type { SelectOption } from '../../types';

export default function MultiSelectEditor({ value, onChange, options = [] }: SelectEditorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listParentRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const scheduleClose = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 150);
  };
  const cancelClose = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const [dropdownPos, setDropdownPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const updatePos = () => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownPos({ left: Math.round(rect.left), top: Math.round(rect.bottom + 4), width: Math.round(rect.width) });
  };
  useEffect(() => {
    if (open) {
      updatePos();
      const handler = () => updatePos();
      window.addEventListener('scroll', handler, true);
      window.addEventListener('resize', handler);
      return () => {
        window.removeEventListener('scroll', handler, true);
        window.removeEventListener('resize', handler);
      };
    }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      const container = containerRef.current;
      if (!panel || !container) return;
      const panelRect = panel.getBoundingClientRect();
      const contRect = container.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let top = contRect.bottom + 4;
      let left = contRect.left;
      if (panelRect.bottom > vh && contRect.top - panelRect.height - 4 >= 8) {
        top = contRect.top - panelRect.height - 4;
      }
      if (panelRect.right > vw) {
        left = Math.max(8, contRect.right - panelRect.width);
      }
      setDropdownPos({ left: Math.round(left), top: Math.round(top), width: Math.round(contRect.width) });
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, query]);
  const filtered = options.filter((o) => (o.label ?? '').toLowerCase().includes(query.toLowerCase()));
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  useEffect(() => {
    if (open) {
      setActiveIndex(filtered.length > 0 ? 0 : -1);
    }
  }, [open, query]);
  const selectedIds = new Set(((value as any) || []).map((v: SelectOption) => v.id));
  const toggleOption = (option: SelectOption) => {
    const current = (value as any) || [];
    if (selectedIds.has(option.id)) {
      onChange(current.filter((v: SelectOption) => v.id !== option.id));
    } else {
      onChange([...current, option]);
    }
  };
  const onKeyDown = makeListHandlerAdapter({
    getState: () => ({ open, activeIndex }),
    setOpen,
    setActiveIndex,
    maxIndex: filtered.length - 1,
    onSelect: (idx) => { if (filtered[idx]) toggleOption(filtered[idx]); },
    cancelClose,
    allowSpaceToOpen: false,
    closeOnSelect: false,
  });
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 30,
    overscan: 5,
  });
  useEffect(() => {
    if (!open) return;
    if (activeIndex >= 0) rowVirtualizer.scrollToIndex(activeIndex, { align: 'center' });
  }, [open, activeIndex]);
  return (
    <div
      ref={containerRef}
      tabIndex={0}
      style={{ position: 'relative', minHeight: 26, display: 'flex', alignItems: 'center', gap: 6, font: 'inherit' }}
      onClick={(e) => { e.stopPropagation(); cancelClose(); setOpen(true); }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={cancelClose}
      onKeyDown={onKeyDown}
    >
      {(value as any) && (value as any).length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(value as any).map((item: SelectOption) => (
            <span
              key={item.id}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', background: '#e2e8f0', borderRadius: 4, fontSize: 12 }}
            >
              {item.label}
              <button
                onClick={(e) => { e.stopPropagation(); toggleOption(item); }}
                style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 10 }}
              >×</button>
            </span>
          ))}
        </div>
      ) : (
        <span style={{ color: '#94a3b8' }}>（空）</span>
      )}
      {open && dropdownPos && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, minWidth: Math.max(160, dropdownPos.width), background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 10000 }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
            <input
              placeholder="搜索选项..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12 }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div ref={listParentRef} style={{ maxHeight: 220, overflow: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '6px 10px', color: '#888', fontSize: 12 }}>无匹配项</div>
            )}
            <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((vi) => {
                const opt = filtered[vi.index];
                const isActive = vi.index === activeIndex;
                const isSelected = selectedIds.has(opt.id);
                return (
                  <div
                    key={opt.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => { e.stopPropagation(); toggleOption(opt); }}
                    onMouseEnter={() => setActiveIndex(vi.index)}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)`, height: vi.size, padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: isActive ? '#f1f5f9' : 'transparent' }}
                  >
                    <input type="checkbox" checked={isSelected} onChange={() => {}} style={{ pointerEvents: 'none' }} />
                    {opt.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}