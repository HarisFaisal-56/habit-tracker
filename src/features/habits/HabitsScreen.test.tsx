import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NewHabit } from "../../data/repository";
import { createTestRepository, renderApp } from "../../test/renderApp";

const habit = (name: string, overrides: Partial<NewHabit> = {}): NewHabit => ({
  name,
  emoji: "✅",
  color: "emerald",
  schedule: { type: "daily" },
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2025, 0, 8, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

function sheet(name: string) {
  return screen.getByRole("dialog", { name });
}

/** Names of habits in a list, in order. */
function namesIn(listName: string) {
  const list = screen.getByRole("list", { name: listName });
  return within(list)
    .getAllByRole("listitem")
    .map((item) => item.querySelector(".font-medium")?.textContent);
}

describe("HabitsScreen", () => {
  it("adds a habit from the empty state", async () => {
    const { user, repository } = renderApp("/habits");

    await user.click(await screen.findByRole("button", { name: "Add habit" }));
    const form = sheet("New habit");
    await user.type(within(form).getByLabelText("Name"), "  Read  ");
    await user.click(within(form).getByRole("radio", { name: "📚" }));
    await user.click(within(form).getByRole("radio", { name: "Blue" }));
    await user.type(within(form).getByLabelText(/Minimum version/), "One page");
    await user.click(within(form).getByRole("button", { name: "Add habit" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "New habit" })).not.toBeInTheDocument();
    });
    expect(await screen.findByRole("button", { name: /Read/ })).toHaveTextContent("Daily");
    expect(await repository.listHabits()).toMatchObject([
      {
        name: "Read",
        emoji: "📚",
        color: "sky",
        minimumVersion: "One page",
        schedule: { type: "daily" },
        createdAt: "2025-01-08",
      },
    ]);
  });

  it("shows validation errors only after trying to save", async () => {
    const { user, repository } = renderApp("/habits");

    await user.click(await screen.findByRole("button", { name: "Add habit" }));
    const form = sheet("New habit");
    const name = within(form).getByLabelText("Name");
    expect(name).not.toHaveAttribute("aria-invalid");

    await user.click(within(form).getByRole("button", { name: "Add habit" }));

    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Give your habit a name.");
    expect(name).toHaveFocus();

    await user.click(within(form).getByRole("radio", { name: "Some days" }));
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]) {
      await user.click(within(form).getByRole("checkbox", { name: day }));
    }
    expect(within(form).getByText("Pick at least one day.")).toBeInTheDocument();
    expect(await repository.listHabits()).toEqual([]);
  });

  it("saves specific-day and weekly schedules", async () => {
    const { user } = renderApp("/habits");

    await user.click(await screen.findByRole("button", { name: "Add habit" }));
    let form = sheet("New habit");
    await user.type(within(form).getByLabelText("Name"), "Gym");
    await user.click(within(form).getByRole("radio", { name: "Some days" }));
    // Weekdays are preselected; keep Mon, Wed, Fri.
    await user.click(within(form).getByRole("checkbox", { name: "Tuesday" }));
    await user.click(within(form).getByRole("checkbox", { name: "Thursday" }));
    await user.click(within(form).getByRole("button", { name: "Add habit" }));
    expect(await screen.findByRole("button", { name: /Gym/ })).toHaveTextContent("Mon, Wed, Fri");

    await user.click(screen.getByRole("button", { name: "Add habit" }));
    form = sheet("New habit");
    await user.type(within(form).getByLabelText("Name"), "Swim");
    await user.click(within(form).getByRole("radio", { name: "Weekly goal" }));
    expect(within(form).getByText("3 times a week")).toBeInTheDocument();
    await user.click(within(form).getByRole("button", { name: "More times" }));
    await user.click(within(form).getByRole("button", { name: "Add habit" }));
    expect(await screen.findByRole("button", { name: /Swim/ })).toHaveTextContent("4 times a week");
  });

  it("limits weekly goals to between 1 and 7", async () => {
    const { user } = renderApp("/habits");

    await user.click(await screen.findByRole("button", { name: "Add habit" }));
    const form = sheet("New habit");
    await user.click(within(form).getByRole("radio", { name: "Weekly goal" }));
    const fewer = within(form).getByRole("button", { name: "Fewer times" });
    await user.click(fewer);
    await user.click(fewer);

    expect(within(form).getByText("Once a week")).toBeInTheDocument();
    expect(fewer).toBeDisabled();
  });

  it("edits a habit, including clearing its minimum version", async () => {
    const repository = createTestRepository();
    const created = await repository.createHabit(habit("Read", { minimumVersion: "One page" }));
    const { user } = renderApp("/habits", repository);

    await user.click(await screen.findByRole("button", { name: /Read/ }));
    const form = sheet("Edit habit");
    const name = within(form).getByLabelText("Name");
    expect(name).toHaveValue("Read");
    await user.clear(name);
    await user.type(name, "Read fiction");
    await user.clear(within(form).getByLabelText(/Minimum version/));
    await user.click(within(form).getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("button", { name: /Read fiction/ })).toBeInTheDocument();
    const saved = await repository.getHabit(created.id);
    expect(saved?.name).toBe("Read fiction");
    expect(saved?.minimumVersion).toBeUndefined();
  });

  it("cancels an edit without saving", async () => {
    const repository = createTestRepository();
    await repository.createHabit(habit("Read"));
    const { user } = renderApp("/habits", repository);

    await user.click(await screen.findByRole("button", { name: /Read/ }));
    const form = sheet("Edit habit");
    await user.type(within(form).getByLabelText("Name"), " more");
    await user.click(within(form).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Edit habit" })).not.toBeInTheDocument();
    expect((await repository.listHabits())[0]?.name).toBe("Read");
  });

  it("archives, restores and deletes habits", async () => {
    const repository = createTestRepository();
    const read = await repository.createHabit(habit("Read"));
    await repository.setCompletion({ habitId: read.id, date: "2025-01-08", kind: "full" });
    await repository.createHabit(habit("Run"));
    const { user } = renderApp("/habits", repository);

    await user.click(await screen.findByRole("button", { name: /Read/ }));
    await user.click(within(sheet("Edit habit")).getByRole("button", { name: "Archive habit" }));

    await waitFor(() => {
      expect(namesIn("Your habits")).toEqual(["Run"]);
    });
    await user.click(screen.getByRole("button", { name: "Archived · 1" }));
    expect(namesIn("Archived habits")).toEqual(["Read"]);

    // Restore it.
    await user.click(
      within(screen.getByRole("list", { name: "Archived habits" })).getByRole("button"),
    );
    await user.click(within(sheet("Edit habit")).getByRole("button", { name: "Restore habit" }));
    await user.click(screen.getByRole("button", { name: "Active" }));
    await waitFor(() => {
      expect(namesIn("Your habits")).toEqual(["Read", "Run"]);
    });

    // Archive again, then delete for good (with confirmation).
    await user.click(screen.getByRole("button", { name: /Read/ }));
    await user.click(within(sheet("Edit habit")).getByRole("button", { name: "Archive habit" }));
    await user.click(await screen.findByRole("button", { name: "Archived · 1" }));
    await user.click(
      within(screen.getByRole("list", { name: "Archived habits" })).getByRole("button"),
    );
    const editSheet = sheet("Edit habit");
    await user.click(within(editSheet).getByRole("button", { name: "Delete habit" }));
    expect(within(editSheet).getByText(/all of its history/)).toBeInTheDocument();
    await user.click(within(editSheet).getByRole("button", { name: "Delete forever" }));

    await waitFor(() => {
      expect(screen.queryByRole("list", { name: "Archived habits" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Archived · 0" })).toBeInTheDocument();
    expect(await repository.getHabit(read.id)).toBeUndefined();
    expect(await repository.listCompletions()).toEqual([]);
  });

  it("reorders habits with move buttons", async () => {
    const repository = createTestRepository();
    for (const name of ["Read", "Run", "Meditate"]) {
      await repository.createHabit(habit(name));
    }
    const { user } = renderApp("/habits", repository);
    await screen.findByRole("button", { name: /Meditate/ });

    const [grip] = screen.getAllByRole("button", { name: "Reorder habits" });
    if (!grip) throw new Error("No reorder grip");
    await user.click(grip);
    expect(screen.queryByRole("button", { name: "Reorder habits" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move Read up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Meditate down" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Move Meditate up" }));
    await waitFor(() => {
      expect(namesIn("Your habits")).toEqual(["Read", "Meditate", "Run"]);
    });
    await user.click(screen.getByRole("button", { name: "Move Read down" }));
    await waitFor(() => {
      expect(namesIn("Your habits")).toEqual(["Meditate", "Read", "Run"]);
    });

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("button", { name: /Move/ })).not.toBeInTheDocument();
    expect((await repository.listHabits()).map((h) => h.name)).toEqual(["Meditate", "Read", "Run"]);
  });

  it("saves an identity statement, shows it, and can clear it", async () => {
    const { user, repository } = renderApp("/habits");

    await user.click(await screen.findByRole("button", { name: "Add habit" }));
    let form = sheet("New habit");
    await user.type(within(form).getByLabelText("Name"), "Read");
    await user.type(within(form).getByLabelText(/Who you’re becoming/), " I am someone who reads ");
    await user.click(within(form).getByRole("button", { name: "Add habit" }));

    const row = await screen.findByRole("button", { name: /Read/ });
    expect(row).toHaveTextContent("“I am someone who reads”");
    expect((await repository.listHabits())[0]?.identity).toBe("I am someone who reads");

    await user.click(row);
    form = sheet("Edit habit");
    await user.clear(within(form).getByLabelText(/Who you’re becoming/));
    await user.click(within(form).getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Read/ })).not.toHaveTextContent("“");
    });
    expect((await repository.listHabits())[0]?.identity).toBeUndefined();
  });

  it("sets a reminder time, shows it, and can remove it", async () => {
    const { user, repository } = renderApp("/habits");

    await user.click(await screen.findByRole("button", { name: "Add habit" }));
    let form = sheet("New habit");
    await user.type(within(form).getByLabelText("Name"), "Read");
    // Until reminders are switched on, the form says where to do that.
    expect(within(form).getByText(/Turn on reminders in Settings/)).toBeInTheDocument();
    await user.type(within(form).getByLabelText(/Reminder/), "20:30");
    await user.click(within(form).getByRole("button", { name: "Add habit" }));

    const row = await screen.findByRole("button", { name: /Read/ });
    expect(row).toHaveTextContent("Daily · reminder 8:30 PM");
    expect((await repository.listHabits())[0]?.reminderTime).toBe("20:30");

    await user.click(row);
    form = sheet("Edit habit");
    await user.click(within(form).getByRole("button", { name: "Remove reminder" }));
    await user.click(within(form).getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Read/ })).not.toHaveTextContent("reminder");
    });
    expect((await repository.listHabits())[0]?.reminderTime).toBeUndefined();
  });

  it("opens the add sheet straight away from /habits?new and clears it on close", async () => {
    const { user, router } = renderApp("/habits?new");

    const form = await screen.findByRole("dialog", { name: "New habit" });
    await user.click(within(form).getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog", { name: "New habit" })).not.toBeInTheDocument();
    expect(router.state.location.search).toBe("");
  });
});
