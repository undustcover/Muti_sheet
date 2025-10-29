import type React from 'react';

// 更通用的键盘状态机：支持不同编辑器类型场景的可配置策略
// 设计目标：
// - 统一打开/关闭、导航、选择等行为
// - 允许覆盖行为（如多选不关闭、日期栅格导航等）
// - 保持与现有 handleDropdownListKeys 向下兼容

export type KeyEvent = React.KeyboardEvent<HTMLDivElement>;

export type KeyboardState = {
  open: boolean;
  activeIndex?: number; // 列表型编辑器使用
};

export type KeyboardContext = {
  getState: () => KeyboardState;
  setOpen: (v: boolean) => void;
  setActiveIndex?: React.Dispatch<React.SetStateAction<number>>;
  maxIndex?: number; // 列表最大下标
  onSelect?: (index: number) => void;
  cancelClose?: () => void;
};

export type KeyboardPolicy = {
  allowSpaceToOpen?: boolean;
  closeOnSelect?: boolean;
  preventDefaultOnHandled?: boolean; // 默认 true
};

export type KeyboardAction =
  | { type: 'open' }
  | { type: 'close' }
  | { type: 'nav'; delta: 1 | -1 }
  | { type: 'select' };

export type KeyboardReducer = (policy: KeyboardPolicy, state: KeyboardState, key: string) => KeyboardAction | null;

// 默认 reducer：列表型编辑器行为
export const listReducer: KeyboardReducer = (policy, state, key) => {
  const allowSpace = !!policy.allowSpaceToOpen;
  if (!state.open) {
    if (key === 'ArrowDown' || key === 'Enter' || (allowSpace && key === ' ')) return { type: 'open' };
    return null;
  }
  if (key === 'Escape') return { type: 'close' };
  if (key === 'ArrowDown') return { type: 'nav', delta: 1 };
  if (key === 'ArrowUp') return { type: 'nav', delta: -1 };
  if (key === 'Enter') return { type: 'select' };
  return null;
};

export function createKeyboardHandler(reducer: KeyboardReducer, ctx: KeyboardContext, policy: KeyboardPolicy = {}) {
  const pol: KeyboardPolicy = { preventDefaultOnHandled: true, closeOnSelect: true, ...policy };
  return function onKeyDown(e: KeyEvent) {
    const key = e.key;
    const action = reducer(pol, ctx.getState(), key);
    if (!action) return;
    if (pol.preventDefaultOnHandled) e.preventDefault();
    if (key !== 'Tab') e.stopPropagation();

    if (action.type === 'open') {
      ctx.cancelClose?.();
      ctx.setOpen(true);
      return;
    }
    if (action.type === 'close') {
      ctx.setOpen(false);
      return;
    }
    if (action.type === 'nav') {
      const setIdx = ctx.setActiveIndex;
      const max = ctx.maxIndex ?? -1;
      if (!setIdx || max < 0) return;
      setIdx((i) => {
        const base = i < 0 ? 0 : i;
        const next = base + action.delta;
        return Math.max(0, Math.min(next, max));
      });
      return;
    }
    if (action.type === 'select') {
      const idx = ctx.getState().activeIndex ?? -1;
      if (idx >= 0) ctx.onSelect?.(idx);
      if (pol.closeOnSelect) ctx.setOpen(false);
      return;
    }
  };
}

// 是否为打开下拉的按键（包含空格，用于日期编辑器）
export const isOpenKey = (key: string) => key === 'ArrowDown' || key === 'Enter' || key === ' ';
export const isCloseKey = (key: string) => key === 'Escape';
export const isSelectKey = (key: string) => key === 'Enter';
export const isNavDown = (key: string) => key === 'ArrowDown';
export const isNavUp = (key: string) => key === 'ArrowUp';

// 通用列表型下拉的键盘处理：打开/关闭、上下导航、选择
export function handleDropdownListKeys(
  e: React.KeyboardEvent<HTMLDivElement>,
  ctx: {
    open: boolean;
    setOpen: (v: boolean) => void;
    activeIndex: number;
    setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
    maxIndex: number; // 选项最大下标（length - 1）
    onSelect: (index: number) => void;
    cancelClose?: () => void; // 用于取消延时关闭
    allowSpaceToOpen?: boolean; // 是否允许空格打开
    closeOnSelect?: boolean; // 选择后是否关闭（单选用户为 true，多选为 false）
  }
) {
  const { open, setOpen, activeIndex, setActiveIndex, maxIndex, onSelect, cancelClose, allowSpaceToOpen = false, closeOnSelect = true } = ctx;
  const key = e.key;

  if (!open) {
    if ((key === 'ArrowDown' || key === 'Enter' || (allowSpaceToOpen && key === ' '))) {
      e.preventDefault();
      cancelClose?.();
      setOpen(true);
    }
    return;
  }

  if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === 'Escape') {
    e.preventDefault();
  }

  if (key === 'ArrowDown') {
    setActiveIndex((i) => Math.min((i < 0 ? 0 : i) + 1, maxIndex));
  } else if (key === 'ArrowUp') {
    setActiveIndex((i) => Math.max((i < 0 ? 0 : i) - 1, 0));
  } else if (key === 'Enter') {
    if (activeIndex >= 0) {
      onSelect(activeIndex);
      if (closeOnSelect) setOpen(false);
    }
  } else if (key === 'Escape') {
    setOpen(false);
  }
}

// 兼容适配器：用状态机包装旧的列表型处理器（便于迁移）
export function makeListHandlerAdapter(params: {
  getState: () => KeyboardState;
  setOpen: (v: boolean) => void;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  maxIndex: number;
  onSelect: (index: number) => void;
  cancelClose?: () => void;
  allowSpaceToOpen?: boolean;
  closeOnSelect?: boolean;
}) {
  const { getState, setOpen, setActiveIndex, maxIndex, onSelect, cancelClose, allowSpaceToOpen, closeOnSelect } = params;
  return createKeyboardHandler(listReducer, { getState, setOpen, setActiveIndex, maxIndex, onSelect, cancelClose }, { allowSpaceToOpen, closeOnSelect });
}