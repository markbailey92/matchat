/** Shared page layout — content lives inside the body safe-area clip. */
export const safeAreaClipClass =
  "overflow-hidden [clip-path:inset(var(--safe-top)_var(--safe-right)_var(--safe-bottom)_var(--safe-left))]";

/** Inner spacing inside the clipped safe region (not additional safe-area inset). */
export const safeAreaTopClass = "pt-3";
export const safeAreaBottomClass = "pb-4";
export const safeAreaInsetXClass = "px-4";

export const pageShellClass =
  "mx-auto min-h-full w-full max-w-2xl px-4 pt-3 pb-6 sm:px-6 sm:py-8";

/** Full-screen views that fill the clipped viewport. */
export const fullScreenSafeClass = "h-[100dvh] w-full overflow-hidden";

/** Prevents iOS zoom on focus (needs ≥16px). */
export const touchInputClass =
  "text-base sm:text-sm min-h-11 sm:min-h-0";

export const touchButtonClass =
  "min-h-11 sm:min-h-0 touch-manipulation";

export const stickyClockBarClass =
  "sticky top-0 z-20 -mx-4 border-b border-[var(--card-border)] bg-[var(--background)]/95 px-4 py-2 backdrop-blur-sm supports-[backdrop-filter]:bg-[var(--background)]/80 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none";
