const DISPLAY_NAME_KEY = "matchat-display-name";

export function loadDisplayName(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveDisplayName(name: string): void {
  localStorage.setItem(DISPLAY_NAME_KEY, name.trim());
}

export function clearDisplayName(): void {
  localStorage.removeItem(DISPLAY_NAME_KEY);
}
