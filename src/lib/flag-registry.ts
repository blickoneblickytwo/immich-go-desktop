/**
 * Verified immich-go flag registry.
 *
 * Target CLI: immich-go version 0.31.0
 * Verification commands:
 * - immich-go upload from-folder --help
 * - immich-go upload from-google-photos --help
 * Verification date: 2026-03-16
 */

export type UploadSource = "folder" | "takeout";
export type FlagAppliesTo = UploadSource | "both";
export type FlagType =
  | "boolean"
  | "string"
  | "string[]"
  | "number"
  | "duration"
  | "enum"
  | "date-range"
  | "extensions"
  | "file-list";

export interface FlagDefinition {
  name: string;
  alias?: string[];
  type: FlagType;
  default: string | boolean | number | string[] | null;
  description: string;
  appliesTo: FlagAppliesTo;
}

export const FLAG_REGISTRY: Record<string, FlagDefinition> = {
  albumPathJoiner: {
    name: "--album-path-joiner",
    type: "string",
    default: " / ",
    description: "String used to join folder names when composing album names",
    appliesTo: "folder",
  },
  banFile: {
    name: "--ban-file",
    type: "file-list",
    default: [
      "@eaDir/",
      "@__thumb/",
      "SYNOFILE_THUMB_*.*",
      "Lightroom Catalog/",
      "thumbnails/",
      ".DS_Store",
      "/._*",
      ".Spotlight-V100/",
      ".photostructure/",
      "Recently Deleted/",
    ],
    description: "Exclude files matching patterns; can be passed multiple times",
    appliesTo: "both",
  },
  dateFromName: {
    name: "--date-from-name",
    type: "boolean",
    default: true,
    description: "Use date from filename when metadata date is unavailable",
    appliesTo: "folder",
  },
  dateRange: {
    name: "--date-range",
    type: "date-range",
    default: "unset",
    description: "Only import assets within the specified date range",
    appliesTo: "both",
  },
  excludeExtensions: {
    name: "--exclude-extensions",
    type: "extensions",
    default: "none",
    description: "Comma-separated extensions to exclude",
    appliesTo: "both",
  },
  folderAsAlbum: {
    name: "--folder-as-album",
    type: "enum",
    default: "NONE",
    description: "Map folders to albums using mode FOLDER or PATH",
    appliesTo: "folder",
  },
  folderAsTags: {
    name: "--folder-as-tags",
    type: "boolean",
    default: false,
    description: "Use folder structure as tags",
    appliesTo: "folder",
  },
  ignoreSidecarFiles: {
    name: "--ignore-sidecar-files",
    type: "boolean",
    default: false,
    description: "Skip sidecar files",
    appliesTo: "folder",
  },
  includeExtensions: {
    name: "--include-extensions",
    type: "extensions",
    default: "all",
    description: "Comma-separated extensions to include",
    appliesTo: "both",
  },
  includeType: {
    name: "--include-type",
    type: "enum",
    default: "all",
    description: "Single file type to include (VIDEO or IMAGE)",
    appliesTo: "both",
  },
  intoAlbum: {
    name: "--into-album",
    type: "string",
    default: null,
    description: "Import all files into a specific album",
    appliesTo: "folder",
  },
  manageBurst: {
    name: "--manage-burst",
    type: "enum",
    default: "NoStack",
    description: "Burst handling policy",
    appliesTo: "both",
  },
  manageEpsonFastfoto: {
    name: "--manage-epson-fastfoto",
    type: "boolean",
    default: false,
    description: "Enable Epson FastFoto handling",
    appliesTo: "both",
  },
  manageHeicJpeg: {
    name: "--manage-heic-jpeg",
    type: "enum",
    default: "NoStack",
    description: "HEIC/JPEG coupling policy",
    appliesTo: "both",
  },
  manageRawJpeg: {
    name: "--manage-raw-jpeg",
    type: "enum",
    default: "NoStack",
    description: "RAW/JPEG coupling policy",
    appliesTo: "both",
  },
  recursive: {
    name: "--recursive",
    type: "boolean",
    default: true,
    description: "Traverse sub-folders recursively",
    appliesTo: "folder",
  },
  sessionTag: {
    name: "--session-tag",
    type: "boolean",
    default: false,
    description: 'Tag imported assets with "{immich-go}/YYYY-MM-DD HH-MM-SS"',
    appliesTo: "both",
  },
  tag: {
    name: "--tag",
    type: "string[]",
    default: [],
    description: "Add one or more tags to imported assets",
    appliesTo: "both",
  },
  fromAlbumName: {
    name: "--from-album-name",
    type: "string",
    default: null,
    description: "Import only assets from a specific Google Photos album",
    appliesTo: "takeout",
  },
  includeArchived: {
    name: "--include-archived",
    alias: ["-a"],
    type: "boolean",
    default: true,
    description: "Include archived Google Photos assets",
    appliesTo: "takeout",
  },
  includePartner: {
    name: "--include-partner",
    alias: ["-p"],
    type: "boolean",
    default: true,
    description: "Include partner-shared Google Photos assets",
    appliesTo: "takeout",
  },
  includeTrashed: {
    name: "--include-trashed",
    alias: ["-t"],
    type: "boolean",
    default: false,
    description: "Include trashed Google Photos assets",
    appliesTo: "takeout",
  },
  includeUnmatched: {
    name: "--include-unmatched",
    alias: ["-u"],
    type: "boolean",
    default: false,
    description: "Include assets without matching JSON metadata",
    appliesTo: "takeout",
  },
  includeUntitledAlbums: {
    name: "--include-untitled-albums",
    type: "boolean",
    default: false,
    description: "Include photos from untitled albums",
    appliesTo: "takeout",
  },
  partnerSharedAlbum: {
    name: "--partner-shared-album",
    type: "string",
    default: null,
    description: "Album to receive partner-shared photos",
    appliesTo: "takeout",
  },
  peopleTag: {
    name: "--people-tag",
    type: "boolean",
    default: true,
    description: 'Tag assets using JSON people metadata as "people/name"',
    appliesTo: "takeout",
  },
  syncAlbums: {
    name: "--sync-albums",
    type: "boolean",
    default: true,
    description: "Create/sync Immich albums from Google Photos albums",
    appliesTo: "takeout",
  },
  takeoutTag: {
    name: "--takeout-tag",
    type: "boolean",
    default: true,
    description: 'Tag assets with "{takeout}/takeout-YYYYMMDDTHHMMSSZ"',
    appliesTo: "takeout",
  },
  adminApiKey: {
    name: "--admin-api-key",
    type: "string",
    default: null,
    description: "Admin API key for job management operations",
    appliesTo: "both",
  },
  apiKey: {
    name: "--api-key",
    alias: ["-k"],
    type: "string",
    default: null,
    description: "Immich API key",
    appliesTo: "both",
  },
  apiTrace: {
    name: "--api-trace",
    type: "boolean",
    default: false,
    description: "Enable API call tracing",
    appliesTo: "both",
  },
  clientTimeout: {
    name: "--client-timeout",
    type: "duration",
    default: "20m0s",
    description: "Server call timeout",
    appliesTo: "both",
  },
  concurrentTasks: {
    name: "--concurrent-tasks",
    type: "number",
    default: 8,
    description: "Number of concurrent tasks (1-20)",
    appliesTo: "both",
  },
  config: {
    name: "--config",
    type: "string",
    default: "./immich-go.yaml",
    description: "Path to config file",
    appliesTo: "both",
  },
  deviceUuid: {
    name: "--device-uuid",
    type: "string",
    default: "Seans-Mac-mini.local",
    description: "Override device UUID",
    appliesTo: "both",
  },
  dryRun: {
    name: "--dry-run",
    type: "boolean",
    default: false,
    description: "Simulate actions without uploading",
    appliesTo: "both",
  },
  logFile: {
    name: "--log-file",
    alias: ["-l"],
    type: "string",
    default: null,
    description: "Write logs to a file",
    appliesTo: "both",
  },
  logLevel: {
    name: "--log-level",
    type: "string",
    default: "INFO",
    description: "Log level (DEBUG|INFO|WARN|ERROR)",
    appliesTo: "both",
  },
  logType: {
    name: "--log-type",
    type: "string",
    default: "text",
    description: "Log output format",
    appliesTo: "both",
  },
  noUi: {
    name: "--no-ui",
    type: "boolean",
    default: false,
    description: "Disable terminal UI",
    appliesTo: "both",
  },
  onErrors: {
    name: "--on-errors",
    type: "enum",
    default: "stop",
    description: "Behavior when errors occur (stop|continue|<n> errors)",
    appliesTo: "both",
  },
  overwrite: {
    name: "--overwrite",
    type: "boolean",
    default: false,
    description: "Overwrite remote files with local versions",
    appliesTo: "both",
  },
  pauseImmichJobs: {
    name: "--pause-immich-jobs",
    type: "boolean",
    default: true,
    description: "Pause Immich background jobs during upload",
    appliesTo: "both",
  },
  server: {
    name: "--server",
    alias: ["-s"],
    type: "string",
    default: null,
    description: "Immich server URL",
    appliesTo: "both",
  },
  skipVerifySsl: {
    name: "--skip-verify-ssl",
    type: "boolean",
    default: false,
    description: "Skip SSL certificate verification",
    appliesTo: "both",
  },
  saveConfig: {
    name: "--save-config",
    type: "boolean",
    default: false,
    description: "Save the current configuration to immich-go.yaml",
    appliesTo: "both",
  },
  timeZone: {
    name: "--time-zone",
    type: "string",
    default: null,
    description: "Override system time zone",
    appliesTo: "both",
  },
  help: {
    name: "--help",
    alias: ["-h"],
    type: "boolean",
    default: false,
    description: "Show help for the command",
    appliesTo: "both",
  },
};
