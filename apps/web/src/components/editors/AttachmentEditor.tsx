import React, { useState } from 'react';
import type { AttachmentItem } from '../../types';
import type { BaseEditorProps } from './types';

export default function AttachmentEditor({ value, onChange }: BaseEditorProps) {
  const list: AttachmentItem[] = Array.isArray(value) ? value : [];
  const [input, setInput] = useState('');

  const addItem = () => {
    const name = input.trim();
    if (!name) return;
    const next: AttachmentItem = { id: Math.random().toString(36).slice(2), name };
    onChange([...list, next]);
    setInput('');
  };

  const removeItem = (id: string) => {
    onChange(list.filter(it => it.id !== id));
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="输入附件名称或URL"
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ flex: 1 }}
        />
        <button onClick={addItem}>添加</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {list.map(it => (
          <div key={it.id} style={{ border: '1px solid #ddd', borderRadius: 4, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
            <button onClick={() => removeItem(it.id)} style={{ color: '#c00' }}>删除</button>
          </div>
        ))}
      </div>
    </div>
  );
}