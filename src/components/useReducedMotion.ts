import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * Whether the user asked for less motion. CSS animations already respect it (see
 * src/index.css); this is for SVG <animate> elements and JS-driven tweens.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
