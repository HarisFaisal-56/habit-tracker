import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../test/renderApp";
import { tabs } from "./tabs";

function renderAt(path: string) {
  return renderApp(path).router;
}

function getTabBar() {
  return screen.getByRole("navigation", { name: "Main" });
}

describe("AppLayout", () => {
  it("renders a tab for every screen", () => {
    renderAt("/");

    const links = within(getTabBar()).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(tabs.map((tab) => tab.label));
  });

  it("shows the Today screen at the root and marks its tab as current", () => {
    renderAt("/");

    expect(screen.getByRole("heading", { level: 1, name: "Today’s orbit" })).toBeInTheDocument();
    expect(within(getTabBar()).getByRole("link", { name: "Today" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("navigates between screens from the tab bar", async () => {
    const { router, user } = renderApp("/");

    await user.click(within(getTabBar()).getByRole("link", { name: "Stats" }));

    expect(router.state.location.pathname).toBe("/stats");
    expect(screen.getByRole("heading", { level: 1, name: "Stats" })).toBeInTheDocument();
    expect(within(getTabBar()).getByRole("link", { name: "Stats" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(getTabBar()).getByRole("link", { name: "Today" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it.each([
    ["/habits", "Your habits"],
    ["/history", "History"],
    ["/review", "Weekly review"],
    ["/settings", "Settings"],
  ])("renders %s directly", (path, heading) => {
    renderAt(path);

    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
  });

  it("redirects unknown paths to Today", () => {
    const router = renderAt("/does-not-exist");

    expect(router.state.location.pathname).toBe("/");
    expect(screen.getByRole("heading", { level: 1, name: "Today’s orbit" })).toBeInTheDocument();
  });
});
