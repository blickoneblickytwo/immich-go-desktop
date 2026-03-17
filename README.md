# immich-go desktop

![20-second wizard demo](./screenshots/wizard-flow.gif)

> Replace `screenshots/wizard-flow.gif` with a real 20-second capture of: `connect -> pick mode -> configure -> copy command`.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Try_it_Now-0ea5e9?logo=cloudflarepages&logoColor=white)](https://immich-go-desktop.pages.dev) [![GitHub Stars](https://img.shields.io/github/stars/blickoneblickytwo/immich-go-desktop?style=flat)](https://github.com/blickoneblickytwo/immich-go-desktop/stargazers) [![No Build Required](https://img.shields.io/badge/No_Build-Required-16a34a)](https://immich-go-desktop.pages.dev) [![Privacy First](https://img.shields.io/badge/Privacy-First-111827)](#privacy)

Generate safe, copy-paste-ready `immich-go` commands in a guided wizard.

Current immich-go baseline: **v0.31.0** (tracked in [IMMICH_GO_BASELINE.md](./IMMICH_GO_BASELINE.md)).

## Quick Start
Open the [live demo](https://immich-go-desktop.pages.dev), pick your source, and copy your command in under a minute.

## Common Presets

| Preset | Best for | What it does |
| --- | --- | --- |
| First Run Test (dry-run) | First-time setup validation | Uses the `Test run` flow and adds `--dry-run` so nothing uploads. |
| Google Takeout Standard | Typical Google Photos migration | Select `Google Photos Takeout` + `Standard import` to import everything and recreate albums. |
| Large Local Library | Big folder/NAS imports | Select `Photos from my computer` + `Organize by folder` (or `Custom`), keep `--on-errors=continue`, and run a dry-run first. |

## Supported Flags
Flag compatibility below is generated from [`src/lib/flag-registry.ts`](./src/lib/flag-registry.ts), verified against `immich-go` `v0.31.0` on `2026-03-16`.

### Core (all imports)

| Flag | Type | Default | Notes |
| --- | --- | --- | --- |
| `--admin-api-key` | `string` | `null` | Admin API key for job management operations |
| `--api-key` | `string` | `null` | Immich API key |
| `--api-trace` | `boolean` | `false` | Enable API call tracing |
| `--ban-file` | `file-list` | `@eaDir/`, `@__thumb/`, `SYNOFILE_THUMB_*.*`, `Lightroom Catalog/`, `thumbnails/`, `.DS_Store`, `/._*`, `.Spotlight-V100/`, `.photostructure/`, `Recently Deleted/` | Exclude files matching patterns; can be passed multiple times |
| `--client-timeout` | `duration` | `20m0s` | Server call timeout |
| `--concurrent-tasks` | `number` | `8` | Number of concurrent tasks (1-20) |
| `--config` | `string` | `./immich-go.yaml` | Path to config file |
| `--date-range` | `date-range` | `unset` | Only import assets within the specified date range |
| `--device-uuid` | `string` | `Seans-Mac-mini.local` | Override device UUID |
| `--dry-run` | `boolean` | `false` | Simulate actions without uploading |
| `--exclude-extensions` | `extensions` | `none` | Comma-separated extensions to exclude |
| `--help` | `boolean` | `false` | Show help for the command |
| `--include-extensions` | `extensions` | `all` | Comma-separated extensions to include |
| `--include-type` | `enum` | `all` | Single file type to include (`VIDEO` or `IMAGE`) |
| `--log-file` | `string` | `null` | Write logs to a file |
| `--log-level` | `string` | `INFO` | Log level (`DEBUG|INFO|WARN|ERROR`) |
| `--log-type` | `string` | `text` | Log output format |
| `--manage-burst` | `enum` | `NoStack` | Burst handling policy |
| `--manage-epson-fastfoto` | `boolean` | `false` | Enable Epson FastFoto handling |
| `--manage-heic-jpeg` | `enum` | `NoStack` | HEIC/JPEG coupling policy |
| `--manage-raw-jpeg` | `enum` | `NoStack` | RAW/JPEG coupling policy |
| `--no-ui` | `boolean` | `false` | Disable terminal UI |
| `--on-errors` | `enum` | `stop` | Behavior when errors occur (`stop|continue|<n> errors`) |
| `--overwrite` | `boolean` | `false` | Overwrite remote files with local versions |
| `--pause-immich-jobs` | `boolean` | `true` | Pause Immich background jobs during upload |
| `--save-config` | `boolean` | `false` | Save the current configuration to immich-go.yaml |
| `--server` | `string` | `null` | Immich server URL |
| `--session-tag` | `boolean` | `false` | Tag imported assets with `{immich-go}/YYYY-MM-DD HH-MM-SS` |
| `--skip-verify-ssl` | `boolean` | `false` | Skip SSL certificate verification |
| `--tag` | `string[]` | `[]` | Add one or more tags to imported assets |
| `--time-zone` | `string` | `null` | Override system time zone |

### Folder import only

| Flag | Type | Default | Notes |
| --- | --- | --- | --- |
| `--album-path-joiner` | `string` | ` / ` | String used to join folder names when composing album names |
| `--date-from-name` | `boolean` | `true` | Use date from filename when metadata date is unavailable |
| `--folder-as-album` | `enum` | `NONE` | Map folders to albums using mode `FOLDER` or `PATH` |
| `--folder-as-tags` | `boolean` | `false` | Use folder structure as tags |
| `--ignore-sidecar-files` | `boolean` | `false` | Skip sidecar files |
| `--into-album` | `string` | `null` | Import all files into a specific album |
| `--recursive` | `boolean` | `true` | Traverse sub-folders recursively |

### Google Takeout only

| Flag | Type | Default | Notes |
| --- | --- | --- | --- |
| `--from-album-name` | `string` | `null` | Import only assets from a specific Google Photos album |
| `--include-archived` | `boolean` | `true` | Include archived Google Photos assets |
| `--include-partner` | `boolean` | `true` | Include partner-shared Google Photos assets |
| `--include-trashed` | `boolean` | `false` | Include trashed Google Photos assets |
| `--include-unmatched` | `boolean` | `false` | Include assets without matching JSON metadata |
| `--include-untitled-albums` | `boolean` | `false` | Include photos from untitled albums |
| `--partner-shared-album` | `string` | `null` | Album to receive partner-shared photos |
| `--people-tag` | `boolean` | `true` | Tag assets using JSON people metadata as `people/name` |
| `--sync-albums` | `boolean` | `true` | Create/sync Immich albums from Google Photos albums |
| `--takeout-tag` | `boolean` | `true` | Tag assets with `{takeout}/takeout-YYYYMMDDTHHMMSSZ` |

## Compatibility
- `immich-go` support: verified flag compatibility with `v0.31.0` (last verification: `2026-03-16`).
- Baseline/version record: [IMMICH_GO_BASELINE.md](./IMMICH_GO_BASELINE.md).
- Browser support target: current versions of Chrome, Edge, Firefox, and Safari.
- Tested workflow: `connect -> pick mode -> configure -> copy command` in modern desktop browsers.

## Workflow Updates
- We now track upstream baseline changes in [IMMICH_GO_BASELINE.md](./IMMICH_GO_BASELINE.md).
- Use the verification script to snapshot each upstream update:
  - `scripts/verify-immich-go-baseline.sh /path/to/immich-go YYYY-MM-DD`
- Script output is stored under `docs/immich-go-verification/<date>/` and should be committed with each baseline bump.
- Recommended cadence: run this monthly or whenever `simulot/immich-go` publishes a new release.

## Contributing
1. Fork the repo and create a branch (`codex/your-change` format works well).
2. Run locally with `npm i` then `npm run dev`.
3. Keep changes focused, include screenshots/GIFs for UI updates, and open a PR with before/after context.
4. Add or update tests when behavior changes (`npm test`).

Start here: [good first issues](https://github.com/blickoneblickytwo/immich-go-desktop/labels/good%20first%20issue)

## Privacy
- No photo, path, or API key data is sent to third-party services.
- No analytics, tracking pixels, or telemetry are included.
- No server calls are made by default.
- The only optional network call is the connection test to your own Immich server (`/api/server/about`) when you click **Continue** on the connect step.
- If you enable “Remember on this device”, credentials are saved only in your browser `localStorage`.

## Changelog
See [CHANGELOG.md](./CHANGELOG.md) for release notes.
