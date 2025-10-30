import { useMemo, useState, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useColorRulesStore } from '../stores/colorRules';
import ConditionBuilder from './ConditionBuilder';
import type { ConditionGroup } from '../stores/colorRules';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ColumnItem } from '../types';

export type ColorRulesDrawerProps = {
  open: boolean;
  columns: ColumnItem[];
  onClose: () => void;
  onApplyColumnColor?: (columnId: string, color: string) => void;
};

const overlayStyle: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'flex-end', zIndex: 50,
};
const drawerStyle: CSSProperties = {
  width: '100%', maxHeight: '70vh', overflow: 'auto', background: 'var(--surface)', borderTopLeftRadius: 'var(--radius)', borderTopRightRadius: 'var(--radius)',
  boxShadow: 'var(--shadow)', padding: 'calc(var(--spacing) * 2)',
};

const palette: string[] = [
  '#FDE047', '#FCA5A5', '#F9A8D4', '#C4B5FD', '#93C5FD', '#86EFAC', '#FBCFE8',
  '#FEE2E2', '#E9D5FF', '#BFDBFE', '#D1FAE5', '#FEF9C3', '#FFE4E6', '#E0E7FF', '#E0F2FE', '#DCFCE7', '#F5D0FE', '#FED7AA', '#FDBA74', '#D6D3D1', '#F3F4F6', '#F5F5F4', '#E5E7EB', '#F4F1DE'
];

// 条件摘要（用于规则列表快速识别）
const opLabel: Record<string, string> = { eq: '等于', contains: '包含', gt: '大于', lt: '小于', isEmpty: '为空', notEmpty: '不为空' };
const summarize = (item: any, columns: ColumnItem[]): string => {
  if (!item) return '';
  if ('conditions' in item) {
    const inner = (item.conditions || []).map((c: any) => summarize(c, columns)).filter(Boolean).join(` ${item.operator} `);
    return `(${inner})`;
  }
  const colName = columns.find((c) => c.id === item.fieldId)?.name ?? item.fieldId;
  const label = opLabel[item.operator] ?? item.operator;
  if (item.operator === 'isEmpty' || item.operator === 'notEmpty') return `${colName} ${label}`;
  return `${colName} ${label} ${item.value ?? ''}`;
};

