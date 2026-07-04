# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
