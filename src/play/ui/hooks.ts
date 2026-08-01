import { useEffect, useRef, useState } from 'react';
import { bus, type HudSnapshot } from '../bridge';

/** Subscribe to a bridge event with a stable callback. */
export function useBusEvent<K extends 'toast' | 'screen' | 'inputMode' | 'loopEnd' | 'ending' | 'ending-decision' | 'dialogue' | 'interact'>(
  event: K,
  fn: (payload: never) => void,
): void {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => bus.on(event, ((p: unknown) => ref.current(p as never)) as never), [event]);
}

export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(performance.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Screen-space position of a world point using the snapshot camera. */
export function worldToScreen(snap: HudSnapshot, wx: number, wy: number): { x: number; y: number } | null {
  if (!snap.cam) return null;
  const { x, y, zoom } = snap.cam;
  return { x: (wx - x) * zoom, y: (wy - y) * zoom };
}
