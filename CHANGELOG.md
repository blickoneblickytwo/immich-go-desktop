# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.3.0] - 2026-07-14
### Fixed
- Generated command was missing the line-continuation character on its first line (the
  binary), so pasting it into PowerShell, bash, or cmd ran the binary with no arguments and
  errored on the next line. Every line except the last now carries the continuation.
  Added a regression test covering all three shells. (Thanks u/atlasxoxo_.)

### Changed
- The connection test on the Connect step is now **purely informational and never blocks**.
  Continue always works once the fields the command needs are filled in — no checkbox, no
  network call required, no "continue anyway" workaround. `Test connection` is a separate,
  optional button. Directly addresses u/apparle's request (servers unreachable from the
  browser, or just not wanting to wait on a doomed request) without needing an explicit
  skip toggle.

### Added
- **The API key is now optional.** Leave it blank and the generated command contains a
  `YOUR_API_KEY` placeholder (`YOUR_SOURCE_API_KEY` for server-to-server migrations) to
  fill in yourself — the key never has to touch this page at all. Server URLs are still
  required (the command is meaningless without them). `Test connection` still needs a real
  key, since it can't ping with a placeholder. Step 4 calls out the placeholder with a
  visible reminder and leaves it unmasked so it's obvious what to replace. The strongest
  possible answer to u/apparle's original privacy concern.
- **Settings dialog**, opened via a minimal gear icon in the title bar, with three tabs:
  **Privacy** (plain-English explanation of exactly what happens to your API key, plus a
  "Forget saved credentials" button), **Help** (getting an API key and the minimal
  permissions immich-go needs, what the connection test does and why it can fail on
  internal/private servers, and how to read immich-go's output including the "N assets did
  not reach a final state" warning), and **About** (version, immich-go baseline, links).
  (Prompted by u/tlxxxsracer's and u/a1b2c3d45ef6's questions.)
- Post-run guidance on the final step pointing to the Help tab for reading immich-go's
  output.
- Command box now scrolls horizontally instead of wrapping, so long commands stay readable.
  (Thanks u/atlasxoxo_.)

## [0.2.0] - 2026-07-04
### Added
- **Soft-card redesign**: Linear/Notion-style aesthetic. Warm off-white neutral palette,
  hairline + dashed dividers, muted tile fills, tinted pill badges (coral/orange for
  "live upload", green for "dry run"), near-black dark neutral primary buttons, bigger
  soft rounded corners (`--radius: 1rem`), and a more diffuse window shadow. Active step
  dot and selected-card border/tint are coral-orange via the `--step-active` token.
- Subtle step transitions (cross-fade) via [Motion](https://motion.dev), loaded through
  `LazyMotion`/`domMin` to keep the bundle impact minimal. Respects the OS "reduce
  motion" setting automatically. Card press feedback uses plain CSS (`active:scale`),
  not Motion, to avoid pulling in gesture-recognizer code for a simple tap effect.
- Support for two new immich-go import sources: `from-icloud` and `from-immich`
  (server-to-server migration with a dedicated source server/API-key step).
- New flags in the registry for the new sources: `--from-server`, `--from-api-key`,
  `--from-favorite`, `--from-archived`, `--from-trash`, `--from-albums`, `--from-tags`,
  `--from-date-range`, `--from-include-extensions`, `--from-exclude-extensions`,
  `--from-include-type`, and `--memories`.
- CI workflow (`.github/workflows/ci.yml`) running lint, test, and build on pull requests.

### Changed
- Updated immich-go verification baseline from `v0.31.0` to `v0.32.0` (Immich v3.0.0 compat).
- API-key masking now also hides the source server's `--from-api-key`.

### Removed
- Deleted the unused legacy command path (`src/lib/command-builder.ts` and the orphaned
  `CommandPreview`/`ConnectionStep`/`OptionsStep`/`ReviewStep` components); `detectOS`
  now lives in `src/lib/os.ts`.
- Dropped duplicate lockfiles (`bun.lock`, `bun.lockb`) in favor of `package-lock.json`.

## [2026-03-16]
### Changed
- Updated immich-go verification baseline from `v0.27.0` to `v0.31.0`.
- Updated generated command handling to use `--on-errors` (replacing `--on-server-errors`).
- Updated flag registry defaults for `--ban-file` to match `v0.31.0`.
- Added new global flags to the registry: `--concurrent-tasks`, `--config`, and `--save-config`.
- Removed deprecated `--album-picasa` from the folder-specific registry.
- Refreshed README Supported Flags and Compatibility sections to match `v0.31.0`.

### Added
- Added explicit README section: `Workflow Updates` with monthly baseline verification steps.
- Added [`IMMICH_GO_BASELINE.md`](./IMMICH_GO_BASELINE.md) to track verified upstream version and update cadence.
- Added [`scripts/verify-immich-go-baseline.sh`](./scripts/verify-immich-go-baseline.sh) to capture reusable verification artifacts.
- Added verification artifact snapshots under `docs/immich-go-verification/2026-03-16/`.

## [2026-03-07]
### Added
- Replaced the default template README with product-focused documentation.
- Added top-of-file visual demo embed location (`screenshots/wizard-flow.gif`).
- Added badge row for Live Demo, GitHub Stars, No Build Required, and Privacy First.
- Added Quick Start, Common Presets, Supported Flags, Compatibility, Contributing, Privacy, and Changelog sections.
- Added full flag matrix sourced from `src/lib/flag-registry.ts`.
