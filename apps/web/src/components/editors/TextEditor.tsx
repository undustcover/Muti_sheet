import type { TextEditorProps } from './types';

export default function TextEditor({ value, onChange }: TextEditorProps) {
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