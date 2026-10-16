import type { LogReview } from "@/lib/log-review";
import { readLogFile } from "@/lib/read-log-file";

export type ReviewResponse = { type: "result"; report: LogReview } | { type: "progress"; percent: number } | { type: "error"; message: string };
const scope = self as unknown as { onmessage: (event: MessageEvent<{ file: File }>) => void; postMessage: (value: ReviewResponse) => void };

scope.onmessage = async ({ data }) => {
  try {
    const report = await readLogFile(data.file, percent => scope.postMessage({ type: "progress", percent }));
    scope.postMessage({ type: "result", report });
  } catch (error) {
    scope.postMessage({ type: "error", message: error instanceof TypeError ? "This file could not be read as UTF-8 text. Choose an immich-go text or JSON log." : error instanceof Error ? error.message : "Unable to read this log." });
  }
};
