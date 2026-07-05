import { describe, it, expect } from "vitest";
import {
  buildFriendlyCommand,
  defaultFriendlyState,
  type CommandShell,
  type FriendlyState,
} from "@/lib/friendly-flow";
import type { DetectedOS } from "@/lib/os";

const baseState: FriendlyState = {
  ...defaultFriendlyState,
  source: "folder",
  serverUrl: "https://photos.example.com",
  apiKey: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  inputPath: "/Users/me/Pictures",
  preset: "test-run",
};

// The continuation token each shell puts at the end of a wrapped line.
const cases: { os: DetectedOS; shell: CommandShell; token: string }[] = [
  { os: "macos", shell: "unix", token: "\\" },
  { os: "windows", shell: "windows-powershell", token: "`" },
  { os: "windows", shell: "windows-cmd", token: "^" },
];

describe("buildFriendlyCommand line continuations", () => {
  for (const { os, shell, token } of cases) {
    it(`${shell}: every non-final line ends with '${token}' (incl. the binary line)`, () => {
      const cmd = buildFriendlyCommand(baseState, os, shell);
      const lines = cmd.split("\n");
      expect(lines.length).toBeGreaterThan(1);

      // Regression guard: the first line (the binary) must carry a continuation —
      // otherwise the shell ends the command after the binary name.
      lines.slice(0, -1).forEach((line) => {
        expect(line.trimEnd().endsWith(token)).toBe(true);
      });

      // The final line (the path/last flag) must NOT have a dangling continuation.
      expect(lines[lines.length - 1].trimEnd().endsWith(token)).toBe(false);
    });
  }

  it("server-to-server (no local path) still terminates cleanly", () => {
    const cmd = buildFriendlyCommand(
      { ...baseState, source: "immich", fromServerUrl: "https://old.example.com", fromApiKey: "k".repeat(24) },
      "macos",
      "unix",
    );
    const lines = cmd.split("\n");
    lines.slice(0, -1).forEach((line) => expect(line.trimEnd().endsWith("\\")).toBe(true));
    expect(lines[lines.length - 1].trimEnd().endsWith("\\")).toBe(false);
  });
});
