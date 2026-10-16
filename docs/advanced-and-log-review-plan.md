# Advanced controls and local log review

Agreed scope, October 16, 2026. Work stays on the local design branch; no publishing or GitHub ref changes are authorised.

## Beginner experience

Keep the four-step wizard, source presets, default test run, and minimal card. Advanced controls are opt-in under Custom. Reviewing an existing log is a separate optional view, reached from After you run it and Settings → Help. Opening/closing it must preserve an unfinished command without saving credentials or wizard state to new browser storage.

## Advanced controls

- Folder destination album and Takeout source-album filter, each only for its supported source.
- Burst stacking and HEIC/JPEG stacking for verified local-source commands; preserve existing RAW/JPEG controls.
- Optional IANA time-zone override and session tagging where verified.
- Connect speed presets to concurrency; optional explicit concurrency (1–20) overrides that preset. Optional positive request timeout.
- Collapsed by default, changed-setting count, reset action, source-aware applicability, no effect outside Custom. Neutral values emit no new flags. Preserve shell quoting and input validation.

## Log review

- User-selected text or JSON-lines logs, parsed in a dedicated worker. Maximum 25 MiB; bounded retained excerpts and cancel/clear actions.
- No log uploads, persistence, console logging, or automatic sharing. Logs can contain credentials, filenames, and paths; source entries stay collapsed. Display as escaped text.
- Verify supported log patterns against tagged upstream source. Use synthetic, sanitised fixtures derived from those patterns, clearly labelled as fixtures rather than real imports.
- Prefer explicit summary counters; missing values remain unknown. Never count error messages as failed photos. Detect contradictions, missing summaries, unsupported data, malformed JSON, and multiple runs without merging their totals.
- Report what the log says, not a guarantee that the server library is complete. Explain limited recognition and preserve evidence for inspection.

## Delivery order

1. Verify the upstream flag/log contracts and retain source references.
2. Implement command controls and regression tests, including unchanged beginner commands and source/shell combinations.
3. Implement the parser/worker independently, then the optional UI and sample-log view.
4. Update privacy/help wording and verify no log contents are sent or stored.
5. Run meaningful automated checks and browser verification, including mobile, keyboard interaction, cancellation, wizard preservation, and updated screenshots.

No arbitrary raw flag entry, automatic retries, execution of imports, or full native desktop packaging in this release.

## Implementation checkpoint

Both features are implemented. The optional reader uses a query-based view (`?view=import-report`) so a shared/refreshed URL remains compatible with static hosting. The wizard stays mounted while hidden; its connection fields and custom selections remain in page memory. No new packages or browser persistence were introduced.

The format contract and synthetic fixtures are documented in `docs/log-format-contract.md`. Tests cover unchanged beginner commands, source/shell applicability, numeric/time-zone validation, metadata attribution across runs, incomplete and contradictory summaries, UTF-8 streaming, size limits, bounded excerpts, cancellation, escaped markup, and returning to an unfinished wizard.

Browser verification includes the production base path and real worker, explicit selection of a JSON fixture, desktop/mobile layouts, invalid and valid Advanced values, reset behaviour, and keyboard disclosure interaction. Native Windows command execution and a real photo import remain untested. Screenshots are available under `screenshots/design-revision/new-features/`.
