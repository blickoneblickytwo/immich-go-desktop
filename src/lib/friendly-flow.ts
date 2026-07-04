import { FLAG_REGISTRY } from "@/lib/flag-registry";
import type { DetectedOS } from "@/lib/os";

export type UploadSource = "folder" | "takeout" | "immich" | "icloud";
export type PresetId =
  | "test-run"
  | "simple"
  | "organize"
  | "standard"
  | "clean"
  | "favorites"
  | "custom";
export type UploadSpeed = "slow" | "balanced" | "fast";
export type RawCoverPreference = "jpeg" | "raw";
export type CommandShell = "unix" | "windows-cmd" | "windows-powershell";

export interface FriendlyPreset {
  id: PresetId;
  title: string;
  subtitle: string;
  hint?: string;
  recommended?: boolean;
  custom?: boolean;
}

export interface FriendlyState {
  source: UploadSource | null;
  serverUrl: string;
  apiKey: string;
  // Source server credentials (only used by the from-immich server-to-server migration)
  fromServerUrl: string;
  fromApiKey: string;
  rememberOnDevice: boolean;
  inputPath: string;
  preset: PresetId | null;
  customDryRun: boolean;
  customSpeed: UploadSpeed;
  customCreateAlbums: boolean;
  customShootsRawJpeg: boolean;
  customRawCover: RawCoverPreference;
  customUseDateRange: boolean;
  customDateFrom: string;
  customDateTo: string;
  customTag: string;
  showRawFlags: boolean;
}

export const REMEMBER_KEY = "immich-go-desktop.credentials.v1";

export const defaultFriendlyState: FriendlyState = {
  source: null,
  serverUrl: "",
  apiKey: "",
  fromServerUrl: "",
  fromApiKey: "",
  rememberOnDevice: false,
  inputPath: "",
  preset: null,
  customDryRun: true,
  customSpeed: "balanced",
  customCreateAlbums: false,
  customShootsRawJpeg: false,
  customRawCover: "jpeg",
  customUseDateRange: false,
  customDateFrom: "",
  customDateTo: "",
  customTag: "",
  showRawFlags: false,
};

const TEST_RUN_PRESET: FriendlyPreset = {
  id: "test-run",
  title: "Test run",
  subtitle: "See what would happen without uploading anything",
  hint: "Perfect for your first time.",
  recommended: true,
};

const CUSTOM_PRESET: FriendlyPreset = {
  id: "custom",
  title: "Custom",
  subtitle: "I know what I'm doing",
  custom: true,
};

const FOLDER_PRESETS: FriendlyPreset[] = [
  TEST_RUN_PRESET,
  { id: "simple", title: "Simple upload", subtitle: "Upload everything as-is" },
  { id: "organize", title: "Organize by folder", subtitle: "Create albums matching your folder structure" },
  CUSTOM_PRESET,
];

const TAKEOUT_PRESETS: FriendlyPreset[] = [
  { ...TEST_RUN_PRESET, subtitle: "Preview the import without uploading" },
  { id: "standard", title: "Standard import", subtitle: "Import everything and recreate your albums" },
  { id: "clean", title: "Fresh start", subtitle: "Skip archived and partner-shared photos" },
  CUSTOM_PRESET,
];

const ICLOUD_PRESETS: FriendlyPreset[] = [
  { ...TEST_RUN_PRESET, subtitle: "Preview the import without uploading" },
  { id: "standard", title: "Standard import", subtitle: "Import everything and turn Memories into albums" },
  CUSTOM_PRESET,
];

const IMMICH_PRESETS: FriendlyPreset[] = [
  { ...TEST_RUN_PRESET, subtitle: "Preview the migration without copying anything" },
  { id: "standard", title: "Migrate everything", subtitle: "Copy all assets from the source server" },
  { id: "favorites", title: "Favorites only", subtitle: "Copy just the favorite assets" },
  CUSTOM_PRESET,
];

/** Sources that take a local input path (everything except server-to-server). */
export function sourceUsesPath(source: UploadSource | null): boolean {
  return source !== "immich";
}

