import type { NumberEditorProps } from './types';

export default function NumberEditor({ value, onChange }: NumberEditorProps) {
  return (
    <input
      type="number"
      className="sheet-input"
      value={value ?? 0}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? null : Number(v));
      }}
      autoFocus
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    />
  );
}