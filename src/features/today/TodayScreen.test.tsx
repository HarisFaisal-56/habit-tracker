import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NewHabit } from "../../data/repository";
import { createTestRepository, renderApp } from "../../test/renderApp";

const reading: NewHabit = {
  name: "Read",
  emoji: "📚",
  color: "emerald",
  schedule: { type: "daily" },
  minimumVersion: "One page",
};
const running: NewHabit = { name: "Run", emoji: "🏃", color: "sky", schedule: { type: "daily" } };

function setDate(year: number, month: number, day: number) {
  vi.setSystemTime(new Date(year, month - 1, day, 9, 0));
}

beforeEach(() => {
  // Only fake Date: IndexedDB in tests relies on real timers.
  vi.useFakeTimers({ toFake: ["Date"] });
  setDate(2025, 1, 8); // Wednesday
});

afterEach(() => {
  vi.useRealTimers();
});

/** The tap-to-toggle button on a habit tile (not the ⋯ button). */
function tile(name: string): HTMLElement {
  const button = screen.getByText(name, { selector: "button span" }).closest("button");
  if (!button) throw new Error(`No tile for ${name}`);
  return button;
}

function progress() {
  return screen.getByRole("progressbar", { name: "Habits closed today" });
}

async function openOptions(user: ReturnType<typeof renderApp>["user"], name: string) {
  await user.click(screen.getByRole("button", { name: `More options for ${name}` }));
  return screen.getByRole("dialog", { name: new RegExp(name) });
}

describe("TodayScreen", () => {
  describe("first run", () => {
    it("welcomes a new user with the app's principles and the date", async () => {
      renderApp("/");

      expect(screen.getByText("Wed · 8 Jan · Day 8")).toBeInTheDocument();
      const welcome = await screen.findByRole("region", { name: "Welcome" });
      expect(within(welcome).getByText(/Never miss twice/)).toBeInTheDocument();
      expect(within(welcome).getByText(/Minimum version/)).toBeInTheDocument();
    });

    it("adds a starter habit in one tap", async () => {
      const { user, repository } = renderApp("/");

      const welcome = await screen.findByRole("region", { name: "Welcome" });
      await user.click(within(welcome).getByRole("button", { name: /Read/ }));

      await waitFor(() => {
        expect(screen.queryByRole("region", { name: "Welcome" })).not.toBeInTheDocument();
      });
      expect(await screen.findByRole("button", { name: "More options for Read" })).toBeVisible();
      expect(await repository.listHabits()).toMatchObject([
        { name: "Read", minimumVersion: "Read one page", identity: "I am someone who reads" },
      ]);
    });

    it("goes to the add-habit sheet to create your own, and doesn't show again", async () => {
      const { user, router } = renderApp("/");

      await user.click(await screen.findByRole("button", { name: "Create my own habit" }));

      expect(router.state.location.pathname).toBe("/habits");
      const sheet = screen.getByRole("dialog", { name: "New habit" });
      await user.click(within(sheet).getByRole("button", { name: "Close" }));
      await user.click(screen.getByRole("link", { name: "Today" }));

      // Dismissed: still no habits, so the plain empty state shows instead.
      expect(await screen.findByRole("link", { name: "Add your first habit" })).toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Welcome" })).not.toBeInTheDocument();
    });
  });

  it("checks a habit off with one tap and undoes it with another", async () => {
    const repository = createTestRepository();
    await repository.createHabit(reading);
    await repository.createHabit(running);
    const { user } = renderApp("/", repository);

    await screen.findByText("Read");
    expect(progress()).toHaveAttribute("aria-valuetext", "0 of 2 closed");
    expect(tile("Read")).toHaveAttribute("aria-pressed", "false");

    await user.click(tile("Read"));

    await waitFor(() => {
      expect(progress()).toHaveAttribute("aria-valuetext", "1 of 2 closed");
    });
    expect(tile("Read")).toHaveAttribute("aria-pressed", "true");
    expect(tile("Read")).toHaveAccessibleName(/Done$/);
    expect(screen.getByText("1 orbit still open")).toBeInTheDocument();
    expect(await repository.listCompletions()).toMatchObject([
      { date: "2025-01-08", kind: "full" },
    ]);

    await user.click(tile("Read"));

    await waitFor(() => {
      expect(progress()).toHaveAttribute("aria-valuetext", "0 of 2 closed");
    });
    expect(await repository.listCompletions()).toEqual([]);
  });

  it("celebrates when everything due is done", async () => {
    const repository = createTestRepository();
    await repository.createHabit(reading);
    const { user } = renderApp("/", repository);

    await screen.findByText("Read");
    await user.click(tile("Read"));

    expect(await screen.findByText("All done for today")).toBeInTheDocument();
  });

  it("logs the minimum version from the options sheet", async () => {
    const repository = createTestRepository();
    await repository.createHabit(reading);
    const { user } = renderApp("/", repository);
    await screen.findByText("Read");

    const sheet = await openOptions(user, "Read");
    expect(within(sheet).getByText(/“One page” still counts/)).toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: /Minimum version/ }));

    await waitFor(() => {
      expect(tile("Read")).toHaveAccessibleName(/Minimum version done$/);
    });
    expect(screen.queryByRole("dialog", { name: /Read/ })).not.toBeInTheDocument();
    expect(tile("Read")).toHaveTextContent("Daily · Min One page");
    expect(tile("Read")).toHaveAttribute("aria-pressed", "true");
    // The minimum version counts for the streak but doesn't close the orbit.
    expect(progress()).toHaveAttribute("aria-valuetext", "0 of 1 closed, 1 kept at minimum");
    expect(screen.getByText("All done for today · 1 kept at minimum")).toBeInTheDocument();
  });

  it("skips a habit without counting it as due", async () => {
    const repository = createTestRepository();
    await repository.createHabit(reading);
    await repository.createHabit(running);
    const { user } = renderApp("/", repository);
    await screen.findByText("Read");

    const sheet = await openOptions(user, "Read");
    await user.click(within(sheet).getByRole("button", { name: /Skip today/ }));

    await waitFor(() => {
      expect(tile("Read")).toHaveAccessibleName(/Skipped$/);
    });
    expect(progress()).toHaveAttribute("aria-valuetext", "0 of 1 closed");

    // Tapping a skipped habit marks it done after all.
    await user.click(tile("Read"));
    await waitFor(() => {
      expect(progress()).toHaveAttribute("aria-valuetext", "1 of 2 closed");
    });
  });

  it("saves a note with a completion and lets you edit it or clear the day", async () => {
    const repository = createTestRepository();
    await repository.createHabit(reading);
    const { user } = renderApp("/", repository);
    await screen.findByText("Read");

    let sheet = await openOptions(user, "Read");
    await user.type(within(sheet).getByLabelText(/Note/), "Finished chapter 3");
    await user.click(within(sheet).getByRole("button", { name: /^Done/ }));
    expect(await screen.findByText("Finished chapter 3", { selector: "span" })).toBeInTheDocument();

    sheet = await openOptions(user, "Read");
    const note = within(sheet).getByLabelText(/Note/);
    expect(note).toHaveValue("Finished chapter 3");
    expect(within(sheet).getByRole("button", { name: /^Done/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.clear(note);
    await user.type(note, "Chapter 4 too");
    await user.click(within(sheet).getByRole("button", { name: "Save note" }));
    expect(await screen.findByText("Chapter 4 too", { selector: "span" })).toBeInTheDocument();

    sheet = await openOptions(user, "Read");
    await user.click(within(sheet).getByRole("button", { name: "Clear today" }));
    await waitFor(() => {
      expect(tile("Read")).toHaveAccessibleName(/Not done yet$/);
    });
    expect(screen.queryByText("Chapter 4 too", { selector: "span" })).not.toBeInTheDocument();
  });

  it("opens the options on a long press or right-click", async () => {
    const repository = createTestRepository();
    await repository.createHabit(reading);
    renderApp("/", repository);
    await screen.findByText("Read");

    fireEvent.contextMenu(tile("Read"));

    expect(screen.getByRole("dialog", { name: /Read/ })).toBeInTheDocument();
    expect(await repository.listCompletions()).toEqual([]);
  });

  it("lists habits that aren't due today separately and leaves them out of the ring", async () => {
    const repository = createTestRepository();
    await repository.createHabit(reading);
    await repository.createHabit({ ...running, schedule: { type: "days", days: [1, 5] } });
    const { user } = renderApp("/", repository);

    const otherSection = (await screen.findByRole("heading", { name: "Not due today" }))
      .parentElement as HTMLElement;
    expect(within(otherSection).getByText("Run")).toBeInTheDocument();
    expect(progress()).toHaveAttribute("aria-valuetext", "0 of 1 closed");

    await user.click(tile("Run"));

    await waitFor(() => {
      expect(tile("Run")).toHaveAttribute("aria-pressed", "true");
    });
    expect(progress()).toHaveAttribute("aria-valuetext", "0 of 1 closed");
  });

  it("says when nothing is due", async () => {
    const repository = createTestRepository();
    await repository.createHabit({ ...running, schedule: { type: "days", days: [1] } });
    renderApp("/", repository);

    expect(await screen.findByText("Nothing due today")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("shows streaks and a gentle warning after a missed day", async () => {
    const repository = createTestRepository();
    setDate(2025, 1, 4);
    const habit = await repository.createHabit(reading);
    for (const date of ["2025-01-04", "2025-01-05", "2025-01-06"]) {
      await repository.setCompletion({ habitId: habit.id, date, kind: "full" });
    }
    setDate(2025, 1, 8); // missed the 7th

    renderApp("/", repository);

    await screen.findByText("Read");
    expect(tile("Read")).toHaveTextContent("3d run · Daily · don’t miss twice");
  });

  it("shows weekly goal progress", async () => {
    const repository = createTestRepository();
    setDate(2025, 1, 6);
    const habit = await repository.createHabit({
      ...running,
      schedule: { type: "weekly", timesPerWeek: 3 },
    });
    await repository.setCompletion({ habitId: habit.id, date: "2025-01-06", kind: "full" });
    setDate(2025, 1, 8);

    renderApp("/", repository);

    expect(await screen.findByText("1 of 3 this week")).toBeInTheDocument();
  });

  it("leaves archived habits out", async () => {
    const repository = createTestRepository();
    const habit = await repository.createHabit(reading);
    await repository.createHabit(running);
    await repository.setHabitArchived(habit.id, true);

    renderApp("/", repository);

    expect(await screen.findByText("Run")).toBeInTheDocument();
    expect(screen.queryByText("Read")).not.toBeInTheDocument();
  });

  it("shows the habit's identity in the options sheet", async () => {
    const repository = createTestRepository();
    await repository.createHabit({ ...reading, identity: "I am someone who reads" });
    const { user } = renderApp("/", repository);
    await screen.findByText("Read");

    const sheet = await openOptions(user, "Read");

    expect(within(sheet).getByText("“I am someone who reads”")).toBeInTheDocument();
  });

  describe("weekly review prompt", () => {
    it("appears on Sunday and leads to the review", async () => {
      const repository = createTestRepository();
      await repository.createHabit(reading);
      setDate(2025, 1, 12); // Sunday
      const { user, router } = renderApp("/", repository);

      await user.click(await screen.findByRole("link", { name: /time for your weekly review/ }));

      expect(router.state.location.pathname).toBe("/review");
    });

    it("goes away once this week's review is saved", async () => {
      const repository = createTestRepository();
      await repository.createHabit(reading);
      await repository.saveWeeklyReview({
        weekStart: "2025-01-06",
        wins: "Good week",
        struggles: "",
        intention: "",
      });
      setDate(2025, 1, 12);
      renderApp("/", repository);

      await screen.findByText("Read");
      expect(screen.queryByRole("link", { name: /weekly review/ })).not.toBeInTheDocument();
    });

    it("doesn't appear on other days", async () => {
      const repository = createTestRepository();
      await repository.createHabit(reading);
      renderApp("/", repository); // Wednesday

      await screen.findByText("Read");
      expect(screen.queryByRole("link", { name: /weekly review/ })).not.toBeInTheDocument();
    });
  });
});
