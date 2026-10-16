/** Log patterns verified against immich-go v0.32.0. See docs/log-format-contract.md. */
export const MAX_LOG_BYTES = 25 * 1024 * 1024;
export const MAX_LOG_LINE = 16 * 1024;
const MAX_RUNS = 50;
const MAX_EXAMPLES = 3;

export type CounterKey = "total" | "processed" | "discarded" | "errors" | "pending" | "uploaded" | "serverDuplicates" | "localDuplicates";
export interface Evidence { line: number; text: string }
export interface LogIssue { id: string; title: string; hint: string; count: number; examples: Evidence[] }
export interface LogRun {
  number: number;
  started: string;
  version: string;
  hasCommand: boolean;
  dryRun: boolean | null;
  summaryCount: number;
  hasTracking: boolean;
  hasEvents: boolean;
  closed: boolean;
  known: boolean;
  errors: number;
  warnings: number;
  malformed: number;
  unrecognised: number;
  longLines: number;
  counters: Record<CounterKey, number | null>;
  issues: LogIssue[];
  evidence: Evidence[];
  errorEvents: Record<string, number>;
}
export interface LogReview { runs: LogRun[]; lines: number; format: "text" | "json" | "mixed" | "unknown" }

function newRun(number: number): LogRun {
  return { number, started: "", version: "", hasCommand: false, dryRun: null, summaryCount: 0, hasTracking: false, hasEvents: false, closed: false, known: false,
    errors: 0, warnings: 0, malformed: 0, unrecognised: 0, longLines: 0,
    counters: { total: null, processed: null, discarded: null, errors: null, pending: null, uploaded: null, serverDuplicates: null, localDuplicates: null }, issues: [], evidence: [], errorEvents: {} };
}

const trackingLabels: Record<string, CounterKey> = { "total assets": "total", processed: "processed", discarded: "discarded", errors: "errors", pending: "pending" };
const eventLabels: Record<string, CounterKey> = { "uploaded successfully": "uploaded", "server has duplicate": "serverDuplicates", "discarded local duplicate": "localDuplicates" };
const errorEventLabels = ["upload failed", "server error", "file access error", "incomplete processing"];
const categories = [
  { id: "access", pattern: /unauthori[sz]ed|forbidden|\b40[13]\b|api.?key/i, title: "Server access", hint: "Check the server address, key, and permissions for the operation named in the log." },
  { id: "network", pattern: /timeout|timed out|deadline|connection|no such host|certificate|\btls\b/i, title: "Connection or timeout", hint: "Check server availability and network access. A longer timeout or fewer concurrent tasks may help; review the exact error first." },
  { id: "metadata", pattern: /metadata|sidecar|\bjson\b/i, title: "Metadata needs review", hint: "Check the export’s matching metadata files. Missing metadata can affect dates or album information; it does not prove that a photo failed to upload." },
  { id: "organisation", pattern: /album|stack|\btag/i, title: "Albums, stacks, or tags", hint: "An upload and its organisation are separate operations. Check the affected items and the key’s permissions." },
  { id: "files", pattern: /file access|permission denied|no such file|unsupported|not handled/i, title: "Files need review", hint: "Check the named path, access permissions, or supported format. The reader has not opened or checked your photo files." },
  { id: "other", pattern: /./, title: "Other warnings and errors", hint: "Read the supporting entries and compare them with your Immich library before treating the import as complete." },
];

