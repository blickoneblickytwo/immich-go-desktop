# immich-go v0.32.0 CLI verification

Checked October 17, 2026. GitHub's [latest-release redirect](https://github.com/simulot/immich-go/releases/latest) and [release API](https://api.github.com/repos/simulot/immich-go/releases/latest) identified v0.32.0. The official macOS ARM64 archive was downloaded into the project's ignored cache; no system installation was changed.

Archive SHA-256: `0c1ce06932a21a738d9adaf2ddafdbf654113fc2791d31b6d2ea0044928e2f43`. It matched both the GitHub release asset digest and the release's [checksums.txt](https://github.com/simulot/immich-go/releases/download/v0.32.0/checksums.txt).

## Captures

- [Version](version.txt)
- [Folder command](upload-from-folder.help.txt)
- [Google Takeout command](upload-from-google-photos.help.txt)
- [iCloud command](upload-from-icloud.help.txt)
- [Immich source command](upload-from-immich.help.txt)
- [Eighteen flag-parsing checks and provenance](verification.json)

Each capture was produced with `version` or `upload <source> --help`. Destination and source device UUID defaults were replaced with `<local-device>` before files were saved. No credentials were supplied. The help's default concurrency is the CPU count of the verification computer; the app correctly leaves Balanced unset.

## Exposed Advanced controls

| App control | CLI mapping checked | App availability |
| --- | --- | --- |
| Destination album | `--into-album=<name>` | Folder |
| Takeout album filter | `--from-album-name=<name>` | Takeout |
| Burst photos | `--manage-burst=NoStack\|Stack` | Folder, Takeout |
| HEIC/JPEG pairs | `--manage-heic-jpeg=NoStack\|StackCoverHeic\|StackCoverJPG` | Folder, Takeout |
| Time-zone override | `--time-zone=<IANA zone>` | All four sources |
| Session tag | `--session-tag` | All four sources |
| Concurrent tasks | `--concurrent-tasks=<integer>` | All four; app accepts 1–20 |
| Request timeout | `--client-timeout=<minutes>m` | All four; app accepts 1–1440 minutes |

Neutral Advanced values omit their flags, leaving CLI defaults in effect. Slow/Fast explicitly set concurrency to 2/8; an Advanced override takes precedence. All overrides apply only to Custom. Existing Custom RAW/JPEG, date-range, album, tag, dry-run, error-handling, and job-pause flags were also checked. The contract test verifies generated names and stacking values against these captures.

For `from-immich`, `--client-timeout` applies to the destination client. The separate `--from-client-timeout` (20 minutes by default) is not exposed here. The upload time-zone override likewise does not set the source client's separate `--from-time-zone` flag.

This UI deliberately exposes fewer options than the CLI. In particular, upstream inherits stacking flags across upload commands, while this app exposes burst/HEIC stacking only for folder/Takeout. Upstream also accepts keep-only policies that this UI does not offer. No control was renamed or removed by this audit.

## Verification limits

Parsing probes append `--help`, so the binary parses the supplied flags without executing the import command. They confirm accepted names/types/enum values, not runtime semantics, timezone-database equivalence, stacking results, API permissions, or successful photo imports. No server request, real photo import, or native Windows execution was performed.

The app validates IANA time zones through the browser's Intl database; immich-go uses Go's timezone database. A zone accepted by a particular browser is not proof that every target computer has the same timezone data. Tagged [upload registration](https://github.com/simulot/immich-go/blob/v0.32.0/app/upload/upload.go), [stack option registration](https://github.com/simulot/immich-go/blob/v0.32.0/adapters/shared/stack.go), and [global option registration](https://github.com/simulot/immich-go/blob/v0.32.0/app/app.go) were reviewed alongside the captures.
