import { REMEMBER_KEY } from "@/lib/friendly-flow";

interface SavedConnection { serverUrl: string; apiKey: string }

export function readSavedConnection() {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return { available: true, saved: false, connection: null };
    let connection: SavedConnection | null = null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const value = parsed as Record<string, unknown>;
        if (typeof value.serverUrl === "string" && value.serverUrl.trim() &&
            (value.apiKey === undefined || typeof value.apiKey === "string")) {
          connection = { serverUrl: value.serverUrl, apiKey: typeof value.apiKey === "string" ? value.apiKey : "" };
        }
      }
    } catch { /* Invalid stored data stays removable without being restored into the form. */ }
    return { available: true, saved: true, connection };
  } catch {
    return { available: false, saved: false, connection: null };
  }
}

/** Only destination fields are persisted, never the migration source or photo path. */
export function saveConnection(connection: SavedConnection): boolean {
  try {
    const serverUrl = connection.serverUrl.trim();
    const apiKey = connection.apiKey.trim();
    localStorage.setItem(REMEMBER_KEY, JSON.stringify(apiKey ? { serverUrl, apiKey } : { serverUrl }));
    return true;
  } catch { return false; }
}

export function clearSavedConnection(): boolean {
  try { localStorage.removeItem(REMEMBER_KEY); return true; } catch { return false; }
}
