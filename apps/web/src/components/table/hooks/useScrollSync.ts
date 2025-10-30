import { useEffect } from 'react';
import type { RefObject } from 'react';

// Scroll sync hook scaffold
// - Currently header and body share one container; we still provide a unified API for future split containers.
// - If a secondary ref is provided, sync its scrollLeft; otherwise, expose onScroll callback.
export function useScrollSync(params: {
  containerRef: RefObject<any>;
  peerRef?: RefObject<any>;
  onSync?: (pos: { left: number; top: number }) => void;
}) {
  const { containerRef, peerRef, onSync } = params;

  useEffect(() => {
    const el = containerRef.current as HTMLElement | null;
    if (!el) return;
    const handler = () => {
      const left = el.scrollLeft;
      const top = el.scrollTop;
      if (peerRef?.current) {
        (peerRef.current as HTMLElement).scrollLeft = left;
      }
      if (onSync) onSync({ left, top });
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => { el.removeEventListener('scroll', handler); };
  }, [containerRef, peerRef, onSync]);

  // For components needing an explicit handler instead of effect
  const onScroll = () => {
    const el = containerRef.current as HTMLElement | null;
    if (!el) return;
    const left = el.scrollLeft;
    const top = el.scrollTop;
    if (peerRef?.current) {
      (peerRef.current as HTMLElement).scrollLeft = left;
    }
    if (onSync) onSync({ left, top });
  };

  return { onScroll };
}