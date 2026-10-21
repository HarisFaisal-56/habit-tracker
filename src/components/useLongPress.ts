import { useRef, type MouseEvent, type PointerEvent } from "react";

const LONG_PRESS_MS = 500;
// Moving further than this means the user is scrolling, not pressing.
const MOVE_TOLERANCE_PX = 10;

/**
 * Handlers that call `onLongPress` after a held press (touch or mouse) or a
 * right-click / Android context-menu gesture. The click that ends a long press
 * is swallowed so it doesn't also trigger the element's normal tap action.
 * Always pair this with a visible button for keyboard and screen reader users.
 */
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancel = () => {
    window.clearTimeout(timer.current);
    start.current = null;
  };

  const fire = () => {
    cancel();
    fired.current = true;
    onLongPress();
  };

  return {
    onPointerDown(event: PointerEvent) {
      if (event.button !== 0) return;
      fired.current = false;
      start.current = { x: event.clientX, y: event.clientY };
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(fire, LONG_PRESS_MS);
    },
    onPointerMove(event: PointerEvent) {
      if (!start.current) return;
      const moved = Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y);
      if (moved > MOVE_TOLERANCE_PX) cancel();
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu(event: MouseEvent) {
      event.preventDefault();
      // On Android the timer usually got here first. A right-click isn't followed
      // by a click, so this path must not swallow the next one (e.g. keyboard Enter).
      if (fired.current) return;
      cancel();
      onLongPress();
    },
    onClickCapture(event: MouseEvent) {
      if (!fired.current) return;
      fired.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
