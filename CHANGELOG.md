# Changelog

## v0.1.1 – 2026-02-26

- Switch generated error handling flag to `--on-errors` to match current immich-go.
- Fix Windows command to start with `.\immich-go upload from-folder`.
- Add optional Admin API Key support (`--admin-api-key=...`) and clarify pause-jobs requirements.
- Improve connection testing with multiple fallback endpoints and timeout handling.
- Preserve robust clipboard fallback for `file://` and offline contexts.

Thanks to @asterix1s for suggesting and refining these fixes.

