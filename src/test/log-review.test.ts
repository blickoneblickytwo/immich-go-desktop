import { describe, expect, it } from "vitest";
import { LogParser, MAX_LOG_LINE, parseLog, runNotes } from "@/lib/log-review";
import { SAMPLE_LOG } from "@/lib/sample-log";

const text = (message: string, level = "INF") => `2026-10-16 12:00:00 ${level} ${message}`;
const json = (msg: string, level = "INFO", extra = {}) => JSON.stringify({ time: "2026-10-16T12:00:00Z", level, msg, ...extra });
const command = "Command: immich-go upload from-folder";
const tracking = ["Asset Tracking Report:", "=====================", "Total Assets: 12 (1 MiB)", "Processed: 9", "Discarded: 2", "Errors: 0", "Pending: 1"];

describe("versioned log recognition", () => {
  it.each([text, json])("separates asset state totals, uploaded events, and log error messages", format => {
    const run = parseLog([command, ...tracking, "Event Report:", "Asset Lifecycle (PROCESSED):", "uploaded successfully: 8", "metadata updated: 1", "Asset Lifecycle (DISCARDED):", "server has duplicate: 2", "Check the log file: example.log"].map(value => format(value)).concat(format("failed to add assets to album", "ERROR")).join("\n")).runs[0];
    expect(run.counters).toMatchObject({ uploaded: 8, processed: 9, discarded: 2, errors: 0, pending: 1, serverDuplicates: 2, localDuplicates: null });
    expect(run.errors).toBe(1);
    expect(runNotes(run).join(" ")).toContain("zero asset errors");
    expect(runNotes(run).join(" ")).toContain("1 asset is reported as pending");
    expect(run.closed).toBe(true);
  });

  it("recognises the sample as synthetic-compatible data and flags its summary contradiction", () => {
    const report = parseLog(SAMPLE_LOG);
    expect(report.format).toBe("text");
    expect(report.runs[0].counters).toMatchObject({ uploaded: 110, errors: 0, pending: 0 });
    expect(report.runs[0].issues.map(issue => issue.id)).toEqual(["metadata", "access"]);
    expect(runNotes(report.runs[0]).join(" ")).toContain("error message");
  });

  it("never invents zero totals or treats processed as uploaded", () => {
    const run = parseLog([text(command), ...tracking.map(value => text(value))].join("\n")).runs[0];
    expect(run.counters.uploaded).toBeNull();
    expect(run.counters.localDuplicates).toBeNull();
    expect(runNotes(run).join(" ")).toContain("No closing log marker");
  });

  it("does not read numbers inside ordinary messages or file attributes as summary totals", () => {
    const run = parseLog([text(command), text("file uploaded Total Assets: 999 file=Pending:42"), json("Errors: 999", "INFO", { file: "uploaded successfully: 900" })].join("\n")).runs[0];
    expect(Object.values(run.counters).every(value => value === null)).toBe(true);
  });

  it("keeps appended runs separate and selects no aggregate total", () => {
    const report = parseLog([text(command), ...tracking.map(value => text(value)), text(command), text("uploaded successfully file=example.jpg")].join("\n"));
    expect(report.runs).toHaveLength(2);
    expect(report.runs[0].counters.total).toBe(12);
    expect(report.runs[1].counters.total).toBeNull();
    expect(report.runs[1].errors).toBe(0);
  });

  it("uses the latest repeated summary rather than adding snapshots", () => {
    const run = parseLog([text(command), ...tracking.map(value => text(value)), ...tracking.map(value => text(value.replace("Total Assets: 12", "Total Assets: 20")))].join("\n")).runs[0];
    expect(run.counters.total).toBe(20);
    expect(runNotes(run).join(" ")).toContain("does not add up");
    expect(runNotes(run).join(" ")).toContain("latest summary");
  });

  it("does not reuse old event totals when a later summary is incomplete", () => {
    const run = parseLog([text(command), ...tracking.map(value => text(value)), text("Event Report:"), text("uploaded successfully: 8"), ...tracking.map(value => text(value))].join("\n")).runs[0];
    expect(run.counters.uploaded).toBeNull();
    expect(run.counters.total).toBe(12);
  });

  it("keeps version metadata with its run when the next run uses a different version", () => {
    const report = parseLog([text("immich-go version 0.31.0"), text(command), text("immich-go version 0.32.0"), text(command)].join("\n"));
    expect(report.runs.map(run => run.version)).toEqual(["0.31.0", "0.32.0"]);
    expect(parseLog([text("immich-go version 0.32.0"), text(command), text(command)].join("\n")).runs[1].version).toBe("");
  });

  it("surfaces error-event summaries even if individual error records are absent", () => {
    const run = parseLog([text(command), ...tracking.map(value => text(value)), text("Event Report:"), text("upload failed: 4")].join("\n")).runs[0];
    expect(run.errors).toBe(0);
    expect(run.errorEvents["upload failed"]).toBe(4);
    expect(runNotes(run).join(" ")).toContain("event report includes error events");
  });

  it("handles missing headers, malformed JSON, and unrelated input conservatively", () => {
    const report = parseLog("{broken\n[1,2]\n{\"message\":\"not a supported log\"}\nPending: 4");
    expect(report.runs[0].malformed).toBe(2);
    expect(report.runs[0].known).toBe(false);
    expect(report.runs[0].counters.pending).toBeNull();
    expect(runNotes(report.runs[0]).join(" ")).toContain("unsupported format");
  });

  it("recognises JSON flag attributes and does not claim a dry run uploaded photos", () => {
    const run = parseLog([json(command), json("", "INFO", { "--dry-run": "true" }), ...tracking.map(value => json(value))].join("\n")).runs[0];
    expect(run.dryRun).toBe(true);
    expect(runNotes(run)[0]).toContain("do not establish that photos were uploaded");
  });

  it("supports CRLF, a BOM, ANSI prefixes, and chunks split within records", () => {
    const source = "\uFEFF" + SAMPLE_LOG.replace(/\n/g, "\r\n");
    const parser = new LogParser();
    for (let index = 0; index < source.length; index += 13) parser.feed(source.slice(index, index + 13));
    expect(parser.finish().runs[0].counters.uploaded).toBe(110);
    expect(parseLog(`${String.fromCharCode(27)}[32m${text(command)}${String.fromCharCode(27)}[0m`).runs[0].known).toBe(true);
  });

  it("bounds source excerpts and oversized lines without retaining an entire log", () => {
    const parser = new LogParser();
    parser.feed(text(command) + "\n");
    for (let index = 0; index < 200; index++) parser.feed(text("failure " + "x".repeat(2000), "ERR") + "\n");
    parser.feed("y".repeat(MAX_LOG_LINE + 1)); parser.feed("\n");
    const run = parser.finish().runs[0];
    expect(run.errors).toBe(200);
    expect(run.issues[0].examples).toHaveLength(3);
    expect(run.issues[0].examples[0].text.length).toBeLessThan(1250);
    expect(run.longLines).toBe(1);
  });

  it("does not interpret inherited property names as summary keys", () => {
    const run = parseLog([text("Asset Tracking Report:"), text("constructor: 42"), text("toString: 1")].join("\n")).runs[0];
    expect(Object.keys(run.counters)).toHaveLength(8);
    expect(Object.values(run.counters).every(value => value === null)).toBe(true);
  });

  it("limits concatenated runs and recognises mixed formats", () => {
    expect(parseLog(text(command) + "\n" + json("no action")).format).toBe("mixed");
    expect(() => parseLog(Array(51).fill(text(command)).join("\n"))).toThrow("more than 50 runs");
  });
});
