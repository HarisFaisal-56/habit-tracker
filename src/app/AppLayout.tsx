import { Outlet } from "react-router";
import { TabBar } from "./TabBar";
import { useApplyTheme } from "./useApplyTheme";

export function AppLayout() {
  useApplyTheme();
  return (
    <div className="flex min-h-dvh flex-col pt-safe px-safe">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
