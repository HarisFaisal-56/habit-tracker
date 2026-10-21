import { vi } from "vitest";

export type ShownNotification = { title: string; options: NotificationOptions | undefined };

/**
 * Installs a stand-in for the browser's Notification API (jsdom has none).
 * `requestPermission` resolves to `grantOnRequest`. Undo with vi.unstubAllGlobals().
 */
export function installFakeNotification(
  permission: NotificationPermission = "default",
  grantOnRequest: NotificationPermission = "granted",
) {
  const shown: ShownNotification[] = [];

  class FakeNotification extends EventTarget {
    static permission: NotificationPermission = permission;
    static requestPermission = vi.fn(() => {
      FakeNotification.permission = grantOnRequest;
      return Promise.resolve(grantOnRequest);
    });

    readonly title: string;

    constructor(title: string, options?: NotificationOptions) {
      super();
      this.title = title;
      shown.push({ title, options });
    }

    close(): void {
      // Nothing to close in tests.
    }
  }

  vi.stubGlobal("Notification", FakeNotification);
  return { FakeNotification, shown };
}
