import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "../components/Button";

/**
 * Registers the service worker and tells the user when the app is ready offline
 * or when a new version is waiting. Updates only apply when the user reloads,
 * so nothing changes under them mid-check-off.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: unknown) {
      console.error("Service worker registration failed", error);
    },
  });

  if (!needRefresh && !offlineReady) return null;

  const close = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-safe">
      <div
        role="status"
        className="pointer-events-auto mx-auto mb-18 flex max-w-md items-center gap-2 rounded-2xl bg-stone-900 py-2 pr-2 pl-4 text-sm text-white shadow-lg dark:bg-stone-100 dark:text-stone-900"
      >
        <p className="flex-1">
          {needRefresh ? "A new version is ready." : "Ready to work offline."}
        </p>
        {needRefresh && (
          <Button
            onClick={() => {
              void updateServiceWorker(true);
            }}
          >
            Reload
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={close}
          className="text-white hover:bg-white/10 active:bg-white/10 dark:text-stone-900 dark:hover:bg-stone-900/10"
        >
          {needRefresh ? "Later" : "OK"}
        </Button>
      </div>
    </div>
  );
}
