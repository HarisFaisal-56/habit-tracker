/** Minimal key-value storage for small per-device preferences (not app data). */
export type PreferencesStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function memoryStorage(): PreferencesStorage {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

/**
 * localStorage on the web. Falls back to memory when it's missing or blocked
 * (some private modes throw on access), so preferences just don't persist.
 * A Capacitor build can swap in the Preferences plugin here.
 */
export function getPreferencesStorage(): PreferencesStorage {
  try {
    const storage = globalThis.localStorage;
    const probe = "__habit-tracker-probe__";
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    return memoryStorage();
  }
}
