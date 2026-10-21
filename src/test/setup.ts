// Must load before Dexie: Dexie reads the global indexedDB once at import, and
// liveQuery (useLiveQuery) silently never runs without it. Tests still pass a
// fresh IDBFactory per database for isolation.
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// findBy*/waitFor default to 1s. With the whole suite running in parallel, the first
// render in a file (module loading plus opening IndexedDB) can take several seconds.
// A longer limit only costs time when a test is genuinely failing.
configure({ asyncUtilTimeout: 10_000 });

// jsdom has <dialog> but not its modal API. Browsers implement it natively.
if (
  typeof HTMLDialogElement !== "undefined" &&
  typeof HTMLDialogElement.prototype.showModal !== "function"
) {
  Object.defineProperty(HTMLDialogElement.prototype, "open", {
    configurable: true,
    get(this: HTMLDialogElement) {
      return this.hasAttribute("open");
    },
  });
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

afterEach(() => {
  cleanup();
});
