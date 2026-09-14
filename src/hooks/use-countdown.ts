"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

/** Each mounted instance owns one countdown. Remount to start another stage. */
export function useCountdown(
  seconds: number,
  paused: boolean,
  onComplete: () => void,
) {
  const [remaining, setRemaining] = useState(seconds);
  const count = useRef(seconds);
  const finished = useRef(false);

  const tick = useEffectEvent(() => {
    if (paused || finished.current) return;
    count.current = Math.max(0, count.current - 1);
    setRemaining(count.current);
    if (count.current === 0) {
      finished.current = true;
      onComplete();
    }
  });

  useEffect(() => {
    const interval = setInterval(tick, 1_000);
    return () => clearInterval(interval);
  }, []);

  return remaining;
}
