import React, { useMemo, useState, useRef } from 'react'
import type { ColumnItem } from '../types';

type Props = {
  columns: ColumnItem[];
  onColumnsChange: (cols: ColumnItem[]) => void;
  rowHeight: 'low' | 'medium' | 'high' | 'xhigh';
  onRowHeightChange: (h: 'low' | 'medium' | 'high' | 'xhigh') => void;
  onFilterOpen: () => void;
  onColorOpen: () => void;
  onShowAllHidden?: () => void;
  onAddRecord: () => void;
  onImport?: (rows: any[]) => void;
  onExport?: () => void;
  // 新增：字段显示/隐藏控制
  columnVisibility?: Record<string, boolean | undefined>;
  onToggleFieldVisibility?: (id: string) => void;
  // 新增：基础操作（撤销、重做、查询、删除）
  onUndo?: () => void;
  onRedo?: () => void;
  onQuery?: () => void;
  onDelete?: () => void;
  // 新增：视图级查询（精确匹配）
  activeQuery?: string;
  onApplyQuery?: (q: string) => void;
  queryFocusTick?: number;
};

export const Toolbar: React.FC<Props> = ({ columns, onColumnsChange, rowHeight, onRowHeightChange, onFilterOpen, onColorOpen, onShowAllHidden, onAddRecord, onImport, onExport, columnVisibility, onToggleFieldVisibility, onUndo, onRedo, onQuery, onDelete, activeQuery, onApplyQuery, queryFocusTick }) => {
  const [fieldOpen, setFieldOpen] = useState(false)
  const [rowHeightOpen, setRowHeightOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ColumnItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('text')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const rowHeightRef = useRef<HTMLDivElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const fieldCloseTimerRef = useRef<number | null>(null)
  const queryInputRef = useRef<HTMLInputElement | null>(null)

  const typeOptions = useMemo(() => ['text', 'single', 'multi', 'user', 'number', 'date', 'attachment', 'formula', 'creator', 'modifier', 'created_at', 'updated_at'], [])

  const applyEdit = () => {
    if (!editTarget) return
    onColumnsChange(columns.map(c => c.id === editTarget.id ? { ...c, name: editName, type: editType } : c))
    setEditTarget(null)
  }

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimerRef.current = window.setTimeout(() => {
      setRowHeightOpen(false)
      closeTimerRef.current = null
    }, 150)
  }

  const cancelFieldClose = () => {
    if (fieldCloseTimerRef.current) {
      clearTimeout(fieldCloseTimerRef.current)
      fieldCloseTimerRef.current = null
    }
  }

  const scheduleFieldClose = () => {
    cancelFieldClose()
    fieldCloseTimerRef.current = window.setTimeout(() => {
      setFieldOpen(false)
      fieldCloseTimerRef.current = null
    }, 150)
  }

  // 查询输入聚焦（来自 Ctrl+F 或按钮触发）
  React.useEffect(() => {
    if (queryInputRef.current) {
      queryInputRef.current.focus();
      queryInputRef.current.select();
    }
  }, [queryFocusTick]);



  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0' }}>
      {/* 基础操作：撤销/重做/查询/删除 */}
      <button onClick={() => onUndo && onUndo()}>↶ 撤销</button>
      <button onClick={() => onRedo && onRedo()}>↷ 重做</button>
      <button onClick={() => onQuery ? onQuery() : onFilterOpen()}>🔍 查询</button>
      <button onClick={() => onDelete && onDelete()}>🗑️ 删除</button>

      {onImport && (
        <>
          <button onClick={() => fileRef.current?.click()}>📥 导入Excel</button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (evt) => {
                const data = evt.target?.result;
                if (!data) return;
                // 轻量解析：按行分割，实际项目中请使用xlsx库
                import('xlsx').then((XLSX) => {
                  const wb = XLSX.read(data as ArrayBuffer, { type: 'array' });
                  const ws = wb.Sheets[wb.SheetNames[0]];
                  const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                  const [, ...rows] = json;
                  onImport(rows);
                });
              };
              reader.readAsArrayBuffer(file);
              e.target.value = '';
            }}
          />
          <button onClick={() => onExport && onExport()}>📤 导出Excel</button>
        </>
      )}

      <button onClick={onAddRecord}>➕ 添加记录</button>

      <div style={{ position: 'relative' }} onMouseEnter={cancelFieldClose} onMouseLeave={scheduleFieldClose}>
        <button onClick={() => { cancelFieldClose(); setFieldOpen(!fieldOpen) }}>🧩 字段配置 ▾</button>
        {fieldOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 'var(--radius)', minWidth: 260, zIndex: 60, boxShadow: 'var(--shadow)' }}>
            {columns.map((c) => {
              const isVisible = (columnVisibility?.[c.id] !== false);
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing)' }}>
                  <span>{c.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing)' }}>
                    {/* 新增：隐藏/显示图标按钮 */}
                    {c.id !== 'id' ? (
                      <span
                        role="button"
                        title={isVisible ? '隐藏该字段' : '显示该字段'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onToggleFieldVisibility && onToggleFieldVisibility(c.id)}
                      >{isVisible ? '👁️' : '🙈'}</span>
                    ) : (
                      <span title="后台字段，固定隐藏" style={{ opacity: 0.5 }}>🔒</span>
                    )}
                    <span style={{ cursor: 'pointer' }} onClick={() => { setEditTarget(c); setEditName(c.name); setEditType(c.type); }}>···</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editTarget && (
        <div style={{ position: 'fixed', left: '50%', top: '20%', transform: 'translateX(-50%)', background: '#fff', border: '1px solid #ddd', borderRadius: 'var(--radius)', padding: 'calc(var(--spacing) * 2)', zIndex: 40, width: 420 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>编辑字段</div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, alignItems: 'center' }}>
            <div>标题</div>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} />
            <div>类型</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={editType} onChange={(e) => setEditType(e.target.value)}>
                {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button onClick={() => applyEdit()}>保存</button>
              <button onClick={() => setEditTarget(null)}>取消</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={onFilterOpen}>🔎 筛选</button>
      <button onClick={() => onShowAllHidden && onShowAllHidden()}>👁️ 显示隐藏字段</button>

      <div
        ref={rowHeightRef}
        style={{ position: 'relative' }}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <button onClick={() => { cancelClose(); setRowHeightOpen(!rowHeightOpen) }}>↕️ 行高 ▾</button>
        {rowHeightOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', zIndex: 60 }}>
            {(['low','medium','high','xhigh'] as const).map(h => (
              <div key={h} style={{ padding: 'var(--spacing)', cursor: 'pointer', fontWeight: rowHeight === h ? 700 : 400 }} onClick={() => { onRowHeightChange(h); cancelClose(); setRowHeightOpen(false); }}>
                {h}
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={onColorOpen}>🎨 填色</button>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <span title="分享">🔗</span>
        <span title="评论">💬</span>
      </div>
    </div>
  )
}

export default Toolbar