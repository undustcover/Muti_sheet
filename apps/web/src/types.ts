// 集中管理所有类型定义

import type { ViewKind } from './services/viewsStore';

// 基础类型
export type User = { id: string; name: string };
export type SelectOption = { id: string; label: string };

// 公式相关类型
export type FormulaOp = 'sum' | 'add' | 'sub' | 'mul' | 'div' | 'avg' | 'max' | 'min';
export type FormulaConfig = { op: FormulaOp; fields: string[]; format?: { decimals: number; thousand: boolean } };
export type NumberFormat = { decimals: number; thousand: boolean };

// 行记录类型
export type RowRecord = {
  id: string;
  text: string;
  number: number;
  date: string; // ISO string
  select: SelectOption | null;
  multiSelect: SelectOption[];
  relation: string | null; // related record id
  user: User | null;
};

// 列相关类型
export type ColumnItem = { id: string; name: string; type: string };

// 视图类型
export type View = { id: string; name: string; protect: 'public' | 'locked' | 'personal'; kind?: ViewKind };

// 字段类型
// 扩展：新增 attachment 与 singleSelect（作为 single 的别名）
export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'single'
  | 'singleSelect'
  | 'multi'
  | 'user'
  | 'relation'
  | 'formula'
  | 'attachment';

// 附件项类型（用于 Attachment 字段显示/扩展）
export type AttachmentItem = { id: string; name: string; url?: string; size?: number };