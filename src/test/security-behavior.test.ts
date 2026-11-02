import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseServerUrl, testDestinationConnection } from "@/lib/connection";
import { clearSavedConnection, readSavedConnection, saveConnection } from "@/lib/connection-storage";
import { API_KEY_PLACEHOLDER, SOURCE_API_KEY_PLACEHOLDER, REMEMBER_KEY, buildFriendlyCommand, buildMaskedCommand, defaultFriendlyState, getCommandChecklist, isDryRun } from "@/lib/friendly-flow";

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("destination test boundaries", () => {
  it("sends only the explicit key to the entered endpoint, blocking redirects and ambient credentials", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ version: "3.3.0" })));
    expect(await testDestinationConnection("https://photos.example.com/immich/", "test-destination-key", request)).toEqual({ status: 200, isImmichResponse: true });
    expect(request).toHaveBeenCalledExactlyOnceWith("https://photos.example.com/immich/api/server/about", expect.objectContaining({
      headers: { "x-api-key": "test-destination-key" }, redirect: "error", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer", signal: expect.any(AbortSignal),
    }));
  });

  it.each(["https://name:password@example.com", "https://example.com?key=not-a-real-key", "https://example.com/#secret", "javascript:alert(1)", "https://example.com/\nsecret"])("rejects an ambiguous server address before sending a key: %s", async (address) => {
    const request = vi.fn<typeof fetch>();
    await expect(testDestinationConnection(address, "test-key", request)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it("reports an HTML response as unexpected rather than declaring it a successful Immich test", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("<html>login</html>"));
    expect((await testDestinationConnection("https://photos.example.com", "test-key", request)).isImmichResponse).toBe(false);
  });

  it("does not turn an authorization failure into a success", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 403 }));
    expect(await testDestinationConnection("https://photos.example.com", "test-key", request)).toEqual({ status: 403, isImmichResponse: false });
  });

  it("aborts a stalled request after ten seconds", async () => {
    vi.useFakeTimers();
    const request = vi.fn<typeof fetch>().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("Timed out", "AbortError")));
    }));
    const result = expect(testDestinationConnection("https://photos.example.com", "test-key", request)).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(10_001);
    await result;
  });

  it("retains an explicitly selected HTTP address rather than pretending transport is encrypted", () => {
    expect(parseServerUrl("http://127.0.0.1:2283").protocol).toBe("http:");
  });

  it.each(["http://127.0.0.1:1\\@127.0.0.2:2", "https://photos.example.com\\evil", "https://photos.example.com/@x"])("rejects %s, which other clients may resolve to a different host", (value) => {
    expect(() => parseServerUrl(value)).toThrow("backslashes");
  });
});

describe("saved connection boundaries", () => {
  beforeEach(() => localStorage.clear());

  it("stores destination fields only, without persisting source keys or paths", () => {
    const input = { serverUrl: "https://photos.example.com", apiKey: "test-destination-key", fromApiKey: "test-source-key", inputPath: "/example/photos" };
    expect(saveConnection(input)).toBe(true);
    expect(JSON.parse(localStorage.getItem(REMEMBER_KEY)!)).toEqual({ serverUrl: input.serverUrl, apiKey: input.apiKey });
    expect(clearSavedConnection()).toBe(true);
    expect(readSavedConnection().saved).toBe(false);
  });

  it("does not restore malformed or mistyped stored data into form fields", () => {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify({ serverUrl: 42, apiKey: { unexpected: true } }));
    expect(readSavedConnection()).toEqual({ available: true, saved: true, connection: null });
    localStorage.setItem(REMEMBER_KEY, "not json");
    expect(readSavedConnection().connection).toBeNull();
    expect(clearSavedConnection()).toBe(true);
  });

  it("handles blocked reads, writes, and removals without claiming they succeeded", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Blocked"); });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("Blocked"); });
    expect(readSavedConnection().available).toBe(false);
    expect(saveConnection({ serverUrl: "https://photos.example.com", apiKey: "test-key" })).toBe(false);
    expect(clearSavedConnection()).toBe(false);
  });
});

