# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
