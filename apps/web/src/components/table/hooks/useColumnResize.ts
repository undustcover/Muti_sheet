import { useState } from 'react';

export function useColumnResize(getColWidth: (cid: string) => number, setColWidths: (updater: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void) {
  const [hoverResizeCid, setHoverResizeCid] = useState<string | null>(null);

  const startResize = (cid: string, startX: number) => {
    const initial = getColWidth(cid);
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const next = Math.max(60, initial + delta);
      setColWidths((prev) => ({ ...prev, [cid]: next }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('mouseup', onUp, { once: true });
  };

  return {
    hoverResizeCid,
    setHoverResizeCid,
    startResize,
  };
}