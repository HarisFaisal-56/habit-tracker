import { useEffect, useState } from "react";

/**
 * False on the first frame after mounting, then true. Render a CSS-transitioned
 * value from its start while this is false, so it glides in on mount (a value
 * that's there from the first paint has nothing to transition from).
 */
export function useEntered(): boolean {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    // Two frames: the first paint must happen with the start value.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        setEntered(true);
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);
  return entered;
}
