/** Shared page layout — mobile-first with safe-area padding. */
export const safeAreaTopClass =
  "pt-[max(0.75rem,env(safe-area-inset-top))]";
export const safeAreaBottomClass =
  "pb-[max(1rem,env(safe-area-inset-bottom))]";
export const safeAreaInsetXClass =
  "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]";

export const pageShellClass =
  "mx-auto min-h-screen w-full max-w-2xl px-4 pt-3 pb-6 sm:px-6 sm:py-8";

/** Full-screen overlays (feed, modals) that sit outside the page shell. */
export const fullScreenSafeClass = `${safeAreaInsetXClass} ${safeAreaTopClass} ${safeAreaBottomClass}`;

/** Prevents iOS zoom on focus (needs ≥16px). */
export const touchInputClass =
  "text-base sm:text-sm min-h-11 sm:min-h-0";

export const touchButtonClass =
  "min-h-11 sm:min-h-0 touch-manipulation";

export const stickyClockBarClass =
  "sticky top-0 z-20 -mx-4 border-b border-[var(--card-border)] bg-[var(--background)]/95 px-4 py-2 backdrop-blur-sm supports-[backdrop-filter]:bg-[var(--background)]/80 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none";
