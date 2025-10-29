import React from 'react'
import type { ColumnItem } from '../types'

type Props = {
  open: boolean;
  onClose: () => void;
  columns: ColumnItem[];
  rows: any[];
}

const StatsModal: React.FC<Props> = ({ open, onClose, columns, rows }) => {
  const visibleColumns = columns.filter(c => c.id !== 'id');
  const numericColumns = visibleColumns.filter(c => c.type === 'number');

  const [groupBy, setGroupBy] = React.useState<string>('');

  const totals = React.useMemo(() => {
    const res: Record<string, { sum: number; avg: number }> = {};
    numericColumns.forEach(c => {
      let sum = 0;
      let count = 0;
      rows.forEach(r => {
        const v = (r as any)[c.id];
        if (typeof v === 'number') { sum += v; count += 1; }
      });
      res[c.name] = { sum, avg: count > 0 ? +(sum / count).toFixed(2) : 0 };
    });
    return res;
  }, [rows, numericColumns]);

  const grouped = React.useMemo(() => {
    if (!groupBy) return null;
    const map = new Map<string, { count: number }>();
    rows.forEach(r => {
      const key = String((r as any)[groupBy] ?? '未分组');
      map.set(key, { count: (map.get(key)?.count ?? 0) + 1 });
    });
    return Array.from(map.entries()).map(([k, v]) => ({ key: k, ...v }));
  }, [rows, groupBy]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 100 }} onClick={onClose}>
      <div style={{ position: 'absolute', left: '50%', top: '18%', transform: 'translateX(-50%)', background: '#fff', border: '1px solid #ddd', borderRadius: 'var(--radius)', padding: 16, width: 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>统计与聚合</div>
        <div style={{ marginBottom: 12 }}>总行数：{rows.length}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {Object.entries(totals).map(([name, v]) => (
            <div key={name} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
              <div style={{ fontWeight: 600 }}>{name}</div>
              <div>求和：{v.sum}</div>
              <div>平均：{v.avg}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label>按字段分组：</label>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="">（不分组）</option>
            {visibleColumns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {grouped && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>分组计数</div>
            <div>
              {grouped.map(g => (
                <div key={g.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f3f3' }}>
                  <span>{g.key}</span>
                  <span>{g.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}

export default StatsModal