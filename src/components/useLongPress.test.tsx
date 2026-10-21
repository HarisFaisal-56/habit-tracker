import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLongPress } from "./useLongPress";

function Target({ onLongPress, onClick }: { onLongPress: () => void; onClick: () => void }) {
  const longPress = useLongPress(onLongPress);
  return (
    <button type="button" onClick={onClick} {...longPress}>
      Habit
    </button>
  );
}

function setup() {
  const onLongPress = vi.fn();
  const onClick = vi.fn();
  render(<Target onLongPress={onLongPress} onClick={onClick} />);
  return { onLongPress, onClick, button: screen.getByRole("button") };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useLongPress", () => {
  it("fires after holding and swallows the click that ends the press", () => {
    const { onLongPress, onClick, button } = setup();

    fireEvent.pointerDown(button, { button: 0, clientX: 10, clientY: 10 });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerUp(button);
    fireEvent.click(button);

    expect(onLongPress).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();

    // The next ordinary tap works again.
    fireEvent.pointerDown(button, { button: 0 });
    fireEvent.pointerUp(button);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("treats a short press as a normal tap", () => {
    const { onLongPress, onClick, button } = setup();

    fireEvent.pointerDown(button, { button: 0 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.pointerUp(button);
    fireEvent.click(button);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("cancels when the finger moves, e.g. to scroll", () => {
    const { onLongPress, button } = setup();

    fireEvent.pointerDown(button, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(button, { clientX: 10, clientY: 40 });
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("opens on right-click or the Android context menu without blocking the next click", () => {
    const { onLongPress, onClick, button } = setup();

    fireEvent.contextMenu(button);
    expect(onLongPress).toHaveBeenCalledOnce();

    // A keyboard activation has no pointerdown; it must not be swallowed.
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("doesn't fire twice when the timer and the context menu both trigger", () => {
    const { onLongPress, button } = setup();

    fireEvent.pointerDown(button, { button: 0 });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.contextMenu(button);

    expect(onLongPress).toHaveBeenCalledOnce();
  });
});
