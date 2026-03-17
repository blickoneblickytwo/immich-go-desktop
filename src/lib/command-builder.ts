import { FLAG_REGISTRY } from "@/lib/flag-registry";

export type DetectedOS = "macos" | "windows" | "linux";

export function detectOS(): DetectedOS {
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform = (nav.userAgentData?.platform || navigator.platform || navigator.userAgent || "").toLowerCase();
  if (/win/.test(platform)) return "windows";
  if (/mac|darwin/.test(platform)) return "macos";
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
  dryRun: true,
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
      dryRun: true,
      ignoreErrors: true,
    },
  },
  {
    name: "NAS upload cleanup",
    description: "Upload from NAS with album creation by folder",
    apply: {
      createAlbumFolder: true,
      ignoreErrors: true,
      dryRun: true,
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
  parts.push(`${FLAG_REGISTRY.server.name}=${shellQuote(state.serverUrl, os)}`);
  parts.push(`${FLAG_REGISTRY.apiKey.name}=${shellQuote(state.apiKey, os)}`);

  if (state.adminApiKey) {
    parts.push(`${FLAG_REGISTRY.adminApiKey.name}=${shellQuote(state.adminApiKey, os)}`);
  }

  parts.push(state.googlePhotos ? "upload from-google-photos" : "upload from-folder");

  if (state.dryRun) {
    parts.push(FLAG_REGISTRY.dryRun.name);
  }
  if (state.ignoreErrors) {
    parts.push(`${FLAG_REGISTRY.onErrors.name}=continue`);
  }
  parts.push(`${FLAG_REGISTRY.pauseImmichJobs.name}=${state.pauseImmichJobs ? "true" : "false"}`);

  if (state.googlePhotos) {
    if (!state.createAlbums) {
      parts.push(`${FLAG_REGISTRY.syncAlbums.name}=false`);
    }
  } else if (state.createAlbumFolder) {
    parts.push(`${FLAG_REGISTRY.folderAsAlbum.name}=PATH`);
  } else if (state.createAlbums) {
    parts.push(`${FLAG_REGISTRY.folderAsAlbum.name}=FOLDER`);
  }

  if (state.excludeFiles) {
    parts.push(`${FLAG_REGISTRY.excludeExtensions.name}=${shellQuote(state.excludeFiles, os)}`);
  }
  if (state.includeFiles) {
    parts.push(`${FLAG_REGISTRY.includeExtensions.name}=${shellQuote(state.includeFiles, os)}`);
  }
  if (state.dateRange) {
    parts.push(`${FLAG_REGISTRY.dateRange.name}=${shellQuote(state.dateRange, os)}`);
  }

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

  if (state.excludeFiles) items.push({ label: "Exclude Extensions", value: state.excludeFiles });
  if (state.includeFiles) items.push({ label: "Include Extensions", value: state.includeFiles });
  if (state.dateRange) items.push({ label: "Date Range", value: state.dateRange });

  return items;
}
