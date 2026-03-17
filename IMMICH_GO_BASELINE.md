# immich-go Baseline

This file tracks the exact upstream `immich-go` version used to verify command/flag behavior in this app.

## Current Baseline
- Upstream repo: [simulot/immich-go](https://github.com/simulot/immich-go)
- Target version: `v0.31.0`
- Verified on: `2026-03-16`
- Verifier binary: official release asset `immich-go_Darwin_arm64.tar.gz`
- Verification artifacts:
  - [`docs/immich-go-verification/2026-03-16/version.txt`](./docs/immich-go-verification/2026-03-16/version.txt)
  - [`docs/immich-go-verification/2026-03-16/upload-from-folder.help.txt`](./docs/immich-go-verification/2026-03-16/upload-from-folder.help.txt)
  - [`docs/immich-go-verification/2026-03-16/upload-from-google-photos.help.txt`](./docs/immich-go-verification/2026-03-16/upload-from-google-photos.help.txt)

## Update Routine (Recommended Monthly)
1. Download the latest `immich-go` release binary for your platform from:
   - https://github.com/simulot/immich-go/releases/latest
2. Capture verification artifacts:
   - `scripts/verify-immich-go-baseline.sh /path/to/immich-go YYYY-MM-DD`
3. Compare old vs new help outputs in `docs/immich-go-verification`.
4. Update:
   - `src/lib/flag-registry.ts`
   - Any command builders referencing renamed flags (`src/lib/friendly-flow.ts`, `src/lib/command-builder.ts`)
   - `README.md` compatibility + Supported Flags table
   - `CHANGELOG.md`
   - this file (`IMMICH_GO_BASELINE.md`)
5. Run checks:
   - `npm test`
   - `npm run build`

## Baseline History
| Date | Version | Notes |
| --- | --- | --- |
| 2026-03-06 | `v0.27.0` | Initial verified registry committed in this repo. |
| 2026-03-16 | `v0.31.0` | Updated for `--on-errors`, new global flags (`--concurrent-tasks`, `--config`, `--save-config`), updated `--ban-file` defaults, removed `--album-picasa`. |
