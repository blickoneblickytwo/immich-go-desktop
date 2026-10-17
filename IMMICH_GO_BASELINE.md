# immich-go Baseline

This file tracks the exact upstream `immich-go` version used to verify command/flag behavior in this app.

## Current Baseline
- Upstream repo: [simulot/immich-go](https://github.com/simulot/immich-go)
- Target version: `v0.32.0`
- Latest CLI review: `2026-10-17`. The [official latest release](https://github.com/simulot/immich-go/releases/latest) and GitHub releases API both identify `v0.32.0`.
- Binary: official `immich-go_Darwin_arm64.tar.gz`, version `0.32.0`, commit `f7d19fce34acd4884ea2c02fc3025706a060afdf`.
- Archive SHA-256: `0c1ce06932a21a738d9adaf2ddafdbf654113fc2791d31b6d2ea0044928e2f43`, matched against both GitHub asset metadata and the release's `checksums.txt`.
- Verification method: **official binary help and flag parsing, plus tagged source**. All four supported source commands have sanitized help captures. Eighteen help-only parsing combinations check the exposed Advanced values, shared Custom flags, and concurrency/timeout boundaries.
- Evidence: [October 17 captures and scope](docs/immich-go-verification/2026-10-17/README.md), [machine-readable checks](docs/immich-go-verification/2026-10-17/verification.json), and `src/test/advanced-cli-contract.test.ts` comparing generated flags with the captured CLI contract.
- Latest Immich API review: `2026-10-08`, against `v3.3.0` (API specification only). No new server compatibility claim is made by the October 17 CLI checks.

The previous v0.32.0 binary-capture TODO is now resolved. These checks did not connect to a server, execute an import, or run a Windows binary. Help-only parsing confirms option acceptance, not server-side results or every runtime behavior. No system installation was replaced.

The captures replace both destination and source device UUID defaults with `<local-device>` before writing, so they contain no machine-specific hostname. The numeric concurrency default in a capture is specific to the verification computer; upstream uses its runtime CPU count, not a fixed default of 8.

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
   - Verify the archive checksum, then run `scripts/verify-immich-go-baseline.sh /path/to/immich-go YYYY-MM-DD` (requires Python 3; captures version and all four source commands, sanitizing device defaults).
3. Compare old vs new help outputs in `docs/immich-go-verification`.
4. Update:
   - `src/lib/flag-registry.ts`
   - Any command builders referencing renamed flags (`src/lib/friendly-flow.ts`, `src/lib/command-builder.ts`)
   - `README.md` compatibility and optional-feature instructions
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
| 2026-07-30 | `v0.32.0` | Re-verified against **Immich v3.1.0** (no immich-go release since v0.32.0, so no registry changes). Checked Immich's v3.1.0 OpenAPI spec: `GET /server/about` still present and still accepts `api_key` auth, and all 17 API-key permissions documented in the Help tab are still valid in the spec's `Permission` enum. Spec/doc verification only — binary artifact capture still pending. |
| 2026-10-08 | `v0.32.0` | Upstream's latest release remains v0.32.0. Checked generated options against the [tagged upload command reference](https://github.com/simulot/immich-go/blob/v0.32.0/docs/commands/upload.md). Checked the [Immich v3.3.0 OpenAPI spec](https://github.com/immich-app/immich/blob/v3.3.0/open-api/immich-openapi-specs.json): `GET /server/about` still accepts API-key auth and requires `server.about`. No integration change indicated. This is documentation/specification verification, not a live-import test; binary capture remains pending. |
| 2026-10-17 | `v0.32.0` | Latest-release check plus checksum-verified official macOS ARM64 binary. Captured all four source commands and passed 18 help-only flag-parsing combinations; added generated-option contract tests. Resolved the earlier binary-capture TODO. No live import or native Windows execution. |
