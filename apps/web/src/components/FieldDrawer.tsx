import React, { useEffect, useState } from 'react';

export type FieldType = 'text' | 'number' | 'date' | 'single' | 'multi' | 'user' | 'relation';

type Props = {
  open: boolean;
  fieldId: string | null;
  initialName?: string;
  initialType?: FieldType;
  initialDescription?: string;
  disabledTypeEdit?: boolean; // e.g. lock type when protect mode or first column rules
  onClose: () => void;
  onSave: (payload: { id: string; name: string; type: FieldType; description?: string }) => void;
};

const typeOptions: { value: FieldType; label: string }[] = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'single', label: '选择' },
  { value: 'multi', label: '多选' },
  { value: 'user', label: '用户' },
  { value: 'relation', label: '关联' },
];

export const FieldDrawer: React.FC<Props> = ({ open, fieldId, initialName, initialType = 'text', initialDescription, disabledTypeEdit, onClose, onSave }) => {
  const [name, setName] = useState(initialName ?? '');
  const [type, setType] = useState<FieldType>(initialType);
  const [description, setDescription] = useState(initialDescription ?? '');

  useEffect(() => {
    setName(initialName ?? '');
    setType(initialType ?? 'text');
    setDescription(initialDescription ?? '');
  }, [initialName, initialType, initialDescription, fieldId, open]);

  if (!open || !fieldId) return null;

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
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {disabledTypeEdit && <small style={{ color: '#999' }}>当前字段类型不可更改</small>}
          </label>
          <label style={{ display: 'grid', rowGap: 6 }}>
            <span>字段描述</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="用于解释该字段用途或输入规范" />
          </label>
        </div>
        <div style={{ marginTop: 'auto', padding: 16, borderTop: '1px solid #f2f2f2', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}>取消</button>
          <button
            style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6 }}
            onClick={() => {
              if (!fieldId) return;
              onSave({ id: fieldId, name: name.trim() || initialName || '', type, description: description.trim() });
              onClose();
            }}
          >保存</button>
        </div>
      </div>
    </div>
  );
};

export default FieldDrawer;