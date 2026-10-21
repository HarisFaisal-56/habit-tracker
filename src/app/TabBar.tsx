import clsx from "clsx";
import { NavLink } from "react-router";
import { tabs } from "./tabs";

export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 border-t border-stone-200 bg-stone-50/95 pb-safe backdrop-blur dark:border-stone-800 dark:bg-stone-950/95"
    >
      <ul className="mx-auto flex w-full max-w-2xl">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium motion-safe:transition-colors",
                  isActive
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-stone-500 active:text-stone-900 dark:text-stone-400 dark:active:text-stone-100",
                )
              }
            >
              <Icon aria-hidden="true" className="size-6" strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
