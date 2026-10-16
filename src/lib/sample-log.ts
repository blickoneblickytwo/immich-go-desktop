/** Synthetic fixture, not the result of an actual photo import. */
export const SAMPLE_LOG = `2026-10-16 12:00:00 INF immich-go version 0.32.0
2026-10-16 12:00:00 INF Command: immich-go upload from-folder
2026-10-16 12:00:00 INF --dry-run=false origin=cli
2026-10-16 12:00:03 WRN missing metadata file=example-photo.jpg
2026-10-16 12:00:04 ERR failed to add assets to album err="403 Forbidden" album="Example album"
2026-10-16 12:00:10 INF Asset Tracking Report:
2026-10-16 12:00:10 INF =====================
2026-10-16 12:00:10 INF Total Assets: 120
2026-10-16 12:00:10 INF Processed: 110
2026-10-16 12:00:10 INF Discarded: 10
2026-10-16 12:00:10 INF Errors: 0
2026-10-16 12:00:10 INF Pending: 0
2026-10-16 12:00:10 INF Event Report:
2026-10-16 12:00:10 INF =============
2026-10-16 12:00:10 INF Asset Lifecycle (PROCESSED):
2026-10-16 12:00:10 INF uploaded successfully: 110
2026-10-16 12:00:10 INF Asset Lifecycle (DISCARDED):
2026-10-16 12:00:10 INF server has duplicate: 10
2026-10-16 12:00:10 INF Check the log file: example-import.log
`;
