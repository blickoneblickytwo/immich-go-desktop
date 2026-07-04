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
