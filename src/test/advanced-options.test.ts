import { describe, expect, it } from "vitest";
import { advancedChangeCount, advancedForSource, defaultAdvancedOptions } from "@/lib/advanced-options";
import { buildFriendlyCommand, defaultFriendlyState, getRawFlagPreview, type CommandShell, type FriendlyState } from "@/lib/friendly-flow";

const base: FriendlyState = { ...defaultFriendlyState, source: "folder", preset: "custom", serverUrl: "https://photos.example.com", inputPath: "/example/photos" };
const changed = { ...defaultAdvancedOptions, album: "A trip's photos", sourceAlbum: "Source album", burst: "Stack" as const, heic: "StackCoverJPG" as const, timeZone: "Europe/London", sessionTag: true, concurrency: "3", timeoutMinutes: "90" };

describe("optional advanced command settings", () => {
  it.each(["folder", "takeout", "icloud", "immich"] as const)("does not change %s beginner commands even with retained advanced values", source => {
    for (const preset of ["test-run", "simple", "standard", "organize", "clean", "favorites"] as const) {
      expect(buildFriendlyCommand({ ...base, source, preset, advanced: changed, customSpeed: "fast" }, "macos"))
        .toBe(buildFriendlyCommand({ ...base, source, preset }, "macos"));
    }
  });

  it("emits no new defaults for Custom with balanced speed and no overrides", () => {
    expect(getRawFlagPreview(base)).toEqual(["--dry-run", "--on-errors=continue", "--pause-immich-jobs=false"]);
    expect(advancedChangeCount(defaultAdvancedOptions, "folder")).toBe(0);
  });

  it.each(["unix", "windows-powershell", "windows-cmd"] as CommandShell[])("applies source-specific options and quotes album names for %s", shell => {
    const command = buildFriendlyCommand({ ...base, advanced: changed }, shell === "unix" ? "macos" : "windows", shell);
    expect(command).toContain("--into-album=");
    expect(command).not.toContain("--from-album-name");
    expect(command).toContain("--manage-burst=");
    expect(command).toContain("--manage-heic-jpeg=");
    expect(command).toContain("--session-tag");
    expect(command).toContain("Europe/London");
    expect(command).toContain("--concurrent-tasks=");
    expect(command).toContain("90m");
    expect(command).toContain(shell === "windows-powershell" ? "A trip''s photos" : shell === "unix" ? "A trip'\\''s photos" : "A trip's photos");
  });

  it("shows only options supported by each source", () => {
    expect(getRawFlagPreview({ ...base, source: "takeout", advanced: changed }).join(" ")).toContain("--from-album-name=Source album");
    for (const source of ["icloud", "immich"] as const) {
      const flags = getRawFlagPreview({ ...base, source, advanced: changed }).join(" ");
      expect(flags).not.toMatch(/--into-album|--from-album-name|--manage-burst|--manage-heic-jpeg/);
      expect(flags).toContain("--session-tag");
    }
    expect(advancedForSource(changed, "immich")).toMatchObject({ album: "", sourceAlbum: "", burst: "NoStack", heic: "NoStack" });
  });

  it("maps speed to concurrency once, with an explicit override taking precedence", () => {
    expect(getRawFlagPreview({ ...base, customSpeed: "slow" })).toContain("--concurrent-tasks=2");
    expect(getRawFlagPreview({ ...base, customSpeed: "fast" })).toContain("--concurrent-tasks=8");
    expect(getRawFlagPreview({ ...base, customSpeed: "fast", advanced: { ...defaultAdvancedOptions, concurrency: "4" } }).filter(flag => flag.startsWith("--concurrent-tasks"))).toEqual(["--concurrent-tasks=4"]);
  });

  it.each(["0", "21", "1.5", "2 --dry-run=false", "NaN"])("rejects invalid concurrency %s", concurrency => {
    expect(() => buildFriendlyCommand({ ...base, advanced: { ...defaultAdvancedOptions, concurrency } }, "macos")).toThrow("Concurrent tasks");
  });

  it.each(["0", "1441", "20m", "-1"])("rejects invalid timeout %s", timeoutMinutes => {
    expect(() => buildFriendlyCommand({ ...base, advanced: { ...defaultAdvancedOptions, timeoutMinutes } }, "macos")).toThrow("Timeout");
  });

  it("validates time zones and does not accept control characters or CMD interpolation", () => {
    expect(() => buildFriendlyCommand({ ...base, advanced: { ...defaultAdvancedOptions, timeZone: "invalid/zone" } }, "macos")).toThrow("time zone");
    expect(() => buildFriendlyCommand({ ...base, advanced: { ...defaultAdvancedOptions, album: "a\nb" } }, "macos")).toThrow("control characters");
    expect(() => buildFriendlyCommand({ ...base, advanced: { ...defaultAdvancedOptions, album: "%SECRET%" } }, "windows", "windows-cmd")).toThrow("PowerShell");
  });
});
