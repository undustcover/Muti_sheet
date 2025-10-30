import type { SelectOption } from '../../types';

export type EditorType = 'text' | 'number' | 'date' | 'select' | 'multiSelect' | 'relation' | 'user' | 'attachment';

export interface BaseEditorProps {
  value: any;
  onChange: (value: any) => void;
}

export interface SelectEditorProps extends BaseEditorProps {
  options?: SelectOption[];
}

export interface TextEditorProps extends BaseEditorProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export interface NumberEditorProps extends BaseEditorProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

export interface DateEditorProps extends BaseEditorProps {
  value: string | null; // ISO string
  onChange: (value: string | null) => void; // ISO string
}