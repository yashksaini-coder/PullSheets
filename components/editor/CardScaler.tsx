'use client';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Cards are authored in px at their frame width. This fits them to the stage with a transform so export fidelity is exact. */
export function CardScaler({ nativeWidth, children }: { nativeWidth: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [h, setH] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const fit = () => { const s = o.clientWidth / nativeWidth; setScale(s); setH(i.offsetHeight * s); };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o); ro.observe(i);
    return () => ro.disconnect();
  }, [nativeWidth]);
  return (
    <div ref={outer} style={{ width: '100%', height: h, position: 'relative', overflow: 'hidden' }}>
      <div ref={inner} style={{ width: nativeWidth, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>{children}</div>
    </div>
  );
}
