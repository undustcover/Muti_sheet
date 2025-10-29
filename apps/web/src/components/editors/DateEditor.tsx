import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { isOpenKey, isCloseKey } from './keyboard';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import type { DateEditorProps } from './types';

export default function DateEditor({ value, onChange }: DateEditorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const cancelClose = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const initial = value ? dayjs(value) : dayjs();
  const [viewMonth, setViewMonth] = useState(initial.startOf('month'));
  const [activeDate, setActiveDate] = useState(initial);
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
  }, [open]);
  const days: dayjs.Dayjs[] = useMemo(() => {
    const start = viewMonth.startOf('month').startOf('week');
    const arr: dayjs.Dayjs[] = [];
    for (let i = 0; i < 42; i++) arr.push(start.add(i, 'day'));
    return arr;
  }, [viewMonth]);
  const selectDate = (d: dayjs.Dayjs) => {
    setActiveDate(d);
    onChange(d.toISOString());
    setOpen(false);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!open && isOpenKey(e.key)) { setOpen(true); return; }
    if (!open) return;
    if (isCloseKey(e.key)) { setOpen(false); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); const nd = activeDate.subtract(1, 'day'); setActiveDate(nd); setViewMonth(nd.startOf('month')); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); const nd = activeDate.add(1, 'day'); setActiveDate(nd); setViewMonth(nd.startOf('month')); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); const nd = activeDate.subtract(7, 'day'); setActiveDate(nd); setViewMonth(nd.startOf('month')); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); const nd = activeDate.add(7, 'day'); setActiveDate(nd); setViewMonth(nd.startOf('month')); }
    else if (e.key === 'Enter') { e.preventDefault(); selectDate(activeDate); }
  };
  const display = value ? dayjs(value).format('YYYY-MM-DD') : '';
  return (
    <div
      ref={containerRef}
      tabIndex={0}
      style={{ position: 'relative', minHeight: 26, padding: '0 8px', border: '1px solid #e5e7eb', borderRadius: 6, display: 'flex', alignItems: 'center', font: 'inherit' }}
      onClick={(e) => { e.stopPropagation(); cancelClose(); setOpen(true); }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={cancelClose}
      onKeyDown={onKeyDown}
    >
      <span style={{ flex: 1, color: display ? '#0f172a' : '#64748b' }}>{display || '选择日期'}</span>
      {open && dropdownPos && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, minWidth: Math.max(220, dropdownPos.width), background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 10000 }}
          onMouseEnter={cancelClose}
          onMouseLeave={() => { if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current); closeTimerRef.current = window.setTimeout(() => setOpen(false), 150); }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid #f1f5f9' }}>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => setViewMonth((m) => m.subtract(1, 'month'))} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>‹</button>
            <span style={{ fontWeight: 600 }}>{viewMonth.format('YYYY年MM月')}</span>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => setViewMonth((m) => m.add(1, 'month'))} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, padding: 8 }}>
            {['一','二','三','四','五','六','日'].map((w) => (
              <div key={w} style={{ textAlign: 'center', color: '#64748b', fontSize: 12 }}>{w}</div>
            ))}
            {days.map((d) => {
              const inMonth = d.month() === viewMonth.month();
              const isSelected = value ? d.isSame(dayjs(value), 'day') : false;
              const isActive = d.isSame(activeDate, 'day');
              return (
                <div
                  key={d.toString()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.stopPropagation(); selectDate(d); }}
                  onDoubleClick={(e) => { e.stopPropagation(); selectDate(d); }}
                  onMouseEnter={() => setActiveDate(d)}
                  style={{ padding: '6px 0', textAlign: 'center', borderRadius: 6, cursor: 'pointer', background: isActive ? '#f1f5f9' : 'transparent', color: inMonth ? (isSelected ? '#fff' : '#0f172a') : '#cbd5e1', ...(isSelected ? { background: '#6366f1' } : {}) }}
                >
                  {d.date()}
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}