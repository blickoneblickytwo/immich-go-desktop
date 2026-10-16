import { hasControlCharacters } from "@/lib/utils";

/** Validate an Immich base URL without allowing credentials or query-string secrets. */
export function parseServerUrl(value: string): URL {
  if (hasControlCharacters(value)) throw new Error("Remove control characters from the server address.");
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error("Enter a complete http:// or https:// server address."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Use an http:// or https:// server address.");
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("Use the server base address without a username, password, query, or fragment.");
  }
  return url;
}

export async function testDestinationConnection(server: string, key: string, fetcher: typeof fetch = fetch) {
  const url = parseServerUrl(server);
  url.pathname = url.pathname.replace(/\/+$/, "") + "/api/server/about";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetcher(url.href, {
      method: "GET",
      headers: { "x-api-key": key.trim() },
      redirect: "error",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return { status: response.status, isImmichResponse: false };
    let data: unknown;
    try { data = await response.json(); } catch { return { status: response.status, isImmichResponse: false }; }
    return {
      status: response.status,
      isImmichResponse: Boolean(data && typeof data === "object" && "version" in data && typeof data.version === "string"),
    };
  } finally {
    clearTimeout(timeout);
  }
}