function shellQuote(value: string, os: DetectedOS): string {
  if (!value) return '""';
  if (os === "windows") return `"${value}"`;
  if (/^[a-zA-Z0-9_./:@=*-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function isDryRun(state: FriendlyState): boolean {
  if (state.preset === "test-run") return true;
  if (state.preset === "custom") return state.customDryRun;
  return false;
}

function getSubcommand(source: UploadSource): string {
  switch (source) {
    case "takeout": return "upload from-google-photos";
    case "immich": return "upload from-immich";
    case "icloud": return "upload from-icloud";
    case "folder":
    default: return "upload from-folder";
  }
}

function buildRawFlagLines(state: FriendlyState): string[] {
  const source = state.source ?? "folder";
  const isCustom = state.preset === "custom";
  const lines: string[] = [];

  if (isDryRun(state)) lines.push(FLAG_REGISTRY.dryRun.name);
  lines.push(`${FLAG_REGISTRY.onErrors.name}=continue`);
  lines.push(`${FLAG_REGISTRY.pauseImmichJobs.name}=false`);

  // Source-specific album / selection handling.
  switch (source) {
    case "folder":
      if (state.preset === "organize") lines.push(`${FLAG_REGISTRY.folderAsAlbum.name}=PATH`);
      if (isCustom && state.customCreateAlbums) lines.push(`${FLAG_REGISTRY.folderAsAlbum.name}=FOLDER`);
      break;
    case "takeout":
      if (state.preset === "clean") {
        lines.push(`${FLAG_REGISTRY.includeArchived.name}=false`);
        lines.push(`${FLAG_REGISTRY.includePartner.name}=false`);
      }
      if (isCustom && !state.customCreateAlbums) lines.push(`${FLAG_REGISTRY.syncAlbums.name}=false`);
      break;
    case "icloud":
      if (state.preset === "standard" || (isCustom && state.customCreateAlbums)) {
        lines.push(`${FLAG_REGISTRY.memories.name}=true`);
      }
      break;
    case "immich":
      if (state.preset === "favorites") lines.push(`${FLAG_REGISTRY.fromFavorite.name}=true`);
      break;
  }

  // RAW + JPEG coupling only applies to sources that scan local files.
  if (isCustom && state.customShootsRawJpeg && source !== "immich") {
    lines.push(
      `${FLAG_REGISTRY.manageRawJpeg.name}=${state.customRawCover === "raw" ? "StackCoverRaw" : "StackCoverJPG"}`
    );
  }

  // Date range filtering. from-immich filters the source server with its own flag.
  if (isCustom && state.customUseDateRange && state.customDateFrom && state.customDateTo) {
    const flag = source === "immich" ? FLAG_REGISTRY.fromDateRange.name : FLAG_REGISTRY.dateRange.name;
    lines.push(`${flag}=${state.customDateFrom},${state.customDateTo}`);
  }

  if (isCustom && state.customTag.trim()) {
    lines.push(`${FLAG_REGISTRY.tag.name}=${state.customTag.trim()}`);
  }

  return lines;
}

export function getPresets(source: UploadSource | null): FriendlyPreset[] {
  switch (source) {
    case "takeout": return TAKEOUT_PRESETS;
    case "icloud": return ICLOUD_PRESETS;
    case "immich": return IMMICH_PRESETS;
    case "folder":
    default: return FOLDER_PRESETS;
  }
}

export function getSourceLabel(source: UploadSource | null): string {
  switch (source) {
    case "takeout": return "Google Photos Takeout";
    case "icloud": return "Apple iCloud export";
    case "immich": return "Another Immich server";
    case "folder":
    default: return "Photos from my computer";
  }
}

export function getPathLabel(source: UploadSource | null): string {
  switch (source) {
    case "takeout": return "Where are your takeout files?";
    case "icloud": return "Where is your iCloud export?";
    case "folder":
    default: return "Where are your photos?";
  }
}

/** Label for the custom "create albums" toggle, or null to hide it for this source. */
export function getCreateAlbumsLabel(source: UploadSource | null): string | null {
  switch (source) {
    case "folder": return "Create albums from folders?";
    case "takeout": return "Recreate your Google Photos albums?";
    case "icloud": return "Import Memories as albums?";
    case "immich": return null;
    default: return "Create albums from folders?";
  }
}

export function getPathPlaceholder(source: UploadSource | null, os: DetectedOS): string {
  const home = os === "windows" ? "C:\\Users\\you" : os === "linux" ? "/home/you" : "/Users/you";
  const sep = os === "windows" ? "\\" : "/";
  switch (source) {
    case "takeout": return `${home}${sep}Downloads${sep}takeout-*.zip`;
    case "icloud": return `${home}${sep}Downloads${sep}iCloud Photos`;
    case "folder":
    default: return `${home}${sep}Pictures`;
  }
}

export function getSupportedShells(os: DetectedOS): CommandShell[] {
  if (os === "windows") return ["windows-powershell", "windows-cmd"];
  return ["unix"];
}

function getBinaryName(shell: CommandShell): string {
  if (shell === "windows-cmd") return "immich-go.exe";
  if (shell === "windows-powershell") return ".\\immich-go.exe";
  return "immich-go";
}

function getContinuation(shell: CommandShell): string {
  if (shell === "windows-cmd") return " ^";
  if (shell === "windows-powershell") return " `";
  return " \\";
}

export function buildFriendlyCommand(state: FriendlyState, os: DetectedOS, shell?: CommandShell): string {
  const selectedShell = shell ?? (os === "windows" ? "windows-powershell" : "unix");
  const continuation = getContinuation(selectedShell);
  const nl = "\n  ";
  const source = state.source ?? "folder";

  const parts: string[] = [getBinaryName(selectedShell)];
  parts.push(`${FLAG_REGISTRY.server.name}=${shellQuote(state.serverUrl, os)}`);
  parts.push(`${FLAG_REGISTRY.apiKey.name}=${shellQuote(state.apiKey, os)}`);
  parts.push(getSubcommand(source));

  // Server-to-server migrations point at a source server instead of a local path.
  if (source === "immich") {
    parts.push(`${FLAG_REGISTRY.fromServer.name}=${shellQuote(state.fromServerUrl, os)}`);
    parts.push(`${FLAG_REGISTRY.fromApiKey.name}=${shellQuote(state.fromApiKey, os)}`);
  }

  for (const flag of buildRawFlagLines(state)) {
    const [name, value] = flag.split("=", 2);
    if (value === undefined) {
      parts.push(name);
    } else {
      parts.push(`${name}=${shellQuote(value, os)}`);
    }
  }

  if (sourceUsesPath(source)) {
    parts.push(shellQuote(state.inputPath || getPathPlaceholder(source, os), os));
  }

  return parts
    .map((part, index) => {
      if (index === 0) return part;
      if (index === parts.length - 1) return nl + part;
      return nl + part + continuation;
    })
    .join("");
}

export function getCommandChecklist(state: FriendlyState, os: DetectedOS): string[] {
  const source = state.source ?? "folder";
  const dryLine = isDryRun(state)
    ? source === "immich"
      ? "Simulates migration (nothing copied)"
      : "Simulates upload (nothing sent)"
    : source === "immich"
      ? "Copies real assets between servers"
      : "Uploads real files to your server";

  if (source === "immich") {
    return [
      `Connects to ${state.serverUrl || "your destination Immich server"}`,
      dryLine,
      `Pulls assets from ${state.fromServerUrl || "your source Immich server"}`,
    ];
  }

  const resolvedPath = state.inputPath || getPathPlaceholder(source, os);
  return [
    `Connects to ${state.serverUrl || "your Immich server"}`,
    dryLine,
    source === "folder"
      ? `Scans ${resolvedPath} for photos and videos`
      : `Imports from ${resolvedPath}`,
  ];
}

export function getRawFlagPreview(state: FriendlyState): string[] {
  return buildRawFlagLines(state);
}
