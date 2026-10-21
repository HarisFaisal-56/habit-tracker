import { useSyncExternalStore } from "react";
import { canPromptInstall, isInstalled, isIos, subscribeToInstall } from "../platform/install";

export type InstallState =
  /** Already running as an installed app. */
  | "installed"
  /** The browser offered an install prompt we can show. */
  | "available"
  /** iOS: install manually via Share → Add to Home Screen. */
  | "ios"
  /** No install path we can offer (e.g. Firefox desktop, or not yet eligible). */
  | "unavailable";

function getInstallState(): InstallState {
  if (isInstalled()) return "installed";
  if (canPromptInstall()) return "available";
  if (isIos()) return "ios";
  return "unavailable";
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribeToInstall, getInstallState);
}