export function runNotes(run: LogRun): string[] {
  const notes: string[] = [];
  const c = run.counters;
  if (run.version && run.version !== "0.32.0") notes.push(`This log identifies immich-go ${run.version}. Recognition was checked against v0.32.0, so some entries may differ.`);
  if (!run.known) notes.push("No supported immich-go command or report was recognised. This file may use an unsupported format.");
  if (!run.hasTracking) notes.push("No Asset Tracking Report was found. Asset totals and completion cannot be established from this log.");
  else if ([c.total, c.processed, c.discarded, c.errors, c.pending].some(value => value === null)) notes.push("The asset summary is incomplete. Missing numbers are shown as unknown.");
  if (!run.closed) notes.push("No closing log marker was found. The log may be interrupted or copied only in part.");
  if (c.total !== null && [c.processed, c.discarded, c.errors, c.pending].every(value => value !== null) &&
      c.processed! + c.discarded! + c.errors! + c.pending! !== c.total) notes.push("The asset summary does not add up. Review the original log; these totals may be inconsistent.");
  if (c.errors === 0 && run.errors > 0) notes.push(`The summary reports zero asset errors, but this run contains ${run.errors} error message${run.errors === 1 ? "" : "s"}. These may concern other operations and still need review.`);
  if (Object.values(run.errorEvents).some(value => value > 0)) notes.push("The event report includes error events. Review the summary evidence as well as individual messages; events are not necessarily unique photos.");
  if (c.pending !== null && c.pending > 0) notes.push(`${c.pending} asset${c.pending === 1 ? " is" : "s are"} reported as pending. Check for missing photos and review the log.`);
  if (run.summaryCount > 1) notes.push("Multiple asset summaries were found in this run. The latest summary is shown; totals are not added together.");
  if (run.malformed > 0) notes.push(`${run.malformed} malformed or unsupported JSON record(s) could not be interpreted.`);
  if (run.longLines > 0) notes.push(`${run.longLines} oversized line(s) were omitted. Recognition may be incomplete.`);
  if (run.unrecognised > 0) notes.push(`${run.unrecognised} line(s) were not interpreted. This reader recognises a limited set of log patterns.`);
  if (run.dryRun === true) notes.unshift("This is a test-run log. Its reported counts do not establish that photos were uploaded.");
  return notes;
}

/** Incremental and bounded: no complete log or unbounded list of events is retained. */
export class LogParser {
  private runs: LogRun[] = [newRun(1)];
  private section: "tracking" | "events" | null = null;
  private line = 0;
  private pending = "";
  private dropping = false;
  private textRecords = 0;
  private jsonRecords = 0;
  private pendingVersion = "";
  private summaryHeadings = new Set<"tracking" | "events">();

  feed(chunk: string) {
    let start = 0;
    for (let end = chunk.indexOf("\n"); end !== -1; end = chunk.indexOf("\n", start)) {
      const part = chunk.slice(start, end);
      this.read(this.dropping || this.pending.length + part.length > MAX_LOG_LINE ? null : this.pending + part);
      this.pending = ""; this.dropping = false; start = end + 1;
    }
    const rest = chunk.slice(start);
    if (!this.dropping && this.pending.length + rest.length <= MAX_LOG_LINE) this.pending += rest;
    else { this.pending = ""; this.dropping = true; }
  }

  finish(): LogReview {
    if (this.pending || this.dropping) this.read(this.dropping ? null : this.pending);
    this.pending = ""; this.dropping = false;
    return { runs: this.runs, lines: this.line, format: this.jsonRecords && this.textRecords ? "mixed" : this.jsonRecords ? "json" : this.textRecords ? "text" : "unknown" };
  }

