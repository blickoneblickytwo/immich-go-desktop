/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultAdvancedOptions } from "@/lib/advanced-options";
import { defaultFriendlyState, getRawFlagPreview, type UploadSource } from "@/lib/friendly-flow";

const commands: Record<UploadSource, string> = {
  folder: "from-folder", takeout: "from-google-photos", icloud: "from-icloud", immich: "from-immich",
};

describe("Advanced options against captured official v0.32.0 binary help", () => {
  it.each(Object.keys(commands) as UploadSource[])("emits registered flags and accepted stacking values for %s", source => {
    const help = readFileSync(`docs/immich-go-verification/2026-10-17/upload-${commands[source]}.help.txt`, "utf8");
    const registered = new Map(help.split("\n").flatMap(line => {
      const name = line.match(/(?:^|\s)(--[a-z][a-z-]*)\b/);
      return name ? [[name[1], line] as const] : [];
    }));
    for (const burst of ["NoStack", "Stack"] as const) {
      for (const heic of ["NoStack", "StackCoverHeic", "StackCoverJPG"] as const) {
        const flags = getRawFlagPreview({
          ...defaultFriendlyState, source, preset: "custom", customCreateAlbums: true,
          customShootsRawJpeg: true, customUseDateRange: true,
          customDateFrom: "2024-01-01", customDateTo: "2024-12-31", customTag: "Example import",
          advanced: { ...defaultAdvancedOptions, album: "Example album", sourceAlbum: "Example album",
            burst, heic, timeZone: "Europe/London", sessionTag: true, concurrency: "3", timeoutMinutes: "90" },
        });
        for (const flag of flags) {
          const [name, value] = flag.split("=", 2);
          expect(registered.has(name), `${commands[source]} must register ${name}`).toBe(true);
          if (name.startsWith("--manage-")) {
            const values = registered.get(name)!.match(/Possible values: (.+?) \(default/)![1].split(", ");
            expect(values, `${name} must accept ${value}`).toContain(value);
          }
        }
      }
    }
  });
});
