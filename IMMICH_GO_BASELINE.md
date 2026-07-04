# immich-go Baseline

This file tracks the exact upstream `immich-go` version used to verify command/flag behavior in this app.

## Current Baseline
- Upstream repo: [simulot/immich-go](https://github.com/simulot/immich-go)
- Target version: `v0.32.0`
- Verified on: `2026-06-25`
- Verification method: **upstream documentation + release notes** (not a binary capture).
  Flags for the new `from-immich` and `from-icloud` sources were sourced
  from [`docs/upload-commands-overview.md`](https://github.com/simulot/immich-go/blob/main/docs/upload-commands-overview.md)
  and the [v0.32.0 release notes](https://github.com/simulot/immich-go/releases/tag/v0.32.0).
- ⚠️ TODO: capture binary verification artifacts under `docs/immich-go-verification/2026-06-25/`
  using `scripts/verify-immich-go-baseline.sh` against the official v0.32.0 release asset,
  then confirm exact flag names/defaults for the new sources.

### Previous binary-verified baseline (`v0.31.0`)
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
| 2026-06-25 | `v0.32.0` | Doc-verified bump (Immich v3.0.0 compat). Added `from-immich`/`from-icloud` sources and their flags (`--from-*`, `--memories`). Binary artifact capture still pending. |
