import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconButton } from "./Button";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
};

/**
 * A modal bottom sheet (a centred dialog on wider screens). Built on <dialog>,
 * so focus trapping, Escape to close and hiding the page behind it are native.
 * Content is unmounted while closed, so forms inside start fresh each time.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // Clicks on the dialog element itself (not its content) are on the backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
      className="mx-0 mt-auto mb-0 max-h-[90dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-0 text-stone-900 shadow-xl backdrop:bg-stone-950/50 motion-safe:open:animate-sheet-in sm:m-auto sm:max-w-lg sm:rounded-3xl dark:bg-stone-900 dark:text-stone-100"
    >
      {open && (
        <div className="flex flex-col gap-4 px-4 pt-3 pb-safe-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <IconButton label="Close" icon={X} onClick={onClose} className="-mr-2" />
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