  private read(raw: string | null) {
    this.line++;
    let run = this.runs[this.runs.length - 1];
    if (raw === null) { run.longLines++; return; }
    const clean = raw.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, "g"), "").replace(/^\uFEFF/, "").trim();
    if (!clean) return;
    let message = clean;
    let level = "";
    let time = "";
    let attributes: Record<string, unknown> = {};
    if (clean.startsWith("{")) {
      try {
        const data: unknown = JSON.parse(clean);
        if (!data || typeof data !== "object" || Array.isArray(data) || typeof (data as Record<string, unknown>).msg !== "string") { run.malformed++; return; }
        attributes = data as Record<string, unknown>;
        message = attributes.msg as string;
        level = typeof attributes.level === "string" ? attributes.level.toUpperCase() : "";
        time = typeof attributes.time === "string" ? attributes.time.slice(0, 64) : "";
        this.jsonRecords++;
      } catch { run.malformed++; return; }
    } else {
      const record = clean.match(/^(\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d(?:[.\dZ+:-]*)?)\s+(INFO|WARN|ERROR|DEBUG|INF|WRN|ERR|DBG)(?:\s+|$)(.*)$/);
      if (record) { [, time, level, message] = record; this.textRecords++; }
    }
    const msg = message.trim();
    if (/^Command:\s+.*\bupload\s+from-[\w-]+(?:\s|$)/i.test(msg)) {
      if (run.hasCommand) {
        if (this.runs.length >= MAX_RUNS) throw new Error("This file contains more than 50 runs. Review a smaller log file.");
        run = newRun(this.runs.length + 1); run.version = this.pendingVersion; this.runs.push(run);
      }
      run.hasCommand = true; run.known = true; run.started = time; this.section = null;
      this.pendingVersion = "";
      this.summaryHeadings.clear();
    }
    const version = msg.match(/\bimmich-go\b.*?\bv?(\d+\.\d+\.\d+)/i);
    if (version) { if (!run.hasCommand) run.version = version[1]; this.pendingVersion = version[1]; run.known = true; }
    if (attributes["--dry-run"] === "true" || attributes["--dry-run"] === true || /^--dry-run=true(?:\s|$)/.test(msg)) run.dryRun = true;
    if (attributes["--dry-run"] === "false" || attributes["--dry-run"] === false || /^--dry-run=false(?:\s|$)/.test(msg)) run.dryRun = false;
    const heading = msg === "Asset Tracking Report:" ? "tracking" : msg === "Event Report:" ? "events" : null;
    if (heading) {
      if (this.summaryHeadings.has(heading)) {
        for (const key of Object.keys(run.counters) as CounterKey[]) run.counters[key] = null;
        run.evidence = []; run.errorEvents = {}; run.hasTracking = false; run.hasEvents = false;
        this.summaryHeadings.clear();
      }
      this.summaryHeadings.add(heading); run.closed = false;
    }
    if (heading === "tracking") {
      run.known = true; run.hasTracking = true; run.summaryCount++; this.section = "tracking";
      for (const key of Object.values(trackingLabels)) run.counters[key] = null;
      run.evidence = run.evidence.filter(entry => !entry.text.startsWith("Asset summary:"));
    } else if (heading === "events") {
      run.known = true; run.hasEvents = true; this.section = "events";
      for (const key of Object.values(eventLabels)) run.counters[key] = null;
      run.evidence = run.evidence.filter(entry => !entry.text.startsWith("Event summary:"));
    } else if (/^Check the log file:/.test(msg)) { run.closed = true; this.section = null; }
    else if (this.section) {
      const counter = msg.match(/^([A-Za-z][A-Za-z ]*?)\s*:\s*(\d+)\s*(?:\([^\n]*\))?$/);
      const labels = this.section === "tracking" ? trackingLabels : eventLabels;
      const label = counter?.[1].trim().toLowerCase();
      const key = label && Object.prototype.hasOwnProperty.call(labels, label) ? labels[label] : undefined;
      if (key && Number.isSafeInteger(Number(counter![2]))) {
        run.counters[key] = Number(counter![2]);
        if (run.evidence.length < 24) run.evidence.push({ line: this.line, text: `${this.section === "tracking" ? "Asset" : "Event"} summary: ${msg.slice(0, 512)}` });
      } else if (this.section === "events" && label && errorEventLabels.includes(label) && Number.isSafeInteger(Number(counter![2]))) {
        run.errorEvents[label] = Number(counter![2]);
        if (run.evidence.length < 24) run.evidence.push({ line: this.line, text: `Event summary: ${msg.slice(0, 512)}` });
      } else if (!/^(?:[=-]+|Discovery \([^)]*\):|Asset Lifecycle \([^)]*\):|Processing Events:|.*WARNING:.*final state.*)$/.test(msg) && !counter && !level) run.unrecognised++;
    }
    const error = level === "ERROR" || level === "ERR";
    const warning = level === "WARN" || level === "WRN";
    if (error || warning) {
      if (error) run.errors++; else run.warnings++;
      // Attributes can identify the reason in JSON records; bounded before classification/display.
      const description = `${msg} ${typeof attributes.error === "string" ? attributes.error.slice(0, 1024) : ""} ${typeof attributes.err === "string" ? attributes.err.slice(0, 1024) : ""}`;
      const category = categories.find(item => item.pattern.test(description)) ?? categories[categories.length - 1];
      let issue = run.issues.find(item => item.id === category.id);
      if (!issue) { issue = { id: category.id, title: category.title, hint: category.hint, count: 0, examples: [] }; run.issues.push(issue); }
      issue.count++;
      if (issue.examples.length < MAX_EXAMPLES) issue.examples.push({ line: this.line, text: clean.slice(0, 1200) + (clean.length > 1200 ? " … [excerpt shortened]" : "") });
    } else if (!level && !this.section && !run.hasCommand && !version && !/^Command:/.test(msg)) run.unrecognised++;
  }
}

export function parseLog(text: string): LogReview {
  const parser = new LogParser(); parser.feed(text); return parser.finish();
}
