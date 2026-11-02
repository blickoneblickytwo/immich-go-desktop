import unixTemplate from "./guided-import.sh?raw";
import windowsTemplate from "./guided-import.ps1?raw";
import { getRawFlagPreview, quotePowerShell, type FriendlyState } from "./friendly-flow";
import { parseServerUrl } from "./connection";
import { hasControlCharacters } from "./utils";
import type { DetectedOS } from "./os";

export const GUIDED_VERSION = "0.32.0";
/** Digests from the official v0.32.0 release metadata and checksums.txt. */
export const GUIDED_ASSETS = {
  Darwin_arm64: "0c1ce06932a21a738d9adaf2ddafdbf654113fc2791d31b6d2ea0044928e2f43",
  Darwin_x86_64: "35b9456d36c0bbb7d5087d08622b087f849f4f6d9631b15737a22cef39e5a314",
  Linux_arm64: "2c35d9284baae407ef9540bdac5f488971b0bdc7be758a4d7c05ab270af09fdb",
  Linux_x86_64: "6e2ad86bafdadb9466d6515de7cb882726c0aea1a21d51164dff361d7d480a97",
  Windows_arm64: "3ba2ad0f7b175cb31fac15c1f13648f3622c9c82c5cbec0f63a46ce8a1110ac8",
  Windows_x86_64: "37326f95d6654f7f67a5fde3263e96aa8f9cf288dcbb9a2164aafae0aaa144af",
} as const;

export function buildGuidedScript(state: FriendlyState, os: DetectedOS) {
  if (!state.source) throw new Error("Choose an import source first.");
  // Scripts receive the parsed form, so their scheme checks and requests see the validated host.
  const normalize = (value: string) => parseServerUrl(value).href.replace(/\/+$/, "");
  const destination = normalize(state.serverUrl);
  const sourceServer = state.source === "immich" ? normalize(state.fromServerUrl) : "";
  const path = state.source === "immich" ? "" : state.inputPath.trim();
  if (state.source !== "immich" && (!path || path.startsWith("-"))) throw new Error("Enter a full photo path first.");
  const flags = getRawFlagPreview(state).filter(flag => !flag.startsWith("--dry-run"));
  const values = [destination, sourceServer, path, ...flags];
  if (values.some(hasControlCharacters)) throw new Error("Remove line breaks and control characters from the import settings.");
  const windows = os === "windows";
  const quote = (text: string) => windows ? quotePowerShell(text) : `'${text.replace(/'/g, "'\\''")}'`;
  const config = windows
    ? `$Destination = ${quote(destination)}\n$SourceServer = ${quote(sourceServer)}\n$PhotoPath = ${quote(path)}\n$Source = ${quote(state.source)}\n$ImportFlags = @(${flags.map(quote).join(", ")})`
    : `destination=${quote(destination)}\nsource_server=${quote(sourceServer)}\nphoto_path=${quote(path)}\nsource=${quote(state.source)}\nimport_flags=(${flags.map(quote).join(" ")})`;
  let script = windows ? windowsTemplate : unixTemplate;
  for (const [platform, digest] of Object.entries(GUIDED_ASSETS)) script = script.split(`@${platform}@`).join(digest);
  script = script.replace("# @CONFIG@", () => config);
  return { content: (windows ? "\uFEFF" : "") + script, filename: `go-desktop-import.${windows ? "ps1" : "sh"}` };
}
