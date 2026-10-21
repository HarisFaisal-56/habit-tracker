import {
  ChartColumn,
  CalendarDays,
  CircleCheckBig,
  ListChecks,
  NotebookPen,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type Tab = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export const tabs: readonly Tab[] = [
  { to: "/", label: "Today", icon: CircleCheckBig },
  { to: "/habits", label: "Habits", icon: ListChecks },
  { to: "/history", label: "History", icon: CalendarDays },
  { to: "/stats", label: "Stats", icon: ChartColumn },
  { to: "/review", label: "Review", icon: NotebookPen },
  { to: "/settings", label: "Settings", icon: Settings },
];
