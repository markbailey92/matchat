"use client";

import { useState } from "react";
import { touchButtonClass, touchInputClass } from "@/lib/layout";

interface DisplayNameSetupProps {
  name: string;
  onSave: (name: string) => void;
}

const chipClass =
  "inline-flex items-center gap-1 rounded-full border border-[var(--card-border)] bg-[var(--card)]";

export function DisplayNameSetup({ name, onSave }: DisplayNameSetupProps) {
  const [draft, setDraft] = useState(name);
  const [editing, setEditing] = useState(!name);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setEditing(false);
  };

  if (!editing && name) {
    return (
      <div className={chipClass}>
        <span className="px-3 py-1.5 text-sm font-semibold text-[var(--foreground)]">
          {name}
        </span>
        <button
          type="button"
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
          className={`mr-1 rounded-full px-2.5 py-1 text-xs text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] ${touchButtonClass}`}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className={`${chipClass} max-w-[min(100%,16rem)] p-1 sm:max-w-xs`}>
      <input
        type="text"
        placeholder="e.g. GoonerDave"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        className={`min-w-0 flex-1 rounded-full border-0 bg-transparent px-3 py-1.5 outline-none focus:ring-0 ${touchInputClass}`}
        autoFocus
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={!draft.trim()}
        className={`shrink-0 rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50 ${touchButtonClass}`}
      >
        Save
      </button>
      {name && (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className={`mr-1 shrink-0 rounded-full px-2.5 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] ${touchButtonClass}`}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
