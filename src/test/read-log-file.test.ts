/// <reference types="node" />
import { Blob as NodeBlob } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import { readLogFile } from "@/lib/read-log-file";
import { MAX_LOG_BYTES } from "@/lib/log-review";
import { SAMPLE_LOG } from "@/lib/sample-log";

const blob = (parts: ConstructorParameters<typeof NodeBlob>[0]) => new NodeBlob(parts) as unknown as Blob;

describe("bounded worker file reading", () => {
  it("streams UTF-8 with multibyte text and reports progress", async () => {
    const progress = vi.fn();
    const result = await readLogFile(blob([SAMPLE_LOG + '\n2026-10-16 12:00:20 WRN file access error file="写真.jpg"']), progress);
    expect(result.runs[0].counters.uploaded).toBe(110);
    expect(result.runs[0].issues.find(issue => issue.id === "files")?.examples[0].text).toContain("写真.jpg");
    expect(progress).toHaveBeenLastCalledWith(100);
  });
  it("rejects empty input and oversize input before opening a stream", async () => {
    await expect(readLogFile(blob([]), () => {})).rejects.toThrow("non-empty");
    const stream = vi.fn();
    await expect(readLogFile({ size: MAX_LOG_BYTES + 1, stream } as unknown as Blob, () => {})).rejects.toThrow("25 MiB");
    expect(stream).not.toHaveBeenCalled();
  });
  it("rejects binary/UTF-16 and malformed UTF-8 instead of inventing a report", async () => {
    await expect(readLogFile(blob([new Uint8Array([65, 0, 66, 0])]), () => {})).rejects.toThrow("binary or UTF-16");
    await expect(readLogFile(blob([new Uint8Array([255, 255])]), () => {})).rejects.toBeInstanceOf(TypeError);
  });
  it("keeps evidence bounded while streaming a large log", async () => {
    const line = '2026-10-16 12:00:01 ERR request timed out file="example.jpg"\n';
    const result = await readLogFile(blob(['2026-10-16 12:00:00 INF Command: immich-go upload from-folder\n', line.repeat(150000)]), () => {});
    expect(result.runs[0].errors).toBe(150000);
    expect(result.runs[0].issues[0].examples).toHaveLength(3);
    expect(JSON.stringify(result).length).toBeLessThan(10000);
  });
});
