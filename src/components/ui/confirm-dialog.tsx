"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "gold" | "mint" | "orange";
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "gold",
  busy = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={() => !busy && onClose()} title={title}>
      <div className="flex flex-col gap-6 text-base">
        <div className="text-lg leading-relaxed text-ink">{description}</div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button tone="elevated" size="sm" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button tone={tone} size="sm" onClick={() => void onConfirm()} disabled={busy}>
            {busy ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

