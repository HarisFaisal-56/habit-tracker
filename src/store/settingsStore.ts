import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getPreferencesStorage } from "../platform/storage";

export type ThemePreference = "system" | "light" | "dark";

/** Also read by the inline script in index.html that applies the theme before first paint. */
export const SETTINGS_STORAGE_KEY = "habit-tracker-settings";

type SettingsState = {
  theme: ThemePreference;
  /** The first-run welcome on Today has been dismissed. */
  welcomeDismissed: boolean;
  /** The user turned reminders on (the browser permission is tracked separately). */
  remindersEnabled: boolean;
  setTheme: (theme: ThemePreference) => void;
  setRemindersEnabled: (enabled: boolean) => void;
  dismissWelcome: () => void;
  resetWelcome: () => void;
};

/** Per-device UI preferences. Habit data lives in the database, not here. */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      welcomeDismissed: false,
      remindersEnabled: false,
      setTheme: (theme) => {
        set({ theme });
      },
      setRemindersEnabled: (remindersEnabled) => {
        set({ remindersEnabled });
      },
      dismissWelcome: () => {
        set({ welcomeDismissed: true });
      },
      resetWelcome: () => {
        set({ welcomeDismissed: false });
      },
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(getPreferencesStorage),
      partialize: ({ theme, welcomeDismissed, remindersEnabled }) => ({
        theme,
        welcomeDismissed,
        remindersEnabled,
      }),
    },
  ),
);
