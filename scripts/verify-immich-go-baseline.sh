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

# Capture help only: no server connection or import. Sanitize before writing;
# immich-go includes the current computer's hostname in its device UUID default.
python3 - "$BIN_PATH" "$OUT_DIR" <<'PY'
from pathlib import Path
import re
import subprocess
import sys

binary, output = sys.argv[1:]
captures = {"version.txt": ["version"]}
for source in ("from-folder", "from-google-photos", "from-icloud", "from-immich"):
    captures[f"upload-{source}.help.txt"] = ["upload", source, "--help"]

sanitized = {}
for name, args in captures.items():
    result = subprocess.run([binary, *args], capture_output=True, text=True)
    if result.returncode:
        raise SystemExit(f"Verification failed for {name}; no captures written.")
    text = re.sub(r'(--(?:from-)?device-uuid[^\n]*?) \(default "[^"\n]*"\)',
                  r'\1 (default "<local-device>")', result.stdout)
    for path in (str(Path.cwd()), str(Path.home())):
        text = text.replace(path, "<local-path>")
    sanitized[name] = text

folder = Path(output)
folder.mkdir(parents=True, exist_ok=True)
for name, text in sanitized.items():
    (folder / name).write_text(text)
print(f"Wrote {len(sanitized)} sanitized verification artifacts to {folder}")
PY
