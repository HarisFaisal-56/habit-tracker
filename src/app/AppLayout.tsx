import { useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { useReminders } from "../features/reminders/useReminders";
import { TabBar } from "./TabBar";
import { useApplyTheme } from "./useApplyTheme";

/**
 * A full-height scroller with the tab bar floating over its bottom edge. Content
 * gets enough bottom padding to scroll clear of the bar.
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
      <main
        ref={scrollRef}
        className="no-scrollbar flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
      >
        <div className="mx-auto w-full max-w-2xl px-5 pb-tab-bar">
          <Outlet />
        </div>
      </main>
      <div aria-hidden="true" className="top-fade pointer-events-none fixed inset-x-0 top-0 z-20" />
      <div aria-hidden="true" className="noise pointer-events-none fixed inset-0 z-10" />
      <TabBar />
    </div>
  );
}
