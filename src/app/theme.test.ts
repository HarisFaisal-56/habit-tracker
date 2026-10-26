// @vitest-environment jsdom
import indexHtml from "../../index.html?raw";
import { afterEach, describe, expect, it } from "vitest";
import { SETTINGS_STORAGE_KEY, useSettings } from "../store/settingsStore";
import { applyTheme, resolveTheme } from "./theme";

const realMatchMedia = window.matchMedia.bind(window);

function setSystemDark(dark: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: dark && query.includes("prefers-color-scheme: dark"),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

afterEach(() => {
  window.matchMedia = realMatchMedia;
  document.head.innerHTML = "";
});

describe("resolveTheme", () => {
  it("uses the system setting for 'system'", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("lets an explicit choice override the system", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("applyTheme", () => {
  it("toggles the dark class, native control colours and the browser theme colour", () => {
    document.head.innerHTML = `
      <meta name="theme-color" content="#f6f6f1" media="(prefers-color-scheme: light)">
      <meta name="theme-color" content="#07080b" media="(prefers-color-scheme: dark)">`;
    const root = document.documentElement;
    const colours = () =>
      [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map(
        (meta) => meta.content,
      );

    applyTheme("dark");
    expect(root).toHaveClass("dark");
    expect(root.style.colorScheme).toBe("dark");
    expect(colours()).toEqual(["#07080b", "#07080b"]);

    applyTheme("light");
    expect(root).not.toHaveClass("dark");
    expect(root.style.colorScheme).toBe("light");
    expect(colours()).toEqual(["#f6f6f1", "#f6f6f1"]);
  });
});

describe("index.html's pre-paint theme script", () => {
  const script = /<script>([\s\S]*?)<\/script>/.exec(indexHtml)?.[1];

  function runScript() {
    if (!script) throw new Error("inline theme script not found in index.html");
    // Runs the exact script the browser runs before the app loads.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const run = new Function(script) as () => void;
    run();
  }

  it("reads the theme that the settings store saves", () => {
    useSettings.getState().setTheme("dark");
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain('"theme":"dark"');

    runScript();

    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("follows the system when nothing is saved or the setting is 'system'", () => {
    setSystemDark(true);
    runScript();
    expect(document.documentElement).toHaveClass("dark");

    setSystemDark(false);
    useSettings.getState().setTheme("system");
    runScript();
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("lets a saved light theme override a dark system", () => {
    setSystemDark(true);
    useSettings.getState().setTheme("light");
    runScript();
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("falls back to the system setting when the saved value is unreadable", () => {
    setSystemDark(true);
    localStorage.setItem(SETTINGS_STORAGE_KEY, "{not json");
    runScript();
    expect(document.documentElement).toHaveClass("dark");
  });
});
