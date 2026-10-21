import { useEffect } from "react";
import { useSettings } from "../store/settingsStore";
import { applyTheme, DARK_SCHEME_QUERY, resolveTheme } from "./theme";

/** Keeps the document's theme in sync with the setting and, for "system", the OS. */
export function useApplyTheme(): void {
  const preference = useSettings((state) => state.theme);

  useEffect(() => {
    const query = window.matchMedia(DARK_SCHEME_QUERY);
    const update = () => {
      applyTheme(resolveTheme(preference, query.matches));
    };
    update();
    query.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
    };
  }, [preference]);
}
