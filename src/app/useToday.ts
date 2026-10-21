import { useEffect, useState } from "react";
import { today, type DateKey } from "../domain/dates";

function msUntilNextMidnight(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}

/**
 * Today's local date, updated at midnight and whenever the app comes back to the
 * foreground (phones pause timers in the background).
 */
export function useToday(): DateKey {
  const [date, setDate] = useState(today);

  useEffect(() => {
    const refresh = () => {
      setDate(today());
    };
    // A second past midnight, so the clock has definitely moved to the new day.
    const timer = window.setTimeout(refresh, msUntilNextMidnight() + 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [date]);

  return date;
}