describe("command privacy and shell handling", () => {
  const state = { ...defaultFriendlyState, source: "immich" as const, preset: "test-run" as const, serverUrl: "https://photos.example.com", fromServerUrl: "https://old.example.com", apiKey: "destination key with punctuation'\"$()", fromApiKey: "source key with punctuation'\"$()" };

  it.each(["unix", "windows-powershell"] as const)("masks the entire source and destination key before %s formatting", (shell) => {
    const masked = buildMaskedCommand(state, shell === "unix" ? "macos" : "windows", shell);
    expect(masked).not.toContain("destination");
    expect(masked).not.toContain("source key");
    expect(masked.match(/●●●●●●●●/g)).toHaveLength(2);
    const exported = buildFriendlyCommand(state, shell === "unix" ? "macos" : "windows", shell);
    expect(exported).toContain("destination key");
    expect(exported).toContain("source key");
  });

  it("keeps PowerShell dollar expressions and apostrophes inside literal strings", () => {
    const command = buildFriendlyCommand({ ...state, apiKey: "don't$(Write-Output harmless-test)" }, "windows", "windows-powershell");
    expect(command).toContain("--api-key='don''t$(Write-Output harmless-test)'");
  });

  it("doubles curly and low single quotes, which PowerShell also treats as string delimiters", () => {
    const command = buildFriendlyCommand({ ...state, source: "folder", inputPath:"C:\\Photos\\Mom\u2019s \u2018a\u2019 \u201Ab\u201B" }, "windows", "windows-powershell");
    expect(command).toContain("'C:\\Photos\\Mom\u2019\u2019s \u2018\u2018a\u2019\u2019 \u201A\u201Ab\u201B\u201B'");
  });

  it.each(["contains%VARIABLE%", "contains!expansion!", 'contains"quote'])("blocks unsafe CMD interpolation instead of producing an executable export: %s", (apiKey) => {
    expect(() => buildFriendlyCommand({ ...state, apiKey, fromApiKey: "test-source-key" }, "windows", "windows-cmd")).toThrow("choose PowerShell");
  });

  it.each(["unix", "windows-powershell", "windows-cmd"] as const)("rejects embedded line breaks for %s", (shell) => {
    expect(() => buildFriendlyCommand({ ...state, apiKey: "test\nkey" }, shell === "unix" ? "linux" : "windows", shell)).toThrow("control characters");
  });

  it("keeps placeholder keys visible and names only the missing source key in the checklist", () => {
    const input = { ...state, apiKey: "test-destination-key", fromApiKey: "" };
    expect(buildMaskedCommand(input, "macos", "unix")).toContain(SOURCE_API_KEY_PLACEHOLDER);
    const checklist = getCommandChecklist(input, "macos").join(" ");
    expect(checklist).toContain(SOURCE_API_KEY_PLACEHOLDER);
    expect(checklist).not.toContain(API_KEY_PLACEHOLDER);
    expect(checklist).toContain("server requests");
  });

  it("preserves equal signs in custom tag values without PowerShell interpolation", () => {
    const command = buildFriendlyCommand({ ...defaultFriendlyState, source: "folder", preset: "custom", customTag: "event=$(Write-Output harmless-test)" }, "windows", "windows-powershell");
    expect(command).toContain("--tag='event=$(Write-Output harmless-test)'");
  });

  it("does not label a live command as a test run because a key or path contains --dry-run", () => {
    const input = { ...defaultFriendlyState, source: "folder" as const, preset: "simple" as const, apiKey: "test-token--dry-run-suffix", inputPath: "/example/--dry-run/photos" };
    expect(buildFriendlyCommand(input, "macos")).toContain("--dry-run");
    expect(isDryRun(input)).toBe(false);
    expect(getCommandChecklist(input, "macos")).toContain("Uploads real files to your server");
  });

  it.each(["unix", "windows-powershell", "windows-cmd"] as const)("blocks a photo path from overriding command options in %s", (shell) => {
    const input = { ...defaultFriendlyState, source: "folder" as const, preset: "test-run" as const, inputPath: "--dry-run=false" };
    expect(() => buildFriendlyCommand(input, shell === "unix" ? "linux" : "windows", shell)).toThrow("command option");
    expect(buildFriendlyCommand({ ...input, inputPath: "./-photos" }, shell === "unix" ? "linux" : "windows", shell)).toContain("./-photos");
  });
});
