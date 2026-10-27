import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { habitColor, tint, type StyleWithVars } from "./habitColors";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Shown before the title, e.g. the habit's emoji tile. */
  icon?: ReactNode;
  /** A line under the title, e.g. the habit's identity. */
  subtitle?: ReactNode;
  /** A habit colour key, washed over the top of the sheet. */
  color?: string;
  children: ReactNode;
};

/**
 * A modal bottom sheet (a centred dialog on wider screens). Built on <dialog>,
 * so focus trapping, Escape to close and hiding the page behind it are native.
 * Content is unmounted while closed, so forms inside start fresh each time.
 */
export function Sheet({ open, onClose, title, icon, subtitle, color, children }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const style: StyleWithVars | undefined = color
    ? {
        "--sheet-wash": `radial-gradient(100% 60% at 50% 0%, ${tint(habitColor(color).value, 0.16)}, transparent 70%)`,
      }
    : undefined;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // Clicks on the dialog element itself (not its content) are on the backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
      style={style}
      className="sheet-surface mx-0 mt-auto mb-0 max-h-[90dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-4xl border-b-0 p-0 text-ink backdrop:bg-canvas/66 backdrop:backdrop-blur-md motion-safe:open:animate-sheet-in motion-safe:backdrop:animate-fade sm:m-auto sm:max-w-lg sm:rounded-4xl sm:border-b"
    >
      {open && (
        <div className="flex flex-col gap-4 px-4 pt-2.5 pb-safe-4">
          <span
            aria-hidden="true"
            className="h-1.25 w-9.5 self-center rounded-full bg-line-strong"
          />
          <div className="flex items-center gap-3">
            {icon}
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {subtitle && <p className="mt-0.5 text-sm text-soft/80">{subtitle}</p>}
            </div>
            <button
              type="button"
              aria-label="Close"
              title="Close"
              onClick={onClose}
              className="touch-target flex size-9 shrink-0 items-center justify-center rounded-full bg-raised text-soft hover:text-ink"
            >
              <X aria-hidden="true" className="size-4.5" strokeWidth={2.2} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
