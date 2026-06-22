"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { touchButtonClass } from "@/lib/layout";
import { CommentSection } from "./CommentSection";

interface CommentSlidePanelProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  authorName: string;
  onCountChange?: (count: number) => void;
}

export function CommentSlidePanel({
  open,
  onClose,
  eventId,
  eventTitle,
  authorName,
  onCountChange,
}: CommentSlidePanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[90] bg-black/50 transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Comments on ${eventTitle}`}
        className={`fixed inset-x-0 bottom-0 z-[100] flex max-h-[75dvh] flex-col rounded-t-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-2xl transition-transform duration-300 ease-out ${
          open
            ? "pointer-events-auto translate-y-0"
            : "pointer-events-none translate-y-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--card-border)] px-4 py-3 pt-4">
          <div className="min-w-0 pr-4">
            <p className="text-sm font-semibold">Comments</p>
            <p className="truncate text-xs text-[var(--muted)]">{eventTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--background)] text-lg text-[var(--muted)] hover:text-[var(--foreground)] ${touchButtonClass}`}
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <CommentSection
            eventId={eventId}
            unlocked
            authorName={authorName}
            layout="panel"
            onCountChange={onCountChange}
          />
        </div>
      </div>
    </>,
    document.body
  );
}
