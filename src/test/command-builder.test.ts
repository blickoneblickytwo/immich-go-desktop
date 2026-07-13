import { describe, it, expect } from "vitest";
import {
  API_KEY_PLACEHOLDER,
  SOURCE_API_KEY_PLACEHOLDER,
  buildFriendlyCommand,
  defaultFriendlyState,
  getCommandChecklist,
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

describe("blank API key falls back to a placeholder", () => {
  it("unix: blank destination key becomes YOUR_API_KEY", () => {
    const cmd = buildFriendlyCommand({ ...baseState, apiKey: "" }, "macos", "unix");
    expect(cmd).toContain(`--api-key=${API_KEY_PLACEHOLDER}`);
  });

  it("powershell: blank destination key becomes YOUR_API_KEY (quoted)", () => {
    const cmd = buildFriendlyCommand({ ...baseState, apiKey: "  " }, "windows", "windows-powershell");
    expect(cmd).toContain(`--api-key="${API_KEY_PLACEHOLDER}"`);
  });

  it("blank source key on a server-to-server migration becomes YOUR_SOURCE_API_KEY", () => {
    const cmd = buildFriendlyCommand(
      { ...baseState, source: "immich", fromServerUrl: "https://old.example.com", fromApiKey: "" },
      "macos",
      "unix",
    );
    expect(cmd).toContain(`--from-api-key=${SOURCE_API_KEY_PLACEHOLDER}`);
  });

  it("a real (non-blank) key is used as-is, not the placeholder", () => {
    const cmd = buildFriendlyCommand(baseState, "macos", "unix");
    expect(cmd).toContain(`--api-key=${baseState.apiKey}`);
    expect(cmd).not.toContain(API_KEY_PLACEHOLDER);
  });

  it("line continuations stay valid even with a placeholder in place", () => {
    const cmd = buildFriendlyCommand({ ...baseState, apiKey: "" }, "windows", "windows-cmd");
    const lines = cmd.split("\n");
    lines.slice(0, -1).forEach((line) => expect(line.trimEnd().endsWith("^")).toBe(true));
    expect(lines[lines.length - 1].trimEnd().endsWith("^")).toBe(false);
  });

  it("checklist calls out the placeholder when the key is blank", () => {
    const checklist = getCommandChecklist({ ...baseState, apiKey: "" }, "macos");
    expect(checklist.some((line) => line.includes(API_KEY_PLACEHOLDER))).toBe(true);
  });

  it("checklist has no placeholder callout when a real key is set", () => {
    const checklist = getCommandChecklist(baseState, "macos");
    expect(checklist.some((line) => line.includes(API_KEY_PLACEHOLDER))).toBe(false);
  });
});
