# immich-go log review contract

Checked October 16, 2026 against the `v0.32.0` tag. This is source/documentation verification, not a captured live photo import or a claim of support for every historical log.

## Primary sources

- [app/log.go](https://github.com/simulot/immich-go/blob/v0.32.0/app/log.go): text output uses console-slog with a date/time and level; JSON output uses Go slog (`time`, `level`, `msg`, and attributes). Each run logs its command. Files can be appended. The close message is `Check the log file:` and is not itself proof of a successful import.
- [internal/assettracker/tracker.go](https://github.com/simulot/immich-go/blob/v0.32.0/internal/assettracker/tracker.go): the Asset Tracking Report has total, processed, discarded, errors, and pending asset counters. Processed does not mean newly uploaded.
- [internal/fileevent/fileevents.go](https://github.com/simulot/immich-go/blob/v0.32.0/internal/fileevent/fileevents.go): the Event Report contains separate event labels, including upload success and server/local duplicates. Zero-valued events can be omitted, so absence is unknown rather than zero. Event counts must not be added to asset state totals.
- [app/upload/run.go](https://github.com/simulot/immich-go/blob/v0.32.0/app/upload/run.go): report lines are logged separately. Upload and album/tag operations can fail independently.
- [Upload options](https://github.com/simulot/immich-go/blob/v0.32.0/docs/commands/upload.md): album controls are source-specific; stacking controls in this release are exposed only for folder/Takeout sources. [Upload registration](https://github.com/simulot/immich-go/blob/v0.32.0/app/upload/upload.go) confirms shared session-tag handling and time-zone lookup.

## Conservative interpretation

Summary counters are recognised only after a supported report heading. A command marker separates appended runs; missing command markers cannot prove session boundaries. Repeated summaries use the latest counters and surface a notice. There is no success certification: a closing marker and a zero-error asset summary can coexist with failed organisation operations.

The parser retains only selected summary evidence and three shortened examples per warning/error group. It counts warning/error records separately from asset counters. Oversized lines, malformed JSON records, unknown formats, missing counters, contradictory totals, and missing closing markers are reported. Binary/UTF-16 files and files over 25 MiB are rejected.

`src/lib/sample-log.ts` and parser test data are synthetic fixtures derived from these message contracts. All file names, paths, counts, dates, and example errors are invented. They are not user logs or results of an import performed by this app.

The log reader runs in a worker and sends no log contents over the network. File selection is explicit. Returning to the wizard discards the report; the existing wizard remains mounted in memory. No additional browser persistence is introduced.
