// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pickTextFile, saveTextFile } from "./files";

describe("saveTextFile", () => {
  // jsdom has no object URLs.
  const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:backup");

  beforeEach(() => {
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
  });

  it("downloads the contents through a temporary link", () => {
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe("backup.json");
      expect(this.href).toBe("blob:backup");
    });

    saveTextFile("backup.json", "{}", "application/json");

    expect(clicked).toHaveBeenCalledOnce();
    expect(document.querySelector("a")).toBeNull(); // cleaned up
    expect(createObjectURL.mock.calls[0]?.[0].type).toBe("application/json");
    clicked.mockRestore();
  });
});

describe("pickTextFile", () => {
  let click: { mock: { contexts: unknown[] } };
  /** The file input the picker opened (`this` of its click() call). */
  const opened = () => click.mock.contexts[0] as HTMLInputElement | undefined;

  beforeEach(() => {
    click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function choose(file: File | null) {
    const input = opened();
    if (!input) throw new Error("file picker wasn't opened");
    Object.defineProperty(input, "files", { value: file ? [file] : [] });
    input.dispatchEvent(new Event("change"));
  }

  it("returns the chosen file's text", async () => {
    const picked = pickTextFile(".json");
    expect(opened()?.type).toBe("file");
    expect(opened()?.accept).toBe(".json");

    choose(new File(['{"ok":true}'], "backup.json"));

    await expect(picked).resolves.toBe('{"ok":true}');
  });

  it("returns null when the picker is cancelled", async () => {
    const picked = pickTextFile(".json");
    opened()?.dispatchEvent(new Event("cancel"));
    await expect(picked).resolves.toBeNull();
  });

  it("returns null when no file comes back", async () => {
    const picked = pickTextFile(".json");
    choose(null);
    await expect(picked).resolves.toBeNull();
  });
});
