"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * A modal dialog built on the native <dialog> element, so focus is trapped,
 * Escape closes it and the page behind is inert. Clicking the dark area closes it.
 */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[min(560px,calc(100vw-24px))] bg-elevated p-0 text-ink"
    >
      {open ? (
        <div className="flex flex-col gap-5 p-6 md:p-9">
          <h2 id={titleId} className="text-[30px] font-bold leading-[1.1] md:text-4xl">
            {title}
          </h2>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
