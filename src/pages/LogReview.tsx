import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_LOG_BYTES, runNotes, type LogReview as Review } from "@/lib/log-review";
import { SAMPLE_LOG } from "@/lib/sample-log";
import type { ReviewResponse } from "@/workers/log-review.worker";

export default function LogReview() {
  const [report, setReport] = useState<Review | null>(null);
  const [selectedRun, setSelectedRun] = useState(0);
  const [fileName, setFileName] = useState("");
  const [sample, setSample] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const worker = useRef<Worker | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const results = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); return () => { worker.current?.terminate(); worker.current = null; }; }, []);
  useEffect(() => { if (report) results.current?.focus(); }, [report]);

  const clear = (notice = "Log cleared from this page. Your original file is unchanged.") => {
    worker.current?.terminate(); worker.current = null;
    setReport(null); setProgress(null); setFileName(""); setSample(false); setError(""); setMessage(notice);
    if (input.current) input.current.value = "";
  };
  const reviewFile = (file: File, isSample = false) => {
    clear("");
    if (file.size === 0 || file.size > MAX_LOG_BYTES) { setError("Choose a non-empty log up to 25 MiB."); return; }
    setFileName(file.name); setSample(isSample); setProgress(0);
    try {
      const task = new Worker(new URL("../workers/log-review.worker.ts", import.meta.url), { type: "module" });
      worker.current = task;
      task.onmessage = ({ data }: MessageEvent<ReviewResponse>) => {
        if (worker.current !== task) return;
        if (data.type === "progress") { setProgress(data.percent); return; }
        task.terminate(); worker.current = null; setProgress(null);
        if (data.type === "error") setError(data.message);
        else { setReport(data.report); setSelectedRun(data.report.runs.length - 1); }
      };
      task.onerror = event => {
        event.preventDefault();
        if (worker.current !== task) return;
        task.terminate(); worker.current = null; setProgress(null);
        setError("Local log processing stopped unexpectedly. Try a smaller log or a current browser.");
      };
      task.postMessage({ file });
    } catch {
      worker.current?.terminate(); worker.current = null; setProgress(null);
      setError("This browser could not start local log processing. Try a current browser with Web Worker support.");
    }
  };
  const run = report?.runs[selectedRun];
  const notes = run ? runNotes(run) : [];
  const count = (value: number | null) => value === null ? "Unknown" : value.toLocaleString();

  return <div className="review-page">
    <main className="review-shell">
      <Link to="/" className="review-back"><ArrowLeft aria-hidden="true" /> Back to import</Link>
      <header className="review-header">
        <p className="review-eyebrow">Log review</p>
        <h1 ref={heading} tabIndex={-1}>Understand your import.</h1>
        <p>Read what immich-go reported, and see what needs a closer look.</p>
      </header>
      <section className={`log-picker${report ? " has-report" : ""}${dragging ? " is-dragging" : ""}`} aria-label="Choose an import log"
        onDragOver={event => { event.preventDefault(); setDragging(true); }}
        onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
        onDrop={event => {
          event.preventDefault(); setDragging(false);
          if (event.dataTransfer.files.length !== 1) { setError("Choose one log file at a time."); return; }
          reviewFile(event.dataTransfer.files[0]);
        }}>
        <Upload aria-hidden="true" className="picker-icon" />
        <div><h2>Drop an import log here</h2><p>Text or JSON lines · Up to 25 MiB</p></div>
        <label className="file-label">
          <input ref={input} className="sr-only" type="file" accept=".log,.txt,.json,.jsonl,text/plain,application/json" aria-label="Choose log file"
            onChange={event => { const file = event.target.files?.[0]; if (file) reviewFile(file); }} />
          Choose a file
        </label>
        {!report && progress === null && <button type="button" className="sample-link" onClick={() => reviewFile(new File([SAMPLE_LOG], "sample-import.log", { type: "text/plain" }), true)}>Try a sample log</button>}
      </section>
      <p className="log-privacy">Log contents are processed in this browser and aren’t uploaded or saved by the app. Logs can contain private paths and credentials.</p>
      <div aria-live="polite" role="status" className="review-message">{message}</div>
      {error && <p role="alert" className="review-error">{error}</p>}
      {progress !== null && <div className="review-progress">
        <p role="status">Reading log… {progress}%</p><progress value={progress} max={100} aria-label="Log reading progress" />
        <Button variant="ghost" onClick={() => clear("Reading cancelled. No log is retained by this view.")}>Cancel</Button>
      </div>}
      {report && run && <section className="review-results" aria-labelledby="log-results-title">
        <div className="results-heading">
          <div><h2 id="log-results-title" ref={results} tabIndex={-1}>{sample ? "Sample log" : "Your log review"}</h2>
            <p className="log-file-name"><FileText aria-hidden="true" />{fileName}</p></div>
          <Button variant="ghost" size="sm" onClick={() => { clear(); input.current?.focus(); }}><X aria-hidden="true" />Clear log</Button>
        </div>
        {sample && <p className="sample-notice">Example data only. This is a synthetic log, not an actual import.</p>}
        {report.runs.length > 1 && <div className="run-selector"><label htmlFor="log-run">This file contains {report.runs.length} runs. Review one at a time.</label>
          <select className="quiet-select" id="log-run" value={selectedRun} onChange={event => setSelectedRun(Number(event.target.value))}>
            {report.runs.map((item, index) => <option key={item.number} value={index}>Run {item.number}{item.started ? ` · ${item.started}` : ""}{index === report.runs.length - 1 ? " (latest)" : ""}</option>)}
          </select>
        </div>}
        <div className="report-status"><span className="mode-tag">{run.hasTracking ? "Asset summary found" : run.known ? "Partial log" : "Unrecognised format"}</span>
          <span>{report.format === "unknown" ? "Format unknown" : `${report.format.toUpperCase()} log`}{run.version ? ` · immich-go ${run.version}` : ""}</span></div>
        <dl className="report-counts">
          {([ ["Reported uploads", run.counters.uploaded], ["Skipped / discarded", run.counters.discarded], ["Asset errors", run.counters.errors], ["Pending", run.counters.pending] ] as const).map(([label, value]) =>
            <div key={label}><dt>{label}</dt><dd>{count(value)}</dd></div>)}
        </dl>
        <p className="report-scope">These are reported counts, not a check of your Immich library. Unknown means the log did not provide a recognised total.</p>
        {notes.length > 0 && <section className="report-notes" aria-label="Review limitations"><h3>Before you call it complete</h3><ul>{notes.map(note => <li key={note}>{note}</li>)}</ul></section>}
        <section className="report-issues"><h3>Warnings & errors</h3>
          <p className="field-note">{run.errors} error message{run.errors === 1 ? "" : "s"} · {run.warnings} warning{run.warnings === 1 ? "" : "s"}. Message counts are not counts of failed photos.</p>
          {run.issues.length === 0 ? <p className="report-empty">No warning or error messages were recognised in this run. This does not prove that every photo imported.</p> : run.issues.map(issue => <details key={`${selectedRun}-${issue.id}`} className="quiet-details report-issue">
            <summary>{issue.title}<span>{issue.count} message{issue.count === 1 ? "" : "s"}</span></summary>
            <div className="details-content"><p>{issue.hint}</p>
              <details className="source-excerpts"><summary>View source excerpts · may contain private details</summary>
                {issue.examples.map(entry => <div key={entry.line}><p>Line {entry.line}</p><pre>{entry.text}</pre></div>)}
                <p className="field-note">Up to 3 excerpts per group, shortened to 1200 characters each.</p>
              </details>
            </div>
          </details>)}
        </section>
        <details key={`summary-${selectedRun}`} className="quiet-details report-evidence"><summary>More reported counts & evidence</summary>
          <div className="details-content"><dl className="report-facts">
            {([ ["Total assets", run.counters.total], ["Processed", run.counters.processed], ["Server duplicates", run.counters.serverDuplicates], ["Local duplicates", run.counters.localDuplicates] ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{count(value)}</dd></div>)}
          </dl><p className="field-note">Processed can include updates as well as uploads. Duplicates can be included in discarded counts; don’t add these numbers together.</p>
            <details className="source-excerpts"><summary>View summary excerpts</summary>{run.evidence.length ? run.evidence.map((entry, index) => <pre key={`${entry.line}-${index}`}>Line {entry.line} · {entry.text}</pre>) : <p>No recognised summary counters were found.</p>}</details>
          </div>
        </details>
      </section>}
      <footer className="review-footer"><img src={`${import.meta.env.BASE_URL}logo.png`} alt="Go Desktop" className="app-logo" width={219} height={55} /><p>Your original log file is unchanged.</p></footer>
    </main>
  </div>;
}
