import React, { useMemo, useState, useRef } from 'react'
import type { ColumnItem } from '../types';
import { IconUndo, IconRedo, IconSearch, IconTrash, IconUpload, IconDownload, IconEye, IconLink, IconComment, IconPlus, IconSettings, IconFilter, IconHeight, IconPalette } from './Icons';

type Props = {
  columns: ColumnItem[];
  onColumnsChange: (cols: ColumnItem[]) => void;
  rowHeight: 'low' | 'medium' | 'high' | 'xhigh';
  onRowHeightChange: (h: 'low' | 'medium' | 'high' | 'xhigh') => void;
  onFilterOpen: () => void;
  onColorOpen: () => void;
  onShowAllHidden?: () => void;
  onAddRecord: () => void;
  onImport?: (payload: { fileName: string; sheetName: string; header: any[]; rows: any[][] }) => void;
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
  // 新增：分组与排序入口（用于兼容既有测试）
  onGroupOpen?: () => void;
  onSortOpen?: () => void;
  // 新增：新增字段入口（打开 FieldDrawer 创建字段）
  onCreateField?: () => void;
  // 新增：编辑字段入口（打开 FieldDrawer 编辑字段）
  onEditField?: (id: string) => void;
};

export const Toolbar: React.FC<Props> = ({ columns, onColumnsChange, rowHeight, onRowHeightChange, onFilterOpen, onColorOpen, onShowAllHidden, onAddRecord, onImport, onExport, columnVisibility, onToggleFieldVisibility, onUndo, onRedo, onQuery, onDelete, activeQuery: _activeQuery, onApplyQuery: _onApplyQuery, queryFocusTick, onGroupOpen, onSortOpen, onCreateField, onEditField }) => {
  const [fieldOpen, setFieldOpen] = useState(false)
  const [rowHeightOpen, setRowHeightOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const rowHeightRef = useRef<HTMLDivElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const fieldCloseTimerRef = useRef<number | null>(null)
  const queryInputRef = useRef<HTMLInputElement | null>(null)

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

  const iconColor = '#9e9e9e';

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0' }}>
      {/* 左侧：文本工具（缩小字体，横向排布） */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12 }}>
        <button onClick={onAddRecord}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IconPlus color={iconColor} />
            <span>添加记录</span>
          </span>
        </button>
        <div style={{ position: 'relative' }} onMouseEnter={cancelFieldClose} onMouseLeave={scheduleFieldClose}>
          <button onClick={() => { cancelFieldClose(); setFieldOpen(!fieldOpen) }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconSettings color={iconColor} />
              <span>字段配置 ▾</span>
            </span>
          </button>
          {fieldOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 'var(--radius)', minWidth: 260, zIndex: 60, boxShadow: 'var(--shadow)' }}>
              {/* 新增字段入口 */}
              {onCreateField && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing)', borderBottom: '1px solid #eee' }}>
                  <span style={{ fontWeight: 600 }}>新增字段</span>
                  <button onClick={() => { onCreateField(); setFieldOpen(false); }} style={{ fontSize: 12 }}>+ 新建</button>
                </div>
              )}
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
                        >
                          {isVisible ? <IconEye color={iconColor} /> : <IconEye color={iconColor} style={{ opacity: 0.4 }} />}
                        </span>
                      ) : (
                        <span title="后台字段，固定隐藏" style={{ opacity: 0.5 }}>🔒</span>
                      )}
                      <span style={{ cursor: 'pointer' }} onClick={() => { onEditField && onEditField(c.id); setFieldOpen(false); }}>···</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <button onClick={onFilterOpen}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IconFilter color={iconColor} />
            <span>筛选</span>
          </span>
        </button>
        {onSortOpen && (
          <button onClick={onSortOpen}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconFilter color={iconColor} />
              <span>排序</span>
            </span>
          </button>
        )}
        <div
          ref={rowHeightRef}
          style={{ position: 'relative' }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <button onClick={() => { cancelClose(); setRowHeightOpen(!rowHeightOpen) }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconHeight color={iconColor} />
              <span>行高 ▾</span>
            </span>
          </button>
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
        <button onClick={onColorOpen}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IconPalette color={iconColor} />
            <span>填色</span>
          </span>
        </button>
      </div>

      {/* 右侧：图标工具（浅灰色，仅图标，悬停显示名称） */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
        {onUndo && (
          <span role="button" title="撤销" onClick={() => onUndo()} style={{ cursor: 'pointer' }}>
            <IconUndo color={iconColor} />
          </span>
        )}
        {onRedo && (
          <span role="button" title="重做" onClick={() => onRedo()} style={{ cursor: 'pointer' }}>
            <IconRedo color={iconColor} />
          </span>
        )}
        <span role="button" title="查询" onClick={() => onQuery ? onQuery() : onFilterOpen()} style={{ cursor: 'pointer' }}>
          <IconSearch color={iconColor} />
        </span>
        {onDelete && (
          <span role="button" title="删除" onClick={() => onDelete()} style={{ cursor: 'pointer' }}>
            <IconTrash color={iconColor} />
          </span>
        )}
        {onImport && (
          <>
            <span role="button" title="导入Excel" onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer' }}>
              <IconUpload color={iconColor} />
            </span>
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
                  import('xlsx').then((XLSX) => {
                    const wb = XLSX.read(data, { type: 'binary' });
                    const sheetName = wb.SheetNames[0];
                    const sheet = wb.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[];
                    const header = (json[0] ?? []) as any[];
                    const rows = (json.slice(1) ?? []) as any[][];
                    onImport?.({ fileName: file.name, sheetName, header, rows });
                  });
                };
                reader.readAsBinaryString(file);
              }}
            />
          </>
        )}
        {onExport && (
          <span role="button" title="导出Excel" onClick={() => onExport()} style={{ cursor: 'pointer' }}>
            <IconDownload color={iconColor} />
          </span>
        )}
        {onShowAllHidden && (
          <button aria-label="显示隐藏字段" title="显示隐藏字段" onClick={() => onShowAllHidden()} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
            <IconEye color={iconColor} />
          </button>
        )}
        <span role="button" title="复制链接" style={{ cursor: 'pointer' }}>
          <IconLink color={iconColor} />
        </span>
        <span role="button" title="评论" style={{ cursor: 'pointer' }}>
          <IconComment color={iconColor} />
        </span>
      </div>
    </div>
  )
}

export default Toolbar