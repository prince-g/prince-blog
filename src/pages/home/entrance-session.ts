const ENTRY_KEY = "prince-blog:entered";
let completedWindow: Window | undefined;

export function hasEnteredPersonalHome(): boolean {
  if (typeof window === "undefined") return false;
  if (completedWindow === window) return true;
  try { return window.sessionStorage.getItem(ENTRY_KEY) === "1"; }
  catch { return false; }
}

/** Only the final handoff to the personal page completes this tab's entrance. */
export function rememberPersonalHome(): void {
  if (typeof window === "undefined") return;
  completedWindow = window;
  try { window.sessionStorage.setItem(ENTRY_KEY, "1"); }
  catch { /* A blocked store must not interrupt the current page. */ }
}
