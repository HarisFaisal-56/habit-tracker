import {
  Calendar,
  ChartNoAxesColumn,
  CircleCheck,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { ReviewPage, Sliders } from "../components/icons";

export type Tab = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export const tabs: readonly Tab[] = [
  { to: "/", label: "Today", icon: CircleCheck },
  { to: "/habits", label: "Habits", icon: ListChecks },
  { to: "/history", label: "History", icon: Calendar },
  { to: "/stats", label: "Stats", icon: ChartNoAxesColumn },
  { to: "/review", label: "Review", icon: ReviewPage },
  { to: "/settings", label: "Settings", icon: Sliders },
];
