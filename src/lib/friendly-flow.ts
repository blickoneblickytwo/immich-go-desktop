import { FLAG_REGISTRY } from "@/lib/flag-registry";
import type { DetectedOS } from "@/lib/command-builder";

export type UploadSource = "folder" | "takeout";
export type PresetId =
  | "test-run"
  | "simple"
  | "organize"
  | "standard"
  | "clean"
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

const FOLDER_PRESETS: FriendlyPreset[] = [
  {
    id: "test-run",
    title: "Test run",
    subtitle: "See what would happen without uploading anything",
    hint: "Perfect for your first time.",
    recommended: true,
  },
  {
    id: "simple",
    title: "Simple upload",
    subtitle: "Upload everything as-is",
  },
  {
    id: "organize",
    title: "Organize by folder",
    subtitle: "Create albums matching your folder structure",
  },
  {
    id: "custom",
    title: "Custom",
    subtitle: "I know what I'm doing",
    custom: true,
  },
];

const TAKEOUT_PRESETS: FriendlyPreset[] = [
  {
    id: "test-run",
    title: "Test run",
    subtitle: "Preview the import without uploading",
    hint: "Perfect for your first time.",
    recommended: true,
  },
  {
    id: "standard",
    title: "Standard import",
    subtitle: "Import everything and recreate your albums",
  },
  {
    id: "clean",
    title: "Fresh start",
    subtitle: "Skip archived and partner-shared photos",
  },
  {
    id: "custom",
    title: "Custom",
    subtitle: "I know what I'm doing",
    custom: true,
  },
];

function shellQuote(value: string, os: DetectedOS): string {
  if (!value) return '""';
  if (os === "windows") return `"${value}"`;
  if (/^[a-zA-Z0-9_./:@=-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function quotePath(path: string, os: DetectedOS): string {
  if (os === "windows") {
    const normalized = path.replace(/\//g, "\\");
    return `"${normalized.replace(/"/g, '\\"')}"`;
  }
  return `"${path.replace(/"/g, '\\"')}"`;
}

function isDryRun(state: FriendlyState): boolean {
  if (state.preset === "test-run") return true;
  if (state.preset === "custom") return state.customDryRun;
  return false;
}

function buildRawFlagLines(state: FriendlyState): string[] {
  const source = state.source ?? "folder";
  const lines: string[] = [];

  if (isDryRun(state)) lines.push(FLAG_REGISTRY.dryRun.name);
  lines.push(`${FLAG_REGISTRY.onServerErrors.name}=continue`);
  lines.push(`${FLAG_REGISTRY.pauseImmichJobs.name}=false`);

  if (source === "folder") {
    if (state.preset === "organize") {
      lines.push(`${FLAG_REGISTRY.folderAsAlbum.name}=PATH`);
    }
    if (state.preset === "custom" && state.customCreateAlbums) {
      lines.push(`${FLAG_REGISTRY.folderAsAlbum.name}=FOLDER`);
    }
  } else {
    if (state.preset === "clean") {
      lines.push(`${FLAG_REGISTRY.includeArchived.name}=false`);
      lines.push(`${FLAG_REGISTRY.includePartner.name}=false`);
    }
    if (state.preset === "custom" && !state.customCreateAlbums) {
      lines.push(`${FLAG_REGISTRY.syncAlbums.name}=false`);
    }
  }

  if (state.preset === "custom" && state.customShootsRawJpeg) {
    lines.push(
      `${FLAG_REGISTRY.manageRawJpeg.name}=${state.customRawCover === "raw" ? "StackCoverRaw" : "StackCoverJPG"}`
    );
  }

  if (state.preset === "custom" && state.customUseDateRange && state.customDateFrom && state.customDateTo) {
    lines.push(`${FLAG_REGISTRY.dateRange.name}=${state.customDateFrom},${state.customDateTo}`);
  }

  if (state.preset === "custom" && state.customTag.trim()) {
    lines.push(`${FLAG_REGISTRY.tag.name}=${state.customTag.trim()}`);
  }

  return lines;
}

export function getPresets(source: UploadSource | null): FriendlyPreset[] {
  if (source === "takeout") return TAKEOUT_PRESETS;
  return FOLDER_PRESETS;
}

export function getSourceLabel(source: UploadSource | null): string {
  return source === "takeout" ? "Google Photos Takeout" : "Photos from my computer";
}

export function getPathLabel(source: UploadSource | null): string {
  return source === "takeout" ? "Where is your takeout file or folder?" : "Where are your photos?";
}

export function getPathPlaceholder(source: UploadSource | null, os: DetectedOS): string {
  if (source === "takeout") {
    if (os === "windows") return "C:\\Users\\you\\Downloads\\takeout-001.zip";
    if (os === "linux") return "/home/you/Downloads/takeout-001.zip";
    return "/Users/you/Downloads/takeout-001.zip";
  }
  if (os === "windows") return "C:\\Users\\you\\Pictures";
  if (os === "linux") return "/home/you/Photos";
  return "/Users/you/Pictures";
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
  const resolvedPath = state.inputPath || getPathPlaceholder(source, os);

  const parts: string[] = [getBinaryName(selectedShell)];
  parts.push(`${FLAG_REGISTRY.server.name}=${shellQuote(state.serverUrl, os)}`);
  parts.push(`${FLAG_REGISTRY.apiKey.name}=${shellQuote(state.apiKey, os)}`);
  parts.push(source === "takeout" ? "upload from-google-photos" : "upload from-folder");

  const rawFlags = buildRawFlagLines(state);
  for (const flag of rawFlags) {
    const [name, value] = flag.split("=", 2);
    if (value === undefined) {
      parts.push(name);
    } else {
      parts.push(`${name}=${shellQuote(value, os)}`);
    }
  }

  parts.push(quotePath(resolvedPath, os));

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
  const resolvedPath = state.inputPath || getPathPlaceholder(source, os);
  return [
    `Connects to ${state.serverUrl || "your Immich server"}`,
    isDryRun(state) ? "Simulates upload (nothing sent)" : "Uploads real files to your server",
    source === "takeout"
      ? `Imports from ${resolvedPath}`
      : `Scans ${resolvedPath} for photos and videos`,
  ];
}

export function getRawFlagPreview(state: FriendlyState): string[] {
  return buildRawFlagLines(state);
}
