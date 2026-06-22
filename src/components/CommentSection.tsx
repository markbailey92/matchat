"use client";

import { useEffect, useState } from "react";
import type { Comment } from "@/lib/types";
import { touchButtonClass, touchInputClass } from "@/lib/layout";

interface CommentSectionProps {
  eventId: string;
  unlocked: boolean;
  authorName: string;
  layout?: "inline" | "panel";
  onCountChange?: (count: number) => void;
}

export function CommentSection({
  eventId,
  unlocked,
  authorName,
  layout = "inline",
  onCountChange,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(layout === "panel");

  useEffect(() => {
    setComments([]);
    if (!unlocked) return;
    fetch(`/api/events/${eventId}/comments`)
      .then((r) => r.json())
      .then((data) => {
        setComments(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, [eventId, unlocked]);

  useEffect(() => {
    onCountChange?.(comments.length);
  }, [comments.length, onCountChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !text.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: authorName.trim(), text: text.trim() }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [...prev, comment]);
        setText("");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!unlocked) return null;

  const commentList = (
    <div className={layout === "panel" ? "space-y-3" : "mt-3 space-y-3"}>
      {comments.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No comments yet. Be the first.</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="rounded-lg bg-[var(--background)] px-3 py-2">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-medium text-[var(--accent)]">{c.author}</span>
              <span className="text-xs text-[var(--muted)]">
                {new Date(c.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <p className="mt-1 break-words text-sm">{c.text}</p>
          </div>
        ))
      )}

      {authorName ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="Add a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={`flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-[var(--accent)] ${touchInputClass}`}
          />
          <button
            type="submit"
            disabled={loading}
            className={`rounded-lg bg-[var(--accent-muted)] px-4 py-2 text-sm font-medium text-[var(--accent)] disabled:opacity-50 sm:shrink-0 ${touchButtonClass}`}
          >
            Post
          </button>
        </form>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          Set your display name to comment.
        </p>
      )}
    </div>
  );

  if (layout === "panel") {
    return commentList;
  }

  return (
    <div className="mt-3 border-t border-[var(--card-border)] pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`text-xs text-[var(--muted)] hover:text-[var(--foreground)] ${touchButtonClass} -ml-1 px-1`}
      >
        {expanded ? "Hide" : "Show"} comments ({comments.length})
      </button>

      {expanded && commentList}
    </div>
  );
}
