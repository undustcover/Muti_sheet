import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import './App.css';
import Sidebar from './components/Sidebar';
import Tabs from './components/Tabs';
import ProtectDrawer from './components/ProtectDrawer';
import Toolbar from './components/Toolbar';
import HeaderMenu from './components/HeaderMenu';
import FieldDrawer from './components/FieldDrawer';
import { useToast } from './components/Toast';
import ConditionBuilder from './components/ConditionBuilder';
import ColorRulesDrawer from './components/ColorRulesDrawer';
import { useColorRulesStore } from './stores/colorRules';
import type { ConditionGroup } from './stores/colorRules';
import { matchesGroup, applyColorBackground } from './utils/logic';

// Types for MVP fields
type User = { id: string; name: string };
type SelectOption = { id: string; label: string };
type FormulaOp = 'sum' | 'add' | 'sub' | 'mul' | 'div' | 'avg' | 'max' | 'min';
type FormulaConfig = { op: FormulaOp; fields: string[]; format?: { decimals: number; thousand: boolean } };
type NumberFormat = { decimals: number; thousand: boolean };

export type RowRecord = {
  id: string;
  text: string;
  number: number;
  date: string; // ISO string
  select: SelectOption | null;
  multiSelect: SelectOption[];
  relation: string | null; // related record id
  user: User | null;
};

type ColumnItem = { id: string; name: string; type: string };

type View = { id: string; name: string; protect: 'public' | 'locked' | 'personal' };

const initialOptions: SelectOption[] = [
  { id: 'opt-1', label: '需求' },
  { id: 'opt-2', label: '进行中' },
  { id: 'opt-3', label: '完成' },
];

const mockUsers: User[] = [
  { id: 'u-1', name: 'Alice' },
  { id: 'u-2', name: 'Bob' },
  { id: 'u-3', name: 'Carol' },
];

function generateMockRows(count = 100): RowRecord[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `rec-${i + 1}`,
    text: `任务 ${i + 1}`,
    number: Math.round(Math.random() * 1000),
    date: dayjs().subtract(i, 'day').toISOString(),
    select: initialOptions[(i + 1) % initialOptions.length],
    multiSelect: [initialOptions[i % initialOptions.length]],
    relation: i % 5 === 0 ? `rec-${i}` : null,
    user: mockUsers[i % mockUsers.length],
  }));
}

function CellEditor({ value, onChange, type, options }: {
  value: any;
  onChange: (v: any) => void;
  type: 'text' | 'number' | 'date' | 'select' | 'multiSelect' | 'relation' | 'user';
  options?: SelectOption[];
}) {
  if (type === 'text') {
    return (
      <input
        className="sheet-input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
    );
  }
  if (type === 'number') {
    return (
      <input
        type="number"
        className="sheet-input"
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        autoFocus
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
    );
  }
  if (type === 'date') {
    const DatePickerControl: React.FC<{ val: string | null; onCommit: (iso: string) => void }> = ({ val, onCommit }) => {
      const [open, setOpen] = useState(false);
      const containerRef = useRef<HTMLDivElement | null>(null);
      const panelRef = useRef<HTMLDivElement | null>(null);
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
      const initial = val ? dayjs(val) : dayjs();
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
      // 智能翻转定位
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
        onCommit(d.toISOString());
        setOpen(false);
      };
      const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { setOpen(true); return; }
        if (!open) return;
        if (e.key === 'Escape') { setOpen(false); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); const nd = activeDate.subtract(1, 'day'); setActiveDate(nd); setViewMonth(nd.startOf('month')); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); const nd = activeDate.add(1, 'day'); setActiveDate(nd); setViewMonth(nd.startOf('month')); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); const nd = activeDate.subtract(7, 'day'); setActiveDate(nd); setViewMonth(nd.startOf('month')); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); const nd = activeDate.add(7, 'day'); setActiveDate(nd); setViewMonth(nd.startOf('month')); }
        else if (e.key === 'Enter') { e.preventDefault(); selectDate(activeDate); }
      };
      const display = val ? dayjs(val).format('YYYY-MM-DD') : '';
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
              onMouseLeave={scheduleClose}
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
                  const isSelected = val ? d.isSame(dayjs(val), 'day') : false;
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
    };
    return <DatePickerControl val={value ?? null} onCommit={(iso) => onChange(iso)} />;
  }
  if (type === 'select') {
    const opts = options ?? initialOptions;
    const SingleSelectControl: React.FC<{ val: SelectOption | null; onChange: (v: SelectOption | null) => void; showAvatar?: boolean }> = ({ val, onChange, showAvatar }) => {
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
      // 智能翻转定位：根据视口可用空间在面板渲染后进行修正
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
      const filtered = (opts ?? []).filter((o) => (o.label ?? '').toLowerCase().includes(query.toLowerCase()));
      const [activeIndex, setActiveIndex] = useState<number>(-1);
      useEffect(() => {
        if (open) {
          if (val) {
            const idx = filtered.findIndex((o) => o.id === val.id);
            setActiveIndex(idx >= 0 ? idx : (filtered.length > 0 ? 0 : -1));
          } else {
            setActiveIndex(filtered.length > 0 ? 0 : -1);
          }
        }
      }, [open, val, query]);
      const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!open) {
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            cancelClose();
            setOpen(true);
          }
          return;
        }
        if (['ArrowDown','ArrowUp','Enter','Escape'].includes(e.key)) e.preventDefault();
        if (e.key === 'ArrowDown') {
          setActiveIndex((i) => Math.min((i < 0 ? 0 : i) + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
          setActiveIndex((i) => Math.max((i < 0 ? 0 : i) - 1, 0));
        } else if (e.key === 'Enter') {
          if (activeIndex >= 0 && filtered[activeIndex]) {
            onChange(filtered[activeIndex]);
            setOpen(false);
          }
        } else if (e.key === 'Escape') {
          setOpen(false);
        }
      };
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
      const initials = (txt: string) => {
        const s = (txt || '').trim();
        if (!s) return '';
        const parts = s.split(/\s+/);
        const first = parts[0]?.[0] ?? '';
        const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
        return (first + last).toUpperCase();
      };
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
          {val ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {showAvatar && (
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#e2e8f0', color: '#334155', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                  {initials(val.label)}
                </span>
              )}
              <span>{val.label}</span>
              <button
                title="清除"
                onClick={(e) => { e.stopPropagation(); onChange(null); }}
                style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer' }}
              >×</button>
            </span>
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
                  placeholder="搜索..."
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
                    return (
                      <div
                        key={opt.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onDoubleClick={(e) => { e.stopPropagation(); onChange(opt); setOpen(false); }}
                        onClick={(e) => { e.stopPropagation(); onChange(opt); setOpen(false); }}
                        onMouseEnter={() => setActiveIndex(vi.index)}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)`, height: vi.size, padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: isActive ? '#f1f5f9' : 'transparent' }}
                      >
                        {showAvatar && (
                          <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#e2e8f0', color: '#334155', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                            {initials(opt.label)}
                          </span>
                        )}
                        <span>{opt.label}</span>
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
    };
    return <SingleSelectControl val={value} onChange={(v) => onChange(v)} showAvatar={false} />;
  }
  if (type === 'multiSelect') {
    const opts = options ?? initialOptions;
    const MultiSelectControl: React.FC<{ val: SelectOption[]; onChange: (v: SelectOption[]) => void }> = ({ val, onChange }) => {
      const [open, setOpen] = useState(false);
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
      // 智能翻转定位
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
      const selectedIds = new Set((val ?? []).map((v) => v.id));
      const [query, setQuery] = useState('');
      const available = (opts ?? []).filter((o) => !selectedIds.has(o.id));
      const filtered = available.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
      const [activeIndex, setActiveIndex] = useState<number>(filtered.length ? 0 : -1);
      useEffect(() => { setActiveIndex(filtered.length ? 0 : -1); }, [query, available.length]);
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
      const addOpt = (opt: SelectOption) => {
        const next = [ ...(val ?? []), opt ];
        onChange(next);
      };
      const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { setOpen(true); return; }
        if (!open) return;
        if (e.key === 'Escape') { setOpen(false); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex >= 0) addOpt(filtered[activeIndex]); }
      };
      return (
        <div
          ref={containerRef}
          tabIndex={0}
          style={{ position: 'relative', minHeight: 26, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, font: 'inherit' }}
          onClick={(e) => { e.stopPropagation(); cancelClose(); setOpen(true); }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseEnter={cancelClose}
          onKeyDown={onKeyDown}
        >
          {(val ?? []).map((opt) => (
            <span key={opt.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 6px', borderRadius: 12, background: '#eef2ff', color: '#334155', fontSize: '0.9em' }}>
              {opt.label}
              <button
                title="移除"
                onClick={(e) => {
                  e.stopPropagation();
                  const next = (val ?? []).filter((v) => v.id !== opt.id);
                  onChange(next);
                }}
                style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer' }}
              >×</button>
            </span>
          ))}
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
                    return (
                      <div
                        key={opt.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onDoubleClick={(e) => { e.stopPropagation(); addOpt(opt); }}
                        onClick={(e) => { e.stopPropagation(); addOpt(opt); }}
                        onMouseEnter={() => setActiveIndex(vi.index)}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)`, height: vi.size, padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: isActive ? '#f1f5f9' : 'transparent' }}
                      >
                        <span>{opt.label}</span>
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
    };
    return <MultiSelectControl val={value ?? []} onChange={(v) => onChange(v)} />;
  }
  if (type === 'relation') {
    return (
      <input
        className="sheet-input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="关联记录ID"
        autoFocus
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
    );
  }
  if (type === 'user') {
    const userOptions: SelectOption[] = mockUsers.map((u) => ({ id: u.id, label: u.name }));
    const SingleSelectControl: React.FC<{ val: SelectOption | null; onChange: (v: SelectOption | null) => void; showAvatar?: boolean }> = ({ val, onChange, showAvatar }) => {
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
      const filtered = userOptions.filter((o) => (o.label ?? '').toLowerCase().includes(query.toLowerCase()));
      const [activeIndex, setActiveIndex] = useState<number>(-1);
      useEffect(() => {
        if (open) {
          if (val) {
            const idx = filtered.findIndex((o) => o.id === val.id);
            setActiveIndex(idx >= 0 ? idx : (filtered.length > 0 ? 0 : -1));
          } else {
            setActiveIndex(filtered.length > 0 ? 0 : -1);
          }
        }
      }, [open, val, query]);
      const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!open) {
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            cancelClose();
            setOpen(true);
          }
          return;
        }
        if (['ArrowDown','ArrowUp','Enter','Escape'].includes(e.key)) e.preventDefault();
        if (e.key === 'ArrowDown') {
          setActiveIndex((i) => Math.min((i < 0 ? 0 : i) + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
          setActiveIndex((i) => Math.max((i < 0 ? 0 : i) - 1, 0));
        } else if (e.key === 'Enter') {
          if (activeIndex >= 0 && filtered[activeIndex]) {
            onChange(filtered[activeIndex]);
            setOpen(false);
          }
        } else if (e.key === 'Escape') {
          setOpen(false);
        }
      };
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
      const initials = (txt: string) => {
        const s = (txt || '').trim();
        if (!s) return '';
        const parts = s.split(/\s+/);
        const first = parts[0]?.[0] ?? '';
        const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
        return (first + last).toUpperCase();
      };
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
          {val ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#e2e8f0', color: '#334155', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                {initials(val.label)}
              </span>
              <span>{val.label}</span>
              <button
                title="清除"
                onClick={(e) => { e.stopPropagation(); onChange(null); }}
                style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer' }}
              >×</button>
            </span>
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
                  placeholder="搜索用户..."
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
                    return (
                      <div
                        key={opt.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onDoubleClick={(e) => { e.stopPropagation(); onChange(opt); setOpen(false); }}
                        onClick={(e) => { e.stopPropagation(); onChange(opt); setOpen(false); }}
                        onMouseEnter={() => setActiveIndex(vi.index)}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)`, height: vi.size, padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: isActive ? '#f1f5f9' : 'transparent' }}
                      >
                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#e2e8f0', color: '#334155', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                          {initials(opt.label)}
                        </span>
                        <span>{opt.label}</span>
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
    };
    const current = value ? userOptions.find((o) => o.id === value.id) ?? null : null;
    return <SingleSelectControl val={current} onChange={(v) => onChange(v ? { id: v.id, name: v.label } as any : null)} showAvatar />;
  }
  return <span />;
}

export default function App() {
  const { show } = useToast();
  const [activeNav, setActiveNav] = useState<string>('table');
  const [activeTableId, setActiveTableId] = useState<string>('tbl-1');

  const [views, setViews] = useState<View[]>([
    { id: 'view-1', name: '视图1', protect: 'public' },
    { id: 'view-2', name: '视图2', protect: 'public' },
  ]);
  const [activeViewId, setActiveViewId] = useState<string>('view-1');
  const [protectOpen, setProtectOpen] = useState(false);

  const [rowHeight, setRowHeight] = useState<'low' | 'medium' | 'high' | 'xhigh'>('medium');
  const [freezeCount, setFreezeCount] = useState<number>(0);
  const colWidth = 160;
  const [fieldDrawerOpen, setFieldDrawerOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);


  // Column meta (header names & types)
  const initialColumnMeta: Record<string, { name: string; type: string; description?: string; options?: SelectOption[]; formula?: FormulaConfig; format?: NumberFormat }> = {
    id: { name: 'ID', type: 'text', description: '' },
    text: { name: '文本', type: 'text', description: '' },
    number: { name: '数字', type: 'number', description: '', format: { decimals: 0, thousand: false } },
    date: { name: '日期', type: 'date', description: '' },
    select: { name: '选择', type: 'single', description: '', options: initialOptions },
    multiSelect: { name: '多选', type: 'multi', description: '', options: initialOptions },
    relation: { name: '关联', type: 'text', description: '' },
    user: { name: '用户', type: 'user', description: '' },
  };
  // 表级状态映射，支持不同数据表切换加载各自结构与数据
  type TableState = {
    data: RowRecord[];
    columnMeta: Record<string, { name: string; type: string; description?: string; options?: SelectOption[]; formula?: FormulaConfig; format?: NumberFormat }>;
    columnOrder: string[];
    columnVisibility: Record<string, boolean>;
    sorting: SortingState;
  };
  const [tables, setTables] = useState<Record<string, TableState>>(() => ({
    'tbl-1': {
      data: generateMockRows(200),
      columnMeta: initialColumnMeta,
      columnOrder: Object.keys(initialColumnMeta),
      columnVisibility: {},
      sorting: [],
    },
  }));
  const currentTable: TableState = tables[activeTableId] ?? tables['tbl-1'];
  const data = currentTable.data;
  const columnMeta = currentTable.columnMeta;
  const columnOrder = currentTable.columnOrder;
  const columnVisibility = currentTable.columnVisibility;
  const sorting = currentTable.sorting;

  // 包装器：以当前 activeTableId 更新表级状态
  const setData = (updater: React.SetStateAction<RowRecord[]>) => {
    setTables(prev => {
      const id = activeTableId in prev ? activeTableId : 'tbl-1';
      const curr = prev[id];
      const nextData = typeof updater === 'function' ? (updater as (d: RowRecord[]) => RowRecord[])(curr.data) : updater;
      return { ...prev, [id]: { ...curr, data: nextData } };
    });
  };
  const setColumnMeta = (updater: React.SetStateAction<Record<string, { name: string; type: string; description?: string; options?: SelectOption[]; formula?: FormulaConfig; format?: NumberFormat }>>) => {
    setTables(prev => {
      const id = activeTableId in prev ? activeTableId : 'tbl-1';
      const curr = prev[id];
      const next = typeof updater === 'function' ? (updater as (m: typeof curr.columnMeta) => typeof curr.columnMeta)(curr.columnMeta) : updater;
      return { ...prev, [id]: { ...curr, columnMeta: next } };
    });
  };
  const setColumnOrder = (updater: React.SetStateAction<string[]>) => {
    setTables(prev => {
      const id = activeTableId in prev ? activeTableId : 'tbl-1';
      const curr = prev[id];
      const next = typeof updater === 'function' ? (updater as (o: string[]) => string[])(curr.columnOrder) : updater;
      return { ...prev, [id]: { ...curr, columnOrder: next } };
    });
  };
  const setColumnVisibility = (updater: React.SetStateAction<Record<string, boolean>>) => {
    setTables(prev => {
      const id = activeTableId in prev ? activeTableId : 'tbl-1';
      const curr = prev[id];
      const next = typeof updater === 'function' ? (updater as (v: Record<string, boolean>) => Record<string, boolean>)(curr.columnVisibility) : updater;
      return { ...prev, [id]: { ...curr, columnVisibility: next } };
    });
  };
  const setSorting = (updater: React.SetStateAction<SortingState>) => {
    setTables(prev => {
      const id = activeTableId in prev ? activeTableId : 'tbl-1';
      const curr = prev[id];
      const next = typeof updater === 'function' ? (updater as (s: SortingState) => SortingState)(curr.sorting) : updater;
      return { ...prev, [id]: { ...curr, sorting: next } };
    });
  };

  // 当切换到新的表 ID 时，初始化其默认结构与数据
  useEffect(() => {
    setTables(prev => {
      if (activeTableId in prev) return prev;
      return {
        ...prev,
        [activeTableId]: {
          data: generateMockRows(100),
          columnMeta: initialColumnMeta,
          columnOrder: Object.keys(initialColumnMeta),
          columnVisibility: {},
          sorting: [],
        },
      };
    });
  }, [activeTableId]);
  const [columnColors, setColumnColors] = useState<Record<string, string>>({});
  // 选中单元格：仅选中时进入编辑态，其它保持展示态
  const [selectedCell, setSelectedCell] = useState<{ rowId: string | null; columnId: string | null }>({ rowId: null, columnId: null });
  const [editingCell, setEditingCell] = useState<{ rowId: string | null; columnId: string | null }>({ rowId: null, columnId: null });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectionRange, setSelectionRange] = useState<{ start: { row: number; col: number } | null; end: { row: number; col: number } | null }>({ start: null, end: null });

  const columnItems: ColumnItem[] = useMemo(() => (
    columnOrder.filter((id) => !!columnMeta[id]).map((id) => ({ id, name: columnMeta[id].name, type: columnMeta[id].type }))
  ), [columnMeta, columnOrder]);

  // 为逻辑函数提供的列类型映射（统一为 utils/logic 需要的类型名）
  const logicColumnMeta = useMemo(() => {
    const mapType = (t: string) => (t === 'single' ? 'select' : t === 'multi' ? 'multiSelect' : t === 'formula' ? 'number' : t);
    return Object.fromEntries(Object.entries(columnMeta).map(([id, m]) => [id, { type: mapType(m.type) }]));
  }, [columnMeta]);
  const visibleCount = useMemo(() => Object.keys(columnMeta).filter((id) => columnVisibility[id] !== false).length, [columnMeta, columnVisibility]);

  useEffect(() => {
    if (freezeCount > visibleCount) {
      setFreezeCount(Math.max(0, visibleCount));
    }
  }, [freezeCount, visibleCount]);

  const hasHidden = useMemo(() => Object.values(columnVisibility).some((v) => v === false), [columnVisibility]);
  const hiddenToastShownRef = useRef(false);
  const onlyFrozenToastShownRef = useRef(false);
  // 过滤条件（支持条件组）
  const [activeGroup, setActiveGroup] = useState<ConditionGroup | null>(null);
  // 颜色规则读取
  const rules = useColorRulesStore((s) => s.rules);
  // 过滤后的数据
  const filteredData = useMemo(() => (
    !activeGroup ? data : data.filter((r) => matchesGroup(r, activeGroup, logicColumnMeta))
  ), [data, activeGroup, logicColumnMeta]);
  // 单元格背景色（综合规则与列基础色）
  const getCellBg = (row: RowRecord, columnId: string): string | undefined => {
    const { cellBg, rowBg } = applyColorBackground(rules, row, columnId, columnColors, logicColumnMeta);
    return cellBg ?? rowBg;
  };

  useEffect(() => {
     if (hasHidden && !hiddenToastShownRef.current) {
       show('已隐藏部分字段，可在字段菜单或工具栏恢复', 'info', { actionLabel: '显示已隐藏字段', onAction: showAllHidden });
       hiddenToastShownRef.current = true;
     } else if (!hasHidden && hiddenToastShownRef.current) {
       hiddenToastShownRef.current = false;
     }
   }, [hasHidden]);
   useEffect(() => {
    const onlyFrozen = visibleCount > 0 && visibleCount <= freezeCount;
    if (onlyFrozen && !onlyFrozenToastShownRef.current) {
      show('仅展示冻结列，已隐藏所有非冻结列', 'info', { actionLabel: '显示已隐藏字段', onAction: showAllHidden });
      onlyFrozenToastShownRef.current = true;
    } else if (!onlyFrozen && onlyFrozenToastShownRef.current) {
      onlyFrozenToastShownRef.current = false;
    }
  }, [visibleCount, freezeCount]);
  const columns = useMemo<ColumnDef<RowRecord, any>[]>(() => {
    const normalizeType = (t: string) => (t === 'single' ? 'select' : t === 'multi' ? 'multiSelect' : t);
    const getNumeric = (v: any): number => {
      if (v == null) return 0;
      if (typeof v === 'number' && !Number.isNaN(v)) return v;
      if (typeof v === 'string') {
        const n = parseFloat(v);
        return Number.isNaN(n) ? 0 : n;
      }
      return 0;
    };
    const computeFormula = (row: any, cfg?: FormulaConfig): number | '' => {
      if (!cfg || !Array.isArray(cfg.fields) || cfg.fields.length === 0) return '';
      const values = cfg.fields.map((fid) => getNumeric((row as any)[fid]));
      switch (cfg.op) {
        case 'sum':
          return values.reduce((acc, n) => acc + n, 0);
        case 'avg':
          return values.length === 0 ? '' : values.reduce((acc, n) => acc + n, 0) / values.length;
        case 'max':
          return values.length === 0 ? '' : Math.max(...values);
        case 'min':
          return values.length === 0 ? '' : Math.min(...values);
        case 'add': {
          const a = values[0] ?? 0; const b = values[1] ?? 0; return a + b;
        }
        case 'sub': {
          const a = values[0] ?? 0; const b = values[1] ?? 0; return a - b;
        }
        case 'mul': {
          const a = values[0] ?? 0; const b = values[1] ?? 0; return a * b;
        }
        case 'div': {
          const a = values[0] ?? 0; const b = values[1] ?? 0; return b === 0 ? '' : a / b;
        }
        default:
          return '';
      }
    };
    const formatNumber = (val: number | ''): string => {
      if (val === '') return '';
      const fmt = (columnMeta as any)[currentFormattingColumnId]?.formula?.format as { decimals: number; thousand: boolean } | undefined;
      // 上面依赖当前列上下文，实际在 cell 中再按列取配置
      return String(val);
    };
    const makeDef = (id: string): ColumnDef<RowRecord, any> | null => {
      if (!(id in columnMeta)) return null;
      const meta = columnMeta[id];
      const t = normalizeType(meta.type);
      if (id === 'id') {
        return { id, header: () => meta.name, accessorKey: 'id', cell: (info) => info.getValue() };
      }
      if (t === 'formula') {
        return {
          id,
          header: () => meta.name,
          accessorFn: (row) => computeFormula(row, columnMeta[id]?.formula),
          cell: ({ getValue }) => {
            const raw = getValue() as number | '';
            const fmt = columnMeta[id]?.formula?.format;
            if (raw === '') return <span />;
            const decimals = fmt?.decimals ?? 0;
            const thousand = !!fmt?.thousand;
            if (thousand) {
              const formatted = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(raw as number);
              return <span>{formatted}</span>;
            }
            return <span>{decimals > 0 ? (raw as number).toFixed(decimals) : String(raw)}</span>;
          }
        } as ColumnDef<RowRecord, any>;
      }
      const editorType = (['text','number','date','select','multiSelect','relation','user'] as const).includes(t as any) ? (t as any) : 'text';
      const renderDisplay = (val: any) => {
        if (editorType === 'text') return <span>{val ?? ''}</span>;
        if (editorType === 'number') {
          const fmt = (columnMeta as any)[id]?.format as NumberFormat | undefined;
          const raw = val as number | '';
          if (raw === '' || raw === null || raw === undefined) return <span />;
          const decimals = fmt?.decimals ?? 0;
          const thousand = !!fmt?.thousand;
          if (thousand) {
            const formatted = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(raw as number);
            return <span>{formatted}</span>;
          }
          return <span>{decimals > 0 ? (raw as number).toFixed(decimals) : String(raw)}</span>;
        }
        if (editorType === 'date') {
          const v = val ? dayjs(val).format('YYYY-MM-DD') : '';
          return <span>{v}</span>;
        }
        if (editorType === 'select') return <span>{val?.label ?? ''}</span>;
        if (editorType === 'multiSelect') return <span>{Array.isArray(val) ? val.map((m: any) => m?.label).filter(Boolean).join(', ') : ''}</span>;
        if (editorType === 'relation') return <span>{val ?? ''}</span>;
        if (editorType === 'user') return <span>{val?.name ?? ''}</span>;
        return <span>{val ?? ''}</span>;
      };
      return {
        id,
        header: () => meta.name,
        accessorKey: id,
        cell: ({ row, getValue }) => {
          const isSelected = selectedCell.rowId === row.original.id && selectedCell.columnId === id;
          const val = getValue();
          if (!isSelected || !(editingCell.rowId === row.original.id && editingCell.columnId === id)) {
            return renderDisplay(val);
          }
          return (
            <CellEditor
              type={editorType}
              value={val}
              options={(editorType === 'select' || editorType === 'multiSelect') ? (columnMeta[id]?.options ?? initialOptions) : undefined}
              onChange={(v) => {
                row._valuesCache = undefined; // bust cache
                setData((prev) => prev.map((r) => (r.id === row.original.id ? { ...r, [id]: v } : r)));
              }}
            />
          );
        }
      } as ColumnDef<RowRecord, any>;
    };
    return columnOrder.map((id) => makeDef(id)).filter(Boolean) as ColumnDef<RowRecord, any>[];
  }, [columnMeta, columnOrder, setData, selectedCell, editingCell]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Virtual rows
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ({ low: 28, medium: 40, high: 56, xhigh: 72 }[rowHeight]),
    overscan: 10,
  });

  // 键盘导航与编辑触发
  const moveSelection = (dRow: number, dCol: number) => {
    const rows = table.getRowModel().rows;
    const cols = columns;
    const currRowIdx = Math.max(0, rows.findIndex((r) => r.original.id === selectedCell.rowId));
    const currColIdx = Math.max(0, cols.findIndex((c: any) => c.id === selectedCell.columnId));
    const nextRowIdx = Math.min(Math.max(currRowIdx + dRow, 0), rows.length - 1);
    const nextColIdx = Math.min(Math.max(currColIdx + dCol, 0), cols.length - 1);
    const nextRowId = rows[nextRowIdx]?.original.id ?? null;
    const nextColId = (cols[nextColIdx] as any)?.id ?? null;
    setSelectedCell({ rowId: nextRowId, columnId: nextColId });
    setEditingCell({ rowId: null, columnId: null });
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 编辑中不拦截导航键
    if (editingCell.rowId && editingCell.columnId) return;
    if (!selectedCell.rowId || !selectedCell.columnId) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1, 0); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1, 0); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); moveSelection(0, -1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); moveSelection(0, 1); }
    else if (e.key === 'Enter') { e.preventDefault(); setEditingCell({ ...selectedCell }); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const isShift = e.shiftKey;
      if (isShift) moveSelection(0, -1); else moveSelection(0, 1);
    }
  };
  const isInRange = (rowIdx: number, colIdx: number): boolean => {
    if (!selectionRange.start || !selectionRange.end) return false;
    const r1 = Math.min(selectionRange.start.row, selectionRange.end.row);
    const r2 = Math.max(selectionRange.start.row, selectionRange.end.row);
    const c1 = Math.min(selectionRange.start.col, selectionRange.end.col);
    const c2 = Math.max(selectionRange.start.col, selectionRange.end.col);
    return rowIdx >= r1 && rowIdx <= r2 && colIdx >= c1 && colIdx <= c2;
  };

  // Export
  const handleExport = () => {
    const header = ['text', 'number', 'date', 'select', 'multiSelect', 'relation', 'user'];
    const rows = data.map((r) => [
      r.text,
      r.number,
      dayjs(r.date).format('YYYY-MM-DD'),
      r.select?.label ?? '',
      r.multiSelect.map((m) => m.label).join(','),
      r.relation ?? '',
      r.user?.name ?? '',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'export.xlsx');
  };
  // 新增：导入处理（由 Toolbar 触发，已解析为行数据）
  const onImport = (rows: RowRecord[]) => {
    setData(rows);
    show('已导入 Excel 数据', 'success');
  };

  const onAddRecord = () => {
    setData((prev) => [{
      id: `rec-${prev.length + 1}`,
      text: '', number: 0, date: dayjs().toISOString(), select: null, multiSelect: [], relation: null, user: null,
    }, ...prev]);
  };

  const onColumnsChange = (cols: ColumnItem[]) => {
    setColumnMeta((meta) => {
      const next = { ...meta };
      cols.forEach((c) => {
        if (c.id === 'id' && !(['text','date','number'] as string[]).includes(c.type)) {
          next[c.id] = { name: c.name, type: 'text', description: next[c.id]?.description };
        } else {
          next[c.id] = { name: c.name, type: c.type, description: next[c.id]?.description };
        }
      });
      return next;
    });
    // 保持当前顺序不变
  };

  const onEditField = (id: string) => { setEditingFieldId(id); setFieldDrawerOpen(true); };
  const onHideField = (id: string) => {
    setColumnVisibility((v) => {
      const next = { ...v, [id]: false };
      const nextVisibleCount = Object.keys(columnMeta).filter((cid) => next[cid] !== false).length;
      if (nextVisibleCount === 0) {
        show('至少保留一个可见列', 'warning');
        return v;
      }
      show(`已隐藏字段：${columnMeta[id]?.name ?? id}`, 'info', { actionLabel: '显示已隐藏字段', onAction: showAllHidden });
      return next;
    });
  };
  // 新增：切换字段显示/隐藏
  const onToggleFieldVisibility = (id: string) => {
    setColumnVisibility((v) => {
      const isVisible = v[id] !== false;
      if (isVisible) {
        const next = { ...v, [id]: false };
        const nextVisibleCount = Object.keys(columnMeta).filter((cid) => next[cid] !== false).length;
        if (nextVisibleCount === 0) {
          show('至少保留一个可见列', 'warning');
          return v;
        }
        show(`已隐藏字段：${columnMeta[id]?.name ?? id}`, 'info', { actionLabel: '显示已隐藏字段', onAction: showAllHidden });
        return next;
      } else {
        const next = { ...v, [id]: true };
        return next;
      }
    });
  };
  const onDeleteField = (id: string) => {
    if (id === 'id') { show('不可删除 ID 字段', 'warning'); return; }
    setColumnMeta((prev) => {
      const next = { ...prev } as Record<string, { name: string; type: string; description?: string }>;
      delete next[id];
      return next;
    });
    setColumnOrder((order) => order.filter((x) => x !== id));
    setColumnVisibility((v) => {
      const { [id]: _, ...rest } = v;
      return rest;
    });
    setSorting((s) => s.filter((x) => x.id !== id));
  };
  const onInsertLeft = (id: string) => {
    setColumnOrder((order) => {
      const idx = order.indexOf(id);
      if (idx <= 0) return order;
      const next = [...order];
      next.splice(idx, 1);
      next.splice(idx - 1, 0, id);
      return next;
    });
  };
  const onInsertRight = (id: string) => {
    setColumnOrder((order) => {
      const idx = order.indexOf(id);
      if (idx < 0 || idx >= order.length - 1) return order;
      const next = [...order];
      next.splice(idx, 1);
      next.splice(idx + 1, 0, id);
      return next;
    });
  };
  const onDuplicateField = (id: string) => { show('当前版本为固定字段集，复制字段暂不支持', 'info'); };
  const onFillColorColumn = (columnId: string, color: string) => {
    setColumnColors((prev) => ({ ...prev, [columnId]: color }));
    show('整列填色已应用', 'success');
  };

  const showAllHidden = () => setColumnVisibility({});

  // Tabs actions
  const addView = () => {
    const n = views.length + 1;
    setViews((prev) => [...prev, { id: `view-${n}`, name: `视图${n}`, protect: 'public' }]);
  };
  const renameView = (id: string, name: string) => setViews((v) => v.map((x) => x.id === id ? { ...x, name } : x));
  const duplicateView = (id: string) => {
    const src = views.find((v) => v.id === id);
    if (!src) return;
    setViews((prev) => [...prev, { ...src, id: `view-${prev.length + 1}`, name: `${src.name} 副本` }]);
  };
  const deleteView = (id: string) => {
    if (id === 'view-1') return; // 保留至少一个视图
    setViews((prev) => prev.filter((v) => v.id !== id));
    if (activeViewId === id) setActiveViewId('view-1');
  };
  const openProtect = (id: string) => {
    setActiveViewId(id);
    setProtectOpen(true);
  };
  const currentProtect = views.find(v => v.id === activeViewId)?.protect ?? 'public';

  const setProtectMode = (m: 'public' | 'locked' | 'personal') => {
    setViews((prev) => prev.map((v) => v.id === activeViewId ? { ...v, protect: m } : v));
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar active={activeNav} onNavigate={setActiveNav} onSelectTable={setActiveTableId} />

      <div style={{ flex: 1, minWidth: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* 顶部：视图标签 */}
        <div style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tabs
            views={views}
            activeId={activeViewId}
            onSelect={setActiveViewId}
            onAdd={addView}
            onRename={renameView}
            onDuplicate={duplicateView}
            onDelete={deleteView}
            onProtectClick={openProtect}
          />
        </div>

        {/* 工具栏 */}
        {activeNav === 'table' && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
            <Toolbar
              columns={columnItems}
              onColumnsChange={onColumnsChange}
              rowHeight={rowHeight}
              onRowHeightChange={setRowHeight}
              onFilterOpen={() => setFilterOpen(true)}
              onColorOpen={() => setColorOpen(true)}
              onGroupOpen={() => show('分组占位', 'info')}
              onSortOpen={() => show('排序占位', 'info')}
              onShowAllHidden={showAllHidden}
              onAddRecord={onAddRecord}
              onImport={onImport}
              onExport={handleExport}
              columnVisibility={columnVisibility}
              onToggleFieldVisibility={onToggleFieldVisibility}
            />
          </div>
        )}

        {/* 内容区 */}
        <div style={{ padding: 12, overflow: 'hidden', flex: 1 }}>
          {activeNav === 'table' && (
            <div data-app-ready="1" style={{ overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length + 1}, ${colWidth}px)`, gap: 4, fontWeight: 600, borderBottom: '1px solid #ddd', paddingBottom: 6 }}>
                  {table.getFlatHeaders().map((header, idx) => (
                    <div key={header.id} onClick={header.column.getToggleSortingHandler()} style={{ cursor: 'pointer', position: idx < freezeCount ? 'sticky' : 'static', left: idx < freezeCount ? `${idx * colWidth}px` : undefined, zIndex: idx < freezeCount ? 5 : 1, background: idx < freezeCount ? '#f7faff' : undefined, width: `${colWidth}px` }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as 'asc' | 'desc'] ?? ''}
                      <HeaderMenu
                        columnId={header.column.id}
                        index={idx}
                        disabled={false}
                        disableHide={header.column.id === 'id'}
                        disableDelete={header.column.id === 'id'}
                        onFreezeTo={(n) => setFreezeCount(n)}
                        onSortAsc={(id) => setSorting([{ id, desc: false }])}
                        onSortDesc={(id) => setSorting([{ id, desc: true }])}
                        onEditField={onEditField}
                        onHideField={onHideField}
                        onDeleteField={onDeleteField}
                        onInsertLeft={onInsertLeft}
                        onInsertRight={onInsertRight}
                        onDuplicateField={onDuplicateField}
                        onFillColorColumn={onFillColorColumn}
                      />
                    </div>
                  ))}
                  {/* 新建字段按钮 - 最右侧 */}
                  <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                    <span
                      role="button"
                      title="新建字段"
                      onClick={() => {
                        const newId = `field-${Date.now()}`;
                        setEditingFieldId(newId);
                        setFieldDrawerOpen(true);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', padding: '4px' }}
                    >
                      +
                    </span>
                  </div>
                </div>
               {Object.values(columnVisibility).some((v) => v === false) && (
                 <div style={{ padding: '6px 0', fontSize: 12, color: '#666' }}>
                   已隐藏部分字段。<span role="button" style={{ color: '#2563eb', cursor: 'pointer' }} onClick={showAllHidden}>显示已隐藏字段</span>
                   {visibleCount > 0 && visibleCount <= freezeCount && (
                     <div style={{ marginTop: 4 }}>已隐藏所有非冻结列，仅展示冻结列。</div>
                   )}
                 </div>
               )}
              
              <div
                ref={parentRef}
                className="sheet-grid"
                style={{ height: 'calc(100vh - 220px)', overflowY: 'auto', position: 'relative', border: '1px solid #eee', marginTop: 8, minWidth: `${(columns.length + 1) * colWidth}px` }}
                tabIndex={0}
                onKeyDown={onKeyDown}
                onMouseUp={() => { setIsDragging(false); }}
              >
                <div style={{ height: rowVirtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = table.getRowModel().rows[virtualRow.index]!;
                    return (
                      <div
                        key={row.id}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        className="sheet-grid-row"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                          display: 'grid',
                          gridTemplateColumns: `repeat(${columns.length + 1}, ${colWidth}px)`,
                        }}
                      >
                          {row.getVisibleCells().map((cell, cIdx) => (
                           <div
                             key={cell.id}
                             className={`sheet-cell${cIdx < freezeCount ? ' frozen' : ''}${cIdx === freezeCount - 1 ? ' frozen-shadow' : ''}${(selectedCell.rowId === row.original.id && selectedCell.columnId === cell.column.id) ? ' is-selected' : ''}${isInRange(virtualRow.index, cIdx) ? ' is-range' : ''}`}
                             style={{
                               position: cIdx < freezeCount ? 'sticky' : 'static',
                               left: cIdx < freezeCount ? `${cIdx * colWidth}px` : undefined,
                               zIndex: cIdx < freezeCount ? 2 : 1,
                               background: cIdx < freezeCount ? '#fff' : getCellBg(row.original, cell.column.id),
                             }}
                             onClick={() => {
                               const isEditingThis = editingCell.rowId === row.original.id && editingCell.columnId === cell.column.id;
                               if (isEditingThis) {
                                 // 点击编辑中的单元格，不打断编辑
                                 return;
                               }
                               setSelectedCell({ rowId: row.original.id, columnId: cell.column.id });
                               setEditingCell({ rowId: null, columnId: null });
                               parentRef.current?.focus();
                             }}
                             onDoubleClick={() => {
                               setSelectedCell({ rowId: row.original.id, columnId: cell.column.id });
                               setEditingCell({ rowId: row.original.id, columnId: cell.column.id });
                               // 进入编辑时不抢夺焦点，允许输入控件获取焦点
                             }}
                             onMouseDown={(e) => {
                               if (e.button !== 0) return; // 仅左键
                               setIsDragging(true);
                               setSelectionRange({ start: { row: virtualRow.index, col: cIdx }, end: { row: virtualRow.index, col: cIdx } });
                               setSelectedCell({ rowId: row.original.id, columnId: cell.column.id });
                               setEditingCell({ rowId: null, columnId: null });
                             }}
                             onMouseEnter={() => {
                               if (!isDragging) return;
                               setSelectionRange((prev) => ({ start: prev.start, end: { row: virtualRow.index, col: cIdx } }));
                             }}
                           >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeNav === 'collect' && (
            <div style={{ padding: 24 }}>
              <h3>收集表</h3>
              <p>用于外部收集数据的表单设计区域（占位）。</p>
            </div>
          )}

          {activeNav === 'dashboard' && (
            <div style={{ padding: 24 }}>
              <h3>仪表盘</h3>
              <p>可视化图表与指标卡片布局（占位）。</p>
            </div>
          )}

          {activeNav === 'docs' && (
            <div style={{ padding: 24 }}>
              <h3>在线文档</h3>
              <p>文档编辑与协同（占位）。</p>
            </div>
          )}

          {activeNav === 'files' && (
            <div style={{ padding: 24 }}>
              <h3>文件夹</h3>
              <p>文件管理与预览（占位）。</p>
            </div>
          )}
        </div>
      </div>

      {/* 保护视图抽屉 */}
      <ProtectDrawer
        open={protectOpen}
        onClose={() => setProtectOpen(false)}
        mode={currentProtect}
        onModeChange={(m) => setProtectMode(m)}
      />
      <FieldDrawer
        open={fieldDrawerOpen}
        fieldId={editingFieldId}
        initialName={editingFieldId ? columnMeta[editingFieldId]?.name : ''}
        initialType={editingFieldId ? (columnMeta[editingFieldId]?.type as any) : 'text'}
        initialDescription={editingFieldId ? (columnMeta[editingFieldId]?.description ?? '') : ''}
        initialOptions={editingFieldId ? (columnMeta[editingFieldId]?.options ?? []) : []}
        initialFormula={editingFieldId ? (columnMeta[editingFieldId]?.formula) : undefined}
        initialNumberFormat={editingFieldId ? (columnMeta[editingFieldId]?.format) : undefined}
        availableFields={columnItems}
        disabledTypeEdit={editingFieldId === 'id'}
        onClose={() => { setFieldDrawerOpen(false); setEditingFieldId(null); }}
        onSave={({ id, name, type, description, options, formula, format }) => {
          const trimmed = (name || '').trim();
          if (!trimmed) {
            show('字段名称不能为空', 'warning');
            return;
          }
          const duplicate = Object.entries(columnMeta).some(([cid, meta]) => cid !== id && meta.name === trimmed);
          if (duplicate) {
            show('字段名称已存在', 'warning');
            return;
          }
          const normalizeType = (t: string) => (t === 'single' ? 'select' : t === 'multi' ? 'multiSelect' : t);
          const prevType = columnMeta[id]?.type;
          const prevOptions = (columnMeta[id]?.options ?? []);
          const nextOptions = (type === 'single' || type === 'multi') ? (options ?? prevOptions) : [];
          const isNew = !(id in columnMeta);
          setColumnMeta((prev) => {
            const next = { ...prev } as any;
            if (id === 'id' && !(['text','date','number'] as string[]).includes(type)) {
              next[id] = { name: trimmed, type: 'text', description };
            } else {
              const meta: any = { name: trimmed, type, description };
              if (type === 'single' || type === 'multi') {
                meta.options = options ?? prev[id]?.options ?? [];
              }
              if (type === 'formula') {
                meta.formula = formula ?? prev[id]?.formula ?? undefined;
              } else {
                if (meta.formula) delete meta.formula;
              }
              if (type === 'number') {
                meta.format = format ?? prev[id]?.format ?? { decimals: 0, thousand: false };
              } else {
                if (meta.format) delete meta.format;
              }
              next[id] = meta;
              if (!(type === 'single' || type === 'multi')) {
                // 清理非单选/多选的残留选项
                if (next[id] && 'options' in next[id]) delete next[id].options;
              }
            }
            return next;
          });
          if (isNew) {
            setColumnOrder((order) => [...order, id]);
            setColumnVisibility((v) => ({ ...v, [id]: true }));
            const t = normalizeType(type);
            if (t !== 'formula') {
              const defaultValue = t === 'text' ? ''
                : t === 'number' ? 0
                : t === 'date' ? dayjs().toISOString()
                : t === 'select' ? null
                : t === 'multiSelect' ? []
                : t === 'user' ? null
                : t === 'relation' ? null
                : '';
              setData((prev) => prev.map((r) => ({ ...r, [id]: defaultValue })));
            }
            show('已新增字段', 'success');
          } else if (prevType !== type) {
            const prevNorm = normalizeType(prevType ?? 'text');
            const nextNorm = normalizeType(type);
            if (prevNorm !== nextNorm) {
              if (nextNorm !== 'formula') {
                const defaultValue = nextNorm === 'text' ? ''
                  : nextNorm === 'number' ? 0
                  : nextNorm === 'date' ? dayjs().toISOString()
                  : nextNorm === 'select' ? null
                  : nextNorm === 'multiSelect' ? []
                  : nextNorm === 'user' ? null
                  : nextNorm === 'relation' ? null
                  : '';
                setData((prev) => prev.map((r) => ({ ...r, [id]: defaultValue })));
                show('类型切换：已根据新类型重置列值', 'info');
              } else {
                show('类型切换：公式列为只读，值由其他字段自动计算', 'info');
              }
            }
          } else {
            show('字段已更新', 'success');
          }
          // 当选项被删减时，清理当前数据中引用了已删除选项的值
          const removedIds = new Set(prevOptions.filter((o) => !nextOptions.some((n) => n.id === o.id)).map((o) => o.id));
          if (removedIds.size > 0) {
            const tnorm = normalizeType(type);
            setData((prev) => prev.map((r) => {
              const v: any = (r as any)[id];
              if (tnorm === 'select') {
                if (v && removedIds.has(v.id)) {
                  return { ...r, [id]: null } as any;
                }
              } else if (tnorm === 'multiSelect') {
                if (Array.isArray(v) && v.length > 0) {
                  const nv = v.filter((opt: SelectOption) => !removedIds.has(opt.id));
                  if (nv.length !== v.length) {
                    return { ...r, [id]: nv } as any;
                  }
                }
              }
              return r;
            }));
            show('选项删减：已清理无效选择', 'info');
          }
        }}
      />
      {filterOpen && (
        <ConditionBuilder
          open={filterOpen}
          columns={columnItems}
          onClose={() => setFilterOpen(false)}
          onApply={(group) => {
            const nextCount = data.filter((r) => matchesGroup(r, group, logicColumnMeta)).length;
            setActiveGroup(group);
            setFilterOpen(false);
            show(`筛选已应用，共 ${nextCount} 行`, 'success');
          }}
        />
      )}
      {colorOpen && (
        <ColorRulesDrawer
          open={colorOpen}
          columns={columnItems.filter((c) => columnVisibility[c.id] !== false)}
          onClose={() => setColorOpen(false)}
          onApplyColumnColor={onFillColorColumn}
        />
      )}
    </div>
  );
}
