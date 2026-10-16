import type { FriendlyState, UploadSource } from "@/lib/friendly-flow";
import { FLAG_REGISTRY } from "@/lib/flag-registry";
import { hasControlCharacters } from "@/lib/utils";

export interface AdvancedOptions {
  album: string;
  sourceAlbum: string;
  timeZone: string;
  sessionTag: boolean;
  burst: "NoStack" | "Stack";
  heic: "NoStack" | "StackCoverHeic" | "StackCoverJPG";
  concurrency: string;
  timeoutMinutes: string;
}

export const defaultAdvancedOptions: AdvancedOptions = {
  album: "", sourceAlbum: "", timeZone: "", sessionTag: false,
  burst: "NoStack", heic: "NoStack", concurrency: "", timeoutMinutes: "",
};

export function supportsPhotoStacking(source: UploadSource | null) {
  return source === "folder" || source === "takeout";
}

/** Clear source-specific overrides when the source changes; global overrides remain. */
export function advancedForSource(value: AdvancedOptions, source: UploadSource): AdvancedOptions {
  return { ...value, album: source === "folder" ? value.album : "", sourceAlbum: source === "takeout" ? value.sourceAlbum : "",
    burst: supportsPhotoStacking(source) ? value.burst : "NoStack", heic: supportsPhotoStacking(source) ? value.heic : "NoStack" };
}

export function advancedChangeCount(value: AdvancedOptions, source: UploadSource | null): number {
  const applicable = advancedForSource(value, source ?? "folder");
  return (Object.keys(defaultAdvancedOptions) as (keyof AdvancedOptions)[])
    .filter(key => typeof applicable[key] === "string" ? String(applicable[key]).trim() !== String(defaultAdvancedOptions[key]) : applicable[key] !== defaultAdvancedOptions[key]).length;
}

function positiveInteger(value: string, max: number, label: string): number {
  if (!/^\d+$/.test(value.trim()) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > max) {
    throw new Error(`${label} must be a whole number from 1 to ${max}.`);
  }
  return Number(value);
}

export function advancedFlags(state: FriendlyState): string[] {
  if (state.preset !== "custom") return [];
  const value = advancedForSource(state.advanced, state.source ?? "folder");
  const flags: string[] = [];
  const add = (key: string, text: string) => {
    if (hasControlCharacters(text)) throw new Error("Remove line breaks and control characters from Advanced settings.");
    const trimmed = text.trim();
    if (trimmed) flags.push(`${FLAG_REGISTRY[key].name}=${trimmed}`);
  };
  if (value.album.trim().length > 200 || value.sourceAlbum.trim().length > 200) throw new Error("Album names must be 200 characters or fewer.");
  add("intoAlbum", value.album);
  add("fromAlbumName", value.sourceAlbum);
  if (value.timeZone.trim()) {
    try { new Intl.DateTimeFormat("en", { timeZone: value.timeZone.trim() }).format(); }
    catch { throw new Error("Use a recognised time zone, such as Europe/London or UTC."); }
    add("timeZone", value.timeZone);
  }
  if (value.sessionTag) flags.push(FLAG_REGISTRY.sessionTag.name);
  if (!["NoStack", "Stack"].includes(value.burst)) throw new Error("Choose a supported burst option.");
  if (!["NoStack", "StackCoverHeic", "StackCoverJPG"].includes(value.heic)) throw new Error("Choose a supported HEIC/JPEG option.");
  if (value.burst !== "NoStack") add("manageBurst", value.burst);
  if (value.heic !== "NoStack") add("manageHeicJpeg", value.heic);
  const tasks = value.concurrency.trim() ? positiveInteger(value.concurrency, 20, "Concurrent tasks")
    : state.customSpeed === "slow" ? 2 : state.customSpeed === "fast" ? 8 : null;
  if (tasks !== null) add("concurrentTasks", String(tasks));
  if (value.timeoutMinutes.trim()) add("clientTimeout", `${positiveInteger(value.timeoutMinutes, 1440, "Timeout in minutes")}m`);
  return flags;
}
