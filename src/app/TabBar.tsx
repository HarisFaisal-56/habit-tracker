import clsx from "clsx";
import { NavLink } from "react-router";
import { tabs } from "./tabs";

export function TabBar() {
  return (
    <nav aria-label="Main" className="shrink-0 bg-canvas px-6 pt-2 pb-safe-6">
      <ul className="mx-auto grid w-full max-w-md grid-cols-6 rounded-full border border-line-strong bg-bar p-1.5">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex justify-center">
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex h-12 w-12.5 items-center justify-center rounded-2xl motion-safe:transition-colors",
                  isActive
                    ? "bg-accent text-accent-ink"
                    : "text-muted hover:text-ink active:text-ink",
                )
              }
            >
              <Icon aria-hidden="true" className="size-5.5" strokeWidth={1.75} />
              <span className="sr-only">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
