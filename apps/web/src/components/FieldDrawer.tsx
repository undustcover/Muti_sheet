import React, { useEffect, useState } from 'react';
import type { FieldType, FormulaOp, FormulaConfig, SelectOption } from '../types';

type Props = {
  open: boolean;
  fieldId: string | null;
  initialName?: string;
  initialType?: FieldType;
  initialDescription?: string;
  initialOptions?: SelectOption[];
  initialFormula?: FormulaConfig;
  initialNumberFormat?: { decimals: number; thousand: boolean };
  availableFields?: { id: string; name: string; type: string }[];
  disabledTypeEdit?: boolean; // e.g. lock type when protect mode or first column rules
  limitTypesTo?: FieldType[]; // 限制可选类型列表（例如：首字段仅限 文本/数字/日期/公式）
  onClose: () => void;
  onSave: (payload: { id: string; name: string; type: FieldType; description?: string; options?: SelectOption[]; formula?: FormulaConfig; format?: { decimals: number; thousand: boolean } }) => void;
};

const typeOptions: { value: FieldType; label: string }[] = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'single', label: '选择' },
  { value: 'multi', label: '多选' },
  { value: 'user', label: '用户' },
  { value: 'relation', label: '关联' },
  { value: 'formula', label: '公式' },
];

export const FieldDrawer: React.FC<Props> = ({ open, fieldId, initialName, initialType = 'text', initialDescription, initialOptions, initialFormula, initialNumberFormat, availableFields = [], disabledTypeEdit, limitTypesTo, onClose, onSave }) => {
  const [name, setName] = useState(initialName ?? '');
  const [type, setType] = useState<FieldType>(initialType);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [options, setOptions] = useState<SelectOption[]>(initialOptions ?? []);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [formulaOp, setFormulaOp] = useState<FormulaOp>(initialFormula?.op ?? 'sum');
  const [formulaFields, setFormulaFields] = useState<string[]>(initialFormula?.fields ?? []);
  const [decimals, setDecimals] = useState<number>(initialFormula?.format?.decimals ?? 0);
  const [thousand, setThousand] = useState<boolean>(initialFormula?.format?.thousand ?? false);
  // number 列的展示格式
  const [numDecimals, setNumDecimals] = useState<number>(initialNumberFormat?.decimals ?? 0);
  const [numThousand, setNumThousand] = useState<boolean>(initialNumberFormat?.thousand ?? false);
  const [batchOpen, setBatchOpen] = useState<boolean>(false);

  useEffect(() => {
    setName(initialName ?? '');
    setType(initialType ?? 'text');
    setDescription(initialDescription ?? '');
    setOptions(initialOptions ?? []);
    setNewOptionLabel('');
    setFormulaOp(initialFormula?.op ?? 'sum');
    setFormulaFields(initialFormula?.fields ?? []);
    setDecimals(initialFormula?.format?.decimals ?? 0);
    setThousand(initialFormula?.format?.thousand ?? false);
  }, [initialName, initialType, initialDescription, initialOptions, initialFormula, fieldId, open]);

  useEffect(() => {
    setNumDecimals(initialNumberFormat?.decimals ?? 0);
    setNumThousand(initialNumberFormat?.thousand ?? false);
  }, [initialNumberFormat, fieldId, open]);

  if (!open || !fieldId) return null;

  const filteredTypeOptions = (limitTypesTo && limitTypesTo.length > 0)
    ? typeOptions.filter((opt) => limitTypesTo.includes(opt.value))
    : typeOptions;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'none' }}>
      {/* backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)', pointerEvents: 'auto' }} />
      {/* panel */}
      <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 360, background: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', borderLeft: '1px solid #eee', pointerEvents: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #f2f2f2' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>编辑字段</div>
          <div style={{ marginTop: 8, color: '#888' }}>字段ID：{fieldId}</div>
        </div>
        <div style={{ padding: 16, display: 'grid', rowGap: 12 }}>
          <label style={{ display: 'grid', rowGap: 6 }}>
            <span>字段名称</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：任务名称" />
          </label>
          <label style={{ display: 'grid', rowGap: 6 }}>
            <span>字段类型</span>
            <select disabled={!!disabledTypeEdit} value={type} onChange={(e) => setType(e.target.value as FieldType)}>
              {filteredTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {disabledTypeEdit && <small style={{ color: '#999' }}>当前字段类型不可更改</small>}
          </label>
          <label style={{ display: 'grid', rowGap: 6 }}>
            <span>字段描述</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="用于解释该字段用途或输入规范" />
          </label>
          {type === 'formula' && (
            <div style={{ display: 'grid', rowGap: 8 }}>
              <div style={{ fontWeight: 600 }}>公式配置</div>
              {/* 仅数字字段可选 */}
              {availableFields.filter((f) => f.type === 'number').length === 0 && (
                <div style={{ color: '#b91c1c', background: '#fee2e2', padding: 8, borderRadius: 6 }}>
                  无数字字段，无法配置公式。请先添加或将参与列类型改为“数字”。
                </div>
              )}
              <label style={{ display: 'grid', rowGap: 6 }}>
                <span>操作符</span>
                <select value={formulaOp} onChange={(e) => {
                  const next = e.target.value as FormulaOp;
                  setFormulaOp(next);
                  const numericIds = availableFields.filter((f) => f.type === 'number').map((f) => f.id);
                  setFormulaFields((prev) => {
                    // 二元操作限制2个，其他可多选
                    const binary = ['add','sub','mul','div'].includes(next);
                    const cleaned = prev.filter((id) => numericIds.includes(id));
                    if (binary) {
                      const base = cleaned.slice(0, 2);
                      // 不足时自动补齐
                      while (base.length < 2 && numericIds[base.length]) base.push(numericIds[base.length]);
                      return base;
                    }
                    return cleaned.length ? cleaned : (numericIds.length ? [numericIds[0]] : []);
                  });
                }}>
                  <option value="sum">求和（多个字段）</option>
                  <option value="avg">平均值（多个字段）</option>
                  <option value="max">最大值（多个字段）</option>
                  <option value="min">最小值（多个字段）</option>
                  <option value="add">相加（两个字段）</option>
                  <option value="sub">相减（两个字段）</option>
                  <option value="mul">相乘（两个字段）</option>
                  <option value="div">相除（两个字段）</option>
                </select>
              </label>
              {/* 批量选择 */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => setBatchOpen((o) => !o)}>{batchOpen ? '关闭批量选择' : '批量选择字段'}</button>
                <small style={{ color: '#666' }}>仅显示数字类型字段</small>
              </div>
              {batchOpen && (
                <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 8, display: 'grid', rowGap: 6, maxHeight: 180, overflow: 'auto' }}>
                  {availableFields.filter((f) => f.type === 'number').map((f) => {
                    const checked = formulaFields.includes(f.id);
                    return (
                      <label key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const binary = ['add','sub','mul','div'].includes(formulaOp);
                            setFormulaFields((prev) => {
                              let next = prev;
                              if (e.target.checked) {
                                next = [...prev, f.id];
                              } else {
                                next = prev.filter((id) => id !== f.id);
                              }
                              if (binary) {
                                next = next.slice(0, 2);
                              }
                              return next;
                            });
                          }}
                        />
                        <span>{f.name}</span>
                      </label>
                    );
                  })}
                  {availableFields.filter((f) => f.type === 'number').length === 0 && (
                    <small style={{ color: '#999' }}>当前没有可选的数字字段。</small>
                  )}
                </div>
              )}
              {/* 单条选择列表（便于调序和限制） */}
              <div style={{ display: 'grid', rowGap: 6 }}>
                <span>参与字段</span>
                {(
                  ['add','sub','mul','div'].includes(formulaOp) ? formulaFields.slice(0, 2) : formulaFields
                ).map((fid, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: '#999' }}>#{idx + 1}</span>
                    <select value={fid ?? ''} onChange={(e) => {
                      const val = e.target.value;
                      setFormulaFields((prev) => prev.map((x, i) => (i === idx ? val : x)));
                    }}>
                      <option value="">选择数字字段</option>
                      {availableFields.filter((f) => f.type === 'number').map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    {(!['add','sub','mul','div'].includes(formulaOp)) && (
                      <button onClick={() => setFormulaFields((prev) => prev.filter((_, i) => i !== idx))}>删除</button>
                    )}
                  </div>
                ))}
                {(!['add','sub','mul','div'].includes(formulaOp)) && (
                  <button onClick={() => {
                    const firstNum = availableFields.filter((f) => f.type === 'number')[0]?.id ?? '';
                    setFormulaFields((prev) => [...prev, firstNum]);
                  }}>添加参与字段</button>
                )}
                {['add','sub','mul','div'].includes(formulaOp) && formulaFields.length < 2 && (
                  <small style={{ color: '#b45309', background: '#fffbeb', padding: '4px 6px', borderRadius: 6 }}>二元操作需要配置两个数字字段</small>
                )}
              </div>
              {/* 表达式可视化与格式化 */}
              <div style={{ display: 'grid', rowGap: 6 }}>
                <span>表达式预览</span>
                <div style={{ padding: 8, border: '1px dashed #ddd', borderRadius: 6, color: '#444' }}>
                  {(() => {
                    const nameOf = (id: string) => availableFields.find((f) => f.id === id)?.name ?? id;
                    const names = formulaFields.map(nameOf);
                    switch (formulaOp) {
                      case 'sum': return `sum(${names.join(', ')})`;
                      case 'avg': return `avg(${names.join(', ')})`;
                      case 'max': return `max(${names.join(', ')})`;
                      case 'min': return `min(${names.join(', ')})`;
                      case 'add': return `${nameOf(formulaFields[0] ?? '')} + ${nameOf(formulaFields[1] ?? '')}`;
                      case 'sub': return `${nameOf(formulaFields[0] ?? '')} - ${nameOf(formulaFields[1] ?? '')}`;
                      case 'mul': return `${nameOf(formulaFields[0] ?? '')} × ${nameOf(formulaFields[1] ?? '')}`;
                      case 'div': return `${nameOf(formulaFields[0] ?? '')} ÷ ${nameOf(formulaFields[1] ?? '')}`;
                      default: return '';
                    }
                  })()}
                </div>
              </div>
              <div style={{ display: 'grid', rowGap: 6 }}>
                <span>数值格式</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span>小数位</span>
                    <input type="number" min={0} max={6} value={decimals} onChange={(e) => setDecimals(Math.max(0, Math.min(6, Number(e.target.value) || 0)))} style={{ width: 80 }} />
                  </label>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="checkbox" checked={thousand} onChange={(e) => setThousand(e.target.checked)} />
                    <span>千分位</span>
                  </label>
                </div>
                <small style={{ color: '#666' }}>空值按 0 处理；除法分母为 0 时显示为空。</small>
              </div>
            </div>
          )}
          {type === 'number' && (
            <div style={{ display: 'grid', rowGap: 8 }}>
              <div style={{ fontWeight: 600 }}>数值格式</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span>小数位</span>
                  <input type="number" min={0} max={6} value={numDecimals} onChange={(e) => setNumDecimals(Math.max(0, Math.min(6, Number(e.target.value) || 0)))} style={{ width: 80 }} />
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={numThousand} onChange={(e) => setNumThousand(e.target.checked)} />
                  <span>千分位</span>
                </label>
              </div>
              <small style={{ color: '#666' }}>仅用于展示格式，不影响实际存储数值。</small>
            </div>
          )}
          {(type === 'single' || type === 'multi') && (
            <div style={{ display: 'grid', rowGap: 8 }}>
              <div style={{ fontWeight: 600 }}>选项内容</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={newOptionLabel}
                  onChange={(e) => setNewOptionLabel(e.target.value)}
                  placeholder="输入选项文本，按回车或点添加"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const label = newOptionLabel.trim();
                      if (!label) return;
                      setOptions((prev) => [...prev, { id: `opt-${Date.now()}-${prev.length + 1}`, label }]);
                      setNewOptionLabel('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const label = newOptionLabel.trim();
                    if (!label) return;
                    setOptions((prev) => [...prev, { id: `opt-${Date.now()}-${prev.length + 1}`, label }]);
                    setNewOptionLabel('');
                  }}
                >添加</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {options.map((opt, idx) => (
                  <div key={opt.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: '#999' }}>#{idx + 1}</span>
                    <input value={opt.label} onChange={(e) => setOptions((prev) => prev.map((o) => o.id === opt.id ? { ...o, label: e.target.value } : o))} />
                    <button onClick={() => setOptions((prev) => prev.filter((o) => o.id !== opt.id))}>删除</button>
                  </div>
                ))}
                {options.length === 0 && <small style={{ color: '#999' }}>暂无选项，添加后在表格中可选择。</small>}
              </div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 'auto', padding: 16, borderTop: '1px solid #f2f2f2', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}>取消</button>
          <button
            style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6 }}
          onClick={() => {
            if (!fieldId) return;
            const payload: any = { id: fieldId, name: name.trim() || initialName || '', type, description: description.trim() };
            if (type === 'single' || type === 'multi') {
              payload.options = options;
            }
            if (type === 'formula') {
              const binary = ['add','sub','mul','div'].includes(formulaOp);
              const flds = binary ? formulaFields.slice(0, 2).filter(Boolean) : formulaFields.filter(Boolean);
              payload.formula = { op: formulaOp, fields: flds, format: { decimals, thousand } };
            }
            if (type === 'number') {
              payload.format = { decimals: numDecimals, thousand: numThousand };
            }
            onSave(payload);
            onClose();
          }}
          >保存</button>
        </div>
      </div>
    </div>
  );
};

export default FieldDrawer;