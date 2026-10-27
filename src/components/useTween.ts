import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

/** Share of the remaining distance covered each frame, as in the design. */
const EASE = 0.11;
/** Close enough to snap to the target. */
const SNAP = 0.0015;

/**
 * A number that glides towards `target` each animation frame, easing out, e.g. a
 * ring filling up. Starts at `from` (the target by default). With reduced motion
 * it is always the target.
 */
export function useTween(target: number, from: number = target): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(from);
  const current = useRef(from);

  useEffect(() => {
    if (reduced) {
      current.current = target;
      return;
    }
    let frame = 0;
    const step = () => {
      const distance = target - current.current;
      if (Math.abs(distance) < SNAP) {
        current.current = target;
        setValue(target);
        return;
      }
      current.current += distance * EASE;
      setValue(current.current);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [target, reduced]);

  return reduced ? target : value;
}
