export type DetectedOS = "macos" | "windows" | "linux";

export function detectOS(): DetectedOS {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  return "linux";
}

export interface WizardState {
  // Step 1
  serverUrl: string;
  apiKey: string;
  adminApiKey: string;
  // Step 2
  folderPath: string;
  dryRun: boolean;
  createAlbums: boolean;
  createAlbumFolder: boolean;
  ignoreErrors: boolean;
  pauseImmichJobs: boolean;
  googlePhotos: boolean;
  excludeFiles: string;
  includeFiles: string;
  dateRange: string;
}

export const defaultState: WizardState = {
  serverUrl: "",
  apiKey: "",
  adminApiKey: "",
  folderPath: "",
  dryRun: false,
  createAlbums: false,
  createAlbumFolder: false,
  ignoreErrors: false,
  pauseImmichJobs: false,
  googlePhotos: false,
  excludeFiles: "",
  includeFiles: "",
  dateRange: "",
};

export interface Preset {
  name: string;
  description: string;
  apply: Partial<WizardState>;
}

export const presets: Preset[] = [
  {
    name: "Safe first run",
    description: "Dry run with error tolerance — nothing gets uploaded",
    apply: {
      dryRun: true,
      ignoreErrors: true,
      createAlbums: false,
      googlePhotos: false,
      pauseImmichJobs: false,
    },
  },
  {
    name: "Google Takeout",
    description: "Optimized for Google Takeout folder structure",
    apply: {
      googlePhotos: true,
      createAlbums: true,
      dryRun: false,
      ignoreErrors: true,
    },
  },
  {
    name: "NAS upload cleanup",
    description: "Upload from NAS with album creation by folder",
    apply: {
      createAlbumFolder: true,
      ignoreErrors: true,
      dryRun: false,
      googlePhotos: false,
    },
  },
];

export function getPathPlaceholder(os: DetectedOS): string {
  switch (os) {
    case "windows": return "C:\\Users\\you\\Photos";
    case "macos": return "/Users/you/Photos";
    case "linux": return "/home/you/Photos";
  }
}

function shellQuote(value: string, os: DetectedOS): string {
  if (!value) return '""';
  if (os === "windows") {
    return `"${value}"`;
  }
  // Unix: single-quote, escaping existing single quotes
  if (/^[a-zA-Z0-9_./:@=-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export function buildCommand(state: WizardState, os: DetectedOS): string {
  const continuation = os === "windows" ? " `" : " \\";
  const nl = "\n  ";

  const parts: string[] = ["immich-go"];
  parts.push(`-server=${shellQuote(state.serverUrl, os)}`);
  parts.push(`-key=${shellQuote(state.apiKey, os)}`);
  
  if (state.adminApiKey) {
    parts.push(`-admin-key=${shellQuote(state.adminApiKey, os)}`);
  }

  parts.push("upload from-folder");

  if (state.googlePhotos) parts.push("-google-photos");
  if (state.dryRun) parts.push("-dry-run");
  if (state.createAlbums) parts.push("-create-albums");
  if (state.createAlbumFolder) parts.push("-create-album-folder");
  if (state.ignoreErrors) parts.push("-ignore-errors");
  if (state.pauseImmichJobs) parts.push("-pause-immich-jobs");
  if (state.excludeFiles) parts.push(`-exclude-files=${shellQuote(state.excludeFiles, os)}`);
  if (state.includeFiles) parts.push(`-include-files=${shellQuote(state.includeFiles, os)}`);
  if (state.dateRange) parts.push(`-date-range=${shellQuote(state.dateRange, os)}`);

  parts.push(shellQuote(state.folderPath || getPathPlaceholder(os), os));

  // Format with line continuations
  return parts.map((p, i) => {
    if (i === 0) return p;
    if (i === parts.length - 1) return nl + p;
    return nl + p + continuation;
  }).join("");
}

export function getSummaryItems(state: WizardState): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  items.push({ label: "Server", value: state.serverUrl || "—" });
  items.push({ label: "API Key", value: state.apiKey ? "••••" + state.apiKey.slice(-4) : "—" });
  if (state.adminApiKey) items.push({ label: "Admin Key", value: "••••" + state.adminApiKey.slice(-4) });
  items.push({ label: "Folder", value: state.folderPath || "—" });

  const flags: string[] = [];
  if (state.dryRun) flags.push("Dry Run");
  if (state.createAlbums) flags.push("Create Albums");
  if (state.createAlbumFolder) flags.push("Album per Folder");
  if (state.ignoreErrors) flags.push("Ignore Errors");
  if (state.pauseImmichJobs) flags.push("Pause Immich Jobs");
  if (state.googlePhotos) flags.push("Google Photos mode");
  if (flags.length) items.push({ label: "Flags", value: flags.join(", ") });

  if (state.excludeFiles) items.push({ label: "Exclude", value: state.excludeFiles });
  if (state.includeFiles) items.push({ label: "Include", value: state.includeFiles });
  if (state.dateRange) items.push({ label: "Date Range", value: state.dateRange });

  return items;
}
