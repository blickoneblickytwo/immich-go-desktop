#!/usr/bin/env bash
set -euo pipefail

BIN_PATH="${1:-immich-go}"
VERIFY_DATE="${2:-$(date +%F)}"
OUT_DIR="docs/immich-go-verification/${VERIFY_DATE}"

if ! command -v "$BIN_PATH" >/dev/null 2>&1 && [ ! -x "$BIN_PATH" ]; then
  echo "error: immich-go binary not found: $BIN_PATH" >&2
  echo "usage: scripts/verify-immich-go-baseline.sh [immich-go-binary-path] [YYYY-MM-DD]" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

"$BIN_PATH" version > "$OUT_DIR/version.txt"
"$BIN_PATH" upload from-folder --help > "$OUT_DIR/upload-from-folder.help.txt"
"$BIN_PATH" upload from-google-photos --help > "$OUT_DIR/upload-from-google-photos.help.txt"

printf 'Wrote verification artifacts to %s\n' "$OUT_DIR"
printf '  - %s\n' "$OUT_DIR/version.txt"
printf '  - %s\n' "$OUT_DIR/upload-from-folder.help.txt"
printf '  - %s\n' "$OUT_DIR/upload-from-google-photos.help.txt"
