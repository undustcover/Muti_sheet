import { useEffect } from 'react';

interface UseHotkeysProps {
  activeNav: string;
  onUndo: () => void;
  onRedo: () => void;
  onOpenQuery: () => void;
  onDeleteSelectedCell: () => void;
  selectedCellRowId?: string | null;
}

export function useHotkeys({
  activeNav,
  onUndo,
  onRedo,
  onOpenQuery,
  onDeleteSelectedCell,
  selectedCellRowId,
}: UseHotkeysProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (activeNav !== 'table') return;
      const key = e.key.toLowerCase();
      if (e.ctrlKey && !e.shiftKey && key === 'z') { e.preventDefault(); onUndo(); }
      else if ((e.ctrlKey && e.shiftKey && key === 'z') || (e.ctrlKey && key === 'y')) { e.preventDefault(); onRedo(); }
      else if (e.ctrlKey && key === 'f') { e.preventDefault(); onOpenQuery(); }
      else if (!e.ctrlKey && !e.metaKey && e.key === 'Delete') { e.preventDefault(); onDeleteSelectedCell(); }
    };
    window.addEventListener('keydown', handler as any);
    return () => window.removeEventListener('keydown', handler as any);
  }, [activeNav, selectedCellRowId, onUndo, onRedo, onOpenQuery, onDeleteSelectedCell]);
}