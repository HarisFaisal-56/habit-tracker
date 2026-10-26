import { createLucideIcon } from "lucide-react";

// Icons from the designs that lucide doesn't have exactly, drawn on lucide's
// 24px grid so they match its stroke and sizing.

/** A page with a folded corner and two lines of text, for the weekly review. */
export const ReviewPage = createLucideIcon("review-page", [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "page",
    },
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "fold" }],
  ["path", { d: "M8 14h8", key: "line-1" }],
  ["path", { d: "M8 18h5", key: "line-2" }],
]);

/** Two sliders, the top knob on the right and the bottom one on the left, for settings. */
export const Sliders = createLucideIcon("sliders", [
  ["path", { d: "M4 7h9", key: "top" }],
  ["circle", { cx: "17", cy: "7", r: "3", key: "top-knob" }],
  ["path", { d: "M11 17h9", key: "bottom" }],
  ["circle", { cx: "7", cy: "17", r: "3", key: "bottom-knob" }],
]);
