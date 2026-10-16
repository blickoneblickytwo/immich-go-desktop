import { LogParser, MAX_LOG_BYTES } from "@/lib/log-review";

/** Called only in the worker. Streams UTF-8 input without keeping a complete copy. */
export async function readLogFile(file: Blob, onProgress: (percent: number) => void) {
  if (!file || !Number.isFinite(file.size) || file.size > MAX_LOG_BYTES || file.size <= 0) throw new Error("Choose a non-empty text or JSON log, up to 25 MiB.");
  const parser = new LogParser();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const reader = file.stream().getReader();
  let read = 0;
  let progress = -1;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      read += value.byteLength;
      if (read > MAX_LOG_BYTES) throw new Error("This log exceeds the 25 MiB limit.");
      if (value.includes(0)) throw new Error("This file appears to be binary or UTF-16. Choose an immich-go UTF-8 text or JSON log.");
      parser.feed(decoder.decode(value, { stream: true }));
      const next = Math.min(100, Math.floor(read / file.size * 100));
      if (next !== progress) { progress = next; onProgress(next); }
    }
    parser.feed(decoder.decode());
    return parser.finish();
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
