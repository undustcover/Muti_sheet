import React, { useRef } from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useScrollSync } from '../useScrollSync';

function Harness({ onSync }: { onSync: (pos: { top: number; left: number }) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const peerRef = useRef<HTMLDivElement>(null);

  useScrollSync({ containerRef, peerRef, onSync });

  return (
    <div>
      <div
        data-testid="container"
        ref={containerRef}
        style={{ overflow: 'auto', width: 200, height: 200 }}
      >
        {/* make it scrollable in jsdom by having large inner content */}
        <div style={{ width: 1000, height: 1000 }} />
      </div>
      <div
        data-testid="peer"
        ref={peerRef}
        style={{ overflow: 'auto', width: 200, height: 200 }}
      >
        <div style={{ width: 1000, height: 1000 }} />
      </div>
    </div>
  );
}

describe('useScrollSync', () => {
  it('syncs scrollTop and scrollLeft and calls onSync', () => {
    const onSync = vi.fn();
    const { getByTestId } = render(<Harness onSync={onSync} />);

    const container = getByTestId('container') as HTMLDivElement;
    const peer = getByTestId('peer') as HTMLDivElement;

    // set initial scroll on container
    container.scrollTop = 120;
    container.scrollLeft = 45;

    // dispatch scroll event
    fireEvent.scroll(container);

    // peer should reflect the same horizontal scroll position
    expect(peer.scrollLeft).toBe(45);

    // onSync should be called with positions
    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith({ top: 120, left: 45 });
  });
});