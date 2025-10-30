import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';

type Row = Record<string, any>;

type Props = {
  rows: Row[];
  columnMeta: Record<string, { type: string; name?: string }>;
  setData: (updater: (prev: Row[]) => Row[]) => void;
  startDateFieldId?: string;
  endDateFieldId?: string;
  onChangeDateFields?: (startId: string | null, endId?: string | null) => void;
};

export default function CalendarView({ rows, columnMeta, setData, startDateFieldId, endDateFieldId, onChangeDateFields }: Props) {
  const [month, setMonth] = useState(dayjs());

  const dateFields = useMemo(() => Object.entries(columnMeta).filter(([_, m]) => m.type === 'date').map(([id, m]) => ({ id, name: m.name ?? id })), [columnMeta]);
  const effectiveStart = useMemo(() => {
    if (startDateFieldId && columnMeta[startDateFieldId]?.type === 'date') return startDateFieldId;
    const first = dateFields.find((f) => f.id !== 'id');
    return first?.id;
  }, [startDateFieldId, columnMeta, dateFields]);

  const daysInMonth = month.daysInMonth();
  const firstDayOfMonth = month.startOf('month');
  const startWeekday = firstDayOfMonth.day(); // 0-6, Sunday=0

  const cells = useMemo(() => {
    const grid: { date: dayjs.Dayjs | null; rows: Row[] }[] = [];
    const total = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
    for (let i = 0; i < total; i++) {
      const dayOffset = i - startWeekday;
      const date = dayOffset >= 0 && dayOffset < daysInMonth ? firstDayOfMonth.add(dayOffset, 'day') : null;
      grid.push({ date, rows: [] });
    }
    if (effectiveStart) {
      const map = new Map<string, number>();
      grid.forEach((c, idx) => { if (c.date) map.set(c.date.format('YYYY-MM-DD'), idx); });
      rows.forEach((r) => {
        const val = r[effectiveStart];
        const d = val ? dayjs(val) : null;
        const key = d && d.isValid() ? d.format('YYYY-MM-DD') : null;
        if (key && map.has(key)) {
          const idx = map.get(key)!;
          grid[idx].rows.push(r);
        }
      });
    }
    return grid;
  }, [rows, effectiveStart, firstDayOfMonth, daysInMonth, startWeekday]);

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setMonth((m) => m.subtract(1, 'month'))}>上月</button>
        <div style={{ fontWeight: 700 }}>{month.format('YYYY年MM月')}</div>
        <button onClick={() => setMonth((m) => m.add(1, 'month'))}>下月</button>
        <div style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>开始日期字段:</span>
          <select
            value={effectiveStart ?? ''}
            onChange={(e) => onChangeDateFields?.(e.currentTarget.value || null, endDateFieldId ?? null)}
            style={{ padding: '4px 6px' }}
          >
            <option value="">未选择</option>
            {dateFields.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, padding: 12 }}>
        {['日','一','二','三','四','五','六'].map((w) => (
          <div key={w} style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>{w}</div>
        ))}
        {cells.map((c, i) => (
          <div key={i} style={{ border: '1px solid #eee', borderRadius: 6, minHeight: 120, padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 12, color: '#666' }}>{c.date ? c.date.format('D') : ''}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {c.rows.map((r) => (
                <div key={r.id} style={{ padding: '4px 6px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: 4 }}>
                  {String(r.text ?? r.title ?? r.id)}
                </div>
              ))}
              {c.rows.length === 0 && c.date && (
                <div style={{ fontSize: 12, color: '#aaa' }}>无事件</div>
              )}
              {!c.date && (
                <div style={{ fontSize: 12, color: '#ddd' }}>占位</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}