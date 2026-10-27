import clsx from "clsx";
import { NavLink, useLocation } from "react-router";
import { tabs } from "./tabs";

function isTabActive(to: string, pathname: string): boolean {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

/**
 * A frosted pill floating over the bottom of the screen, with a lime thumb that
 * slides to the current tab. Content scrolls underneath and fades out behind it.
 */
export function TabBar() {
  const { pathname } = useLocation();
  const active = tabs.findIndex((tab) => isTabActive(tab.to, pathname));

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-linear-to-b from-canvas/0 to-canvas/85 to-45% px-safe pt-7.5 pb-tab-gap"
    >
      <div className="glass pointer-events-auto relative mx-5 rounded-full p-1.5 sm:mx-auto sm:max-w-md">
        {active >= 0 && (
          <span
            aria-hidden="true"
            className="absolute inset-y-1.5 left-1.5 w-[calc((100%-12px)/6)] motion-safe:transition-transform motion-safe:duration-450 motion-safe:ease-slide"
            style={{ transform: `translateX(${String(active * 100)}%)` }}
          >
            <span className="lime-gloss absolute inset-y-0 inset-x-0.75 rounded-field" />
          </span>
        )}
        <ul className="relative grid grid-cols-6">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex justify-center">
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "flex h-12.5 w-full items-center justify-center rounded-field active:scale-90 motion-safe:transition-[color,transform] motion-safe:duration-300",
                    isActive ? "text-accent-ink" : "text-muted hover:text-ink",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      aria-hidden="true"
                      className="size-5.5"
                      strokeWidth={isActive ? 2 : 1.75}
                    />
                    <span className="sr-only">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
