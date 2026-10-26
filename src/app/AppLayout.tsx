import { useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { useReminders } from "../features/reminders/useReminders";
import { TabBar } from "./TabBar";
import { useApplyTheme } from "./useApplyTheme";

/**
 * A full-height column: the screen scrolls in `main`, and the tab bar is docked
 * below it rather than floating on top, so it never covers content.
 */
export function AppLayout() {
  useApplyTheme();
  useReminders();
  const scrollRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  // `main` is the scroller, so each screen starts at the top.
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [pathname]);

  return (
    <div className="flex h-dvh flex-col px-safe">
      <main ref={scrollRef} className="flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-2xl px-5 pb-6">
          <Outlet />
        </div>
      </main>
      <TabBar />
    </div>
  );
}
