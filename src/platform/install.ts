// "Install app" support. Chromium browsers fire beforeinstallprompt, which we keep
// so the app can offer its own Install button. iOS Safari has no such event, so the
// UI explains Share → Add to Home Screen instead. Not needed in a Capacitor build.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** Starts listening for install events. Call once, as early as possible. */
export function initInstallPrompt(): void {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Stop the browser's own mini-infobar; Settings shows an Install button instead.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });
}

export function subscribeToInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

/** Shows the browser's install dialog, if available. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const prompt = deferredPrompt;
  if (!prompt) return "unavailable";
  // A prompt can only be used once.
  deferredPrompt = null;
  notify();
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  return outcome;
}

/** Running as an installed app rather than in a browser tab. */
export function isInstalled(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return installed || iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

/** iPhone or iPad, where installing is a manual Share → Add to Home Screen step. */
export function isIos(): boolean {
  const iPadOs = navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || iPadOs;
}
