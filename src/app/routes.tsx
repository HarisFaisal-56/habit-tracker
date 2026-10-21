import { Navigate, type RouteObject } from "react-router";
import { HabitsScreen } from "../features/habits/HabitsScreen";
import { HistoryScreen } from "../features/history/HistoryScreen";
import { ReviewScreen } from "../features/review/ReviewScreen";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { StatsScreen } from "../features/stats/StatsScreen";
import { TodayScreen } from "../features/today/TodayScreen";
import { AppLayout } from "./AppLayout";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <TodayScreen /> },
      { path: "habits", element: <HabitsScreen /> },
      { path: "history", element: <HistoryScreen /> },
      { path: "stats", element: <StatsScreen /> },
      { path: "review", element: <ReviewScreen /> },
      { path: "settings", element: <SettingsScreen /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
];