export function ColorRulesDrawer({ open, columns, onClose, onApplyColumnColor }: ColorRulesDrawerProps) {
  const addRule = useColorRulesStore((s) => s.addRule);
  const removeRule = useColorRulesStore((s) => s.removeRule);
  const moveUp = useColorRulesStore((s) => s.moveUp);
  const moveDown = useColorRulesStore((s) => s.moveDown);
  const toggleRule = useColorRulesStore((s) => s.toggleRule);
  const rules = useColorRulesStore((s) => s.rules);
  // 新增：复制与批量启用/禁用
  const duplicateRule = useColorRulesStore((s) => s.duplicateRule);
  const setAllEnabled = useColorRulesStore((s) => s.setAllEnabled);

  const defaultColId = useMemo(() => (columns[1]?.id ?? columns[0]?.id ?? 'text'), [columns]);
  const [columnId, setColumnId] = useState<string>(defaultColId);
  const [scope, setScope] = useState<'column' | 'row' | 'cell'>('column');
  const [selectedColor, setSelectedColor] = useState<string>(palette[0]);
  const [condOpen, setCondOpen] = useState(false);
  const [condGroup, setCondGroup] = useState<ConditionGroup | null>(null);
  // 搜索过滤：根据列名与条件摘要进行过滤
  const [filterText, setFilterText] = useState('');
  const displayRules = useMemo(() => {
    const lower = filterText.trim().toLowerCase();
    if (!lower) return rules;
    return rules.filter((r) => {
      const colName = columns.find((c) => c.id === r.columnId)?.name ?? r.columnId;
      const summary = r.condition ? summarize(r.condition, columns) : '';
      const hay = `${colName} ${summary}`.toLowerCase();
      return hay.includes(lower);
    });
  }, [rules, columns, filterText]);
  // 虚拟滚动：规则列表
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: displayRules.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 8,
  });

  if (!open) return null;

  const apply = () => {
    addRule({ scope, columnId, color: selectedColor, condition: condGroup ?? undefined });
    // 对整列填色：仅在无筛选条件时应用整列基础色；有条件时只对匹配结果着色
    if (scope === 'column' && !condGroup && onApplyColumnColor) {
      onApplyColumnColor(columnId, selectedColor);
    }
    onClose();
  };

  return (
    <>
      <div style={overlayStyle} onClick={onClose}>
        <div style={drawerStyle} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>填色规则</h3>
            <button onClick={onClose}>关闭</button>
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>选择颜色并应用到列/行/单元格。规则按顺序生效，后面的规则优先于前面。</div>

          <div style={{ display: 'grid', gridTemplateColumns: '160px 160px 1fr', gap: 12, marginTop: 16, alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6 }}>作用域</label>
              <select value={scope} onChange={(e) => setScope(e.target.value as any)}>
                <option value="column">整列</option>
                <option value="row">整行</option>
                <option value="cell">单元格</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6 }}>字段</label>
              <select value={columnId} onChange={(e) => setColumnId(e.target.value)}>
                {columns.map((col) => <option key={col.id} value={col.id}>{col.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6 }}>颜色</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6 }}>
                {palette.map((c) => (
                  <button key={c} onClick={() => setSelectedColor(c)} title={c}
                    style={{ height: 24, borderRadius: 4, border: selectedColor === c ? '2px solid #333' : '1px solid var(--border)', background: c }} />
                ))}
              </div>
            </div>
          </div>

          {/* 仅在选择“单元格”作用域时显示筛选条件 */}
          {scope === 'cell' && (
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>筛选条件</label>
              <div style={{ display: 'flex', gap: 'var(--spacing)', alignItems: 'center' }}>
                <button onClick={() => setCondOpen(true)}>设置筛选条件</button>
                {condGroup && <span style={{ color: 'var(--muted)' }}>已设置条件</span>}
                {condGroup && <button onClick={() => setCondGroup(null)}>清除条件</button>}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 'var(--spacing)' }}>
            <button onClick={apply}>应用</button>
            <button onClick={onClose}>取消</button>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>已保存规则（上为优先级低，下为优先级高）</div>
            <div style={{ display: 'flex', gap: 'var(--spacing)', marginBottom: 8 }}>
              <button onClick={() => setAllEnabled(true)}>全部启用</button>
              <button onClick={() => setAllEnabled(false)}>全部禁用</button>
            </div>
            {rules.length === 0 && <div style={{ color: 'var(--muted)' }}>暂无规则</div>}
            {/* 搜索框 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing)', marginBottom: 8 }}>
              <input
                aria-label="搜索规则"
                placeholder="搜索规则"
                value={filterText}
                onChange={(e) => setFilterText(e.currentTarget.value)}
                style={{ flex: '0 0 240px', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
              />
              {filterText && (
                <button onClick={() => setFilterText('')}>清除</button>
              )}
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                共 {rules.length} 条，匹配 {displayRules.length} 条
              </div>
              <div style={{ flex: 1 }} />
              <button onClick={() => setAllEnabled(true)}>全部启用</button>
              <button onClick={() => setAllEnabled(false)}>全部禁用</button>
            </div>
            {rules.length === 0 && <div style={{ color: 'var(--muted)' }}>暂无规则</div>}
            {rules.length > 0 && displayRules.length === 0 && (
              <div style={{ color: 'var(--muted)' }}>无匹配规则</div>
            )}
            {displayRules.length > 0 && (
               <div ref={parentRef} style={{ height: '40vh', overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                 <div style={{ height: rowVirtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                   {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const r = displayRules[virtualRow.index]!;
                     const idx = virtualRow.index;
                     const colName = columns.find((c) => c.id === r.columnId)?.name ?? r.columnId;
                     return (
                       <div
                         key={r.id}
                         data-index={virtualRow.index}
                         style={{
                           position: 'absolute',
                           top: 0,
                           left: 0,
                           width: '100%',
                           transform: `translateY(${virtualRow.start}px)`,
                           display: 'grid',
                           gridTemplateColumns: '32px 120px 1fr 320px',
                           gap: 'var(--spacing)',
                           alignItems: 'center',
                           padding: 'var(--spacing) var(--spacing)',
                           borderBottom: '1px solid var(--border)',
                           background: 'var(--surface)',
                         }}
                       >
                         <div style={{ color: 'var(--muted)' }}>#{idx + 1}</div>
                         <div style={{ color: '#555' }}>{r.scope === 'column' ? '整列' : r.scope === 'row' ? '整行' : '单元格'}</div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing)' }}>
                           <span>字段: {colName}</span>
                           <span style={{ width: 16, height: 16, borderRadius: 4, background: r.color, border: '1px solid var(--border)' }} />
                           {r.condition && <span style={{ fontSize: 12, color: 'var(--muted)' }}>含条件：{summarize(r.condition, columns)}</span>}
                         </div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing)', justifyContent: 'flex-end' }}>
                           <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                             <input type="checkbox" checked={r.enabled} onChange={() => toggleRule(r.id)} /> 启用
                           </label>
                           <button onClick={() => moveUp(r.id)} disabled={virtualRow.index === 0}>上移</button>
                           <button onClick={() => moveDown(r.id)} disabled={virtualRow.index === displayRules.length - 1}>下移</button>
                           <button onClick={() => duplicateRule(r.id)}>复制</button>
                           <button onClick={() => removeRule(r.id)}>删除</button>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
             )}
          </div>

          <div style={{ marginTop: 12, color: 'var(--muted)', fontSize: 12 }}>
            冲突策略：同一单元格颜色按规则顺序覆盖（下方更高），作用域优先级为 cell &gt; column &gt; row；行背景只由行规则决定。
          </div>
        </div>
      </div>
      {condOpen && (
        <ConditionBuilder
          open={condOpen}
          columns={columns}
          onClose={() => setCondOpen(false)}
          onApply={(group) => { setCondGroup(group); setCondOpen(false); }}
        />
      )}
    </>
  );
}

export default ColorRulesDrawer;