import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NewHabit } from "../../data/repository";
import { createTestRepository, renderApp } from "../../test/renderApp";

const reading: NewHabit = {
  name: "Read",
  emoji: "📚",
  color: "emerald",
  schedule: { type: "daily" },
  identity: "I am someone who reads",
};

function setDate(year: number, month: number, day: number) {
  vi.setSystemTime(new Date(year, month - 1, day, 9, 0));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  setDate(2025, 1, 6); // Monday
});

afterEach(() => {
  vi.useRealTimers();
});

async function withReadingHabit(doneDates: string[] = []) {
  const repository = createTestRepository();
  const habit = await repository.createHabit(reading);
  for (const date of doneDates) {
    await repository.setCompletion({ habitId: habit.id, date, kind: "full" });
  }
  return repository;
}

describe("ReviewScreen", () => {
  it("explains the review when there's nothing yet", async () => {
    renderApp("/review");
    expect(await screen.findByRole("link", { name: "Add your first habit" })).toBeInTheDocument();
  });

  it("summarizes this week with each habit's identity", async () => {
    const repository = await withReadingHabit(["2025-01-06", "2025-01-07"]);
    setDate(2025, 1, 8); // Wednesday
    renderApp("/review", repository);

    expect(await screen.findByText("6–12 January 2025")).toBeInTheDocument();
    expect(screen.getByText("6–12 Jan")).toBeInTheDocument();
    const votes = screen.getByRole("region", { name: "Identity votes" });
    expect(within(votes).getByText("I am someone who reads")).toBeInTheDocument();
    expect(within(votes).getByText("2 votes")).toBeInTheDocument();
    // Monday and Tuesday done; Wednesday (today) still to do.
    expect(screen.getByRole("region", { name: "Check-ins" })).toHaveTextContent("2/3");
  });

  it("saves a review, then lets you update it", async () => {
    const repository = await withReadingHabit();
    const { user } = renderApp("/review", repository);

    const save = await screen.findByRole("button", { name: /^Lock in week 3$/ });
    expect(save).toBeDisabled(); // nothing written yet

    await user.type(screen.getByLabelText("Wins"), "  Read every morning ");
    await user.type(screen.getByLabelText("Friction"), "Late nights");
    await user.type(screen.getByLabelText("Next week, I will"), "Phone out of the bedroom");
    await user.click(save);

    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    const update = await screen.findByRole("button", { name: "Update week 3" });
    expect(update).toBeDisabled(); // unchanged since saving
    expect(await repository.listWeeklyReviews()).toMatchObject([
      {
        weekStart: "2025-01-06",
        wins: "Read every morning",
        struggles: "Late nights",
        intention: "Phone out of the bedroom",
      },
    ]);

    await user.type(screen.getByLabelText("Wins"), ", twice");
    expect(screen.queryByText("Saved.")).not.toBeInTheDocument();
    await user.click(update);

    await waitFor(async () => {
      expect((await repository.listWeeklyReviews())[0]?.wins).toBe("Read every morning, twice");
    });
    expect(await repository.listWeeklyReviews()).toHaveLength(1);
  });

  it("opens with this week's saved review filled in", async () => {
    const repository = await withReadingHabit();
    await repository.saveWeeklyReview({
      weekStart: "2025-01-06",
      wins: "Good start",
      struggles: "",
      intention: "Keep going",
    });
    renderApp("/review", repository);

    expect(await screen.findByLabelText("Wins")).toHaveValue("Good start");
    expect(screen.getByLabelText("Next week, I will")).toHaveValue("Keep going");
    expect(screen.getByRole("button", { name: "Update week 3" })).toBeInTheDocument();
  });

  it("nudges on Sunday until the review is saved", async () => {
    const repository = await withReadingHabit();
    setDate(2025, 1, 12); // Sunday
    const { user } = renderApp("/review", repository);

    expect(await screen.findByText(/It’s Sunday/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Wins"), "A calm week");
    await user.click(screen.getByRole("button", { name: /^Lock in week 3$/ }));

    await waitFor(() => {
      expect(screen.queryByText(/It’s Sunday/)).not.toBeInTheDocument();
    });
  });

  it("doesn't nudge on other days", async () => {
    const repository = await withReadingHabit();
    setDate(2025, 1, 11); // Saturday
    renderApp("/review", repository);

    await screen.findByRole("button", { name: /^Lock in week 3$/ });
    expect(screen.queryByText(/It’s Sunday/)).not.toBeInTheDocument();
  });

  it("shows last week's intention and lets you review last week", async () => {
    setDate(2024, 12, 30);
    const repository = await withReadingHabit(["2024-12-31"]);
    await repository.saveWeeklyReview({
      weekStart: "2024-12-30",
      wins: "Started reading",
      struggles: "Holidays",
      intention: "Read before bed",
    });
    setDate(2025, 1, 6); // Monday of the next week
    const { user } = renderApp("/review", repository);

    expect(await screen.findByText("“Read before bed”")).toBeInTheDocument();
    expect(screen.getByText("Last week you promised")).toBeInTheDocument();

    // Past reviews are listed and expandable.
    const past = screen.getByRole("region", { name: "Past reviews" });
    await user.click(within(past).getByText("30 December 2024 – 5 January 2025"));
    expect(within(past).getByText("Holidays")).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Week"), "last");

    expect(
      screen.getByText("30 December 2024 – 5 January 2025", { selector: "span" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Wins")).toHaveValue("Started reading");
    // Created on Monday the 30th, done once that week.
    expect(screen.getByRole("region", { name: "Check-ins" })).toHaveTextContent("1/7");
    expect(screen.queryByRole("region", { name: "Past reviews" })).not.toBeInTheDocument();
  });
});
