#!/usr/bin/env bash
# Go Desktop guided import. Review this file before running it.
# Downloads only official immich-go v0.32.0 when a compatible copy is absent.
# No API keys are embedded. Keys are requested at runtime and passed to the CLI.
set -o pipefail
umask 077
# @CONFIG@
work=''
fail() { printf '\n%s\n' "$1" >&2; exit 1; }
cleanup() { [ -z "$work" ] || rm -rf -- "$work"; }
trap cleanup EXIT
trap 'printf "\nStopped. An interrupted import may be partial; review its log.\n" >&2; exit 130' INT TERM
confirm() {
  local answer
  printf '%s ' "$1"
  IFS= read -r answer || return 1
  [ "$answer" = "$2" ]
}
printf '\nGo Desktop - guided import\nAlways tests first. Uploading requires typing UPLOAD.\n'

# Expand only filesystem wildcards, never evaluate shell code from a path.
paths=()
if [ "$source" != immich ]; then
  attempts=0
  while :; do
    paths=()
    if [[ "$photo_path" == '~/'* ]]; then photo_path="$HOME/${photo_path:2}"; fi
    if [[ "$photo_path" != -* && "$photo_path" != *[[:cntrl:]]* ]]; then
      if [ -e "$photo_path" ]; then paths=("$photo_path")
      elif [ "$source" = takeout ]; then
        shopt -s nullglob
        saved_ifs=$IFS; IFS=''; paths=( $photo_path ); IFS=$saved_ifs
        shopt -u nullglob
      fi
    fi
    readable=true
    [ "${#paths[@]}" -gt 0 ] || readable=false
    for item in "${paths[@]}"; do
      if [ ! -r "$item" ] || { [ ! -f "$item" ] && [ ! -d "$item" ]; } || [[ "$item" == -* || "$item" == *[[:cntrl:]]* ]]; then readable=false; fi
      if [ -d "$item" ] && [ ! -x "$item" ]; then readable=false; fi
      if [[ "$item" == *.[zZ][iI][pP] ]] && command -v unzip >/dev/null 2>&1; then
        unzip -Z -1 "$item" >/dev/null 2>&1 || readable=false
      fi
    done
    [ "$readable" = true ] && break
    attempts=$((attempts+1))
    [ "$attempts" -lt 4 ] || fail 'The photo path is still missing, inaccessible, or an unreadable ZIP. Correct it in the app and download again.'
    printf 'Photo path not found, inaccessible, or unreadable. Paste a corrected path (Enter stops): '
    IFS= read -r photo_path || exit 1
    [ -n "$photo_path" ] || exit 0
  done
  printf 'Photo path checked. Individual files will be checked by the test run.\n'
fi

for tool in curl mktemp awk tee; do command -v "$tool" >/dev/null 2>&1 || fail "Required tool missing: $tool. Install it using your operating system's package manager."; done
work=$(mktemp -d "${TMPDIR:-/tmp}/go-desktop.XXXXXX") || fail 'Cannot create a private working folder.'
binary=''
candidate=$(command -v immich-go || true)
if [ -n "$candidate" ]; then
  version=$("$candidate" version 2>/dev/null || true)
  case "$version" in 'immich-go version:0.32.0,'*) binary=$candidate;; esac
fi
if [ -z "$binary" ]; then
  platform=$(uname -s); arch=$(uname -m)
  case "$arch" in arm64|aarch64) arch=arm64;; x86_64|amd64) arch=x86_64;; *) fail 'Automatic setup supports ARM64 and x86-64. Use the manual installation guide for this computer.';; esac
  case "${platform}_${arch}" in
    Darwin_arm64) expected='@Darwin_arm64@';;
    Darwin_x86_64) expected='@Darwin_x86_64@';;
    Linux_arm64) expected='@Linux_arm64@';;
    Linux_x86_64) expected='@Linux_x86_64@';;
    *) fail 'This script supports macOS and Linux. Download the PowerShell script for Windows.';;
  esac
  command -v tar >/dev/null 2>&1 || fail 'tar is required to unpack immich-go.'
  if command -v shasum >/dev/null 2>&1; then hash_tool=shasum
  elif command -v sha256sum >/dev/null 2>&1; then hash_tool=sha256sum
  else fail 'SHA-256 verification is unavailable. Install shasum or sha256sum before trying again.'; fi
  hash_file() { if [ "$hash_tool" = shasum ]; then shasum -a 256 "$1"; else sha256sum "$1"; fi | awk '{print $1}'; }
  cache="${XDG_CACHE_HOME:-$HOME/.cache}/go-desktop/immich-go/v0.32.0"
  mkdir -p "$cache" || fail 'Cannot create the immich-go cache folder.'
  archive="$cache/immich-go_${platform}_${arch}.tar.gz"
  if [ ! -f "$archive" ]; then
    printf 'Downloading official immich-go v0.32.0 (no system installation changes)...\n'
    curl -q --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --connect-timeout 15 --max-time 300 \
      "https://github.com/simulot/immich-go/releases/download/v0.32.0/immich-go_${platform}_${arch}.tar.gz" -o "$work/download.tar.gz" || fail 'Download failed. Check internet access to GitHub and try again.'
    [ "$(hash_file "$work/download.tar.gz")" = "$expected" ] || fail 'Download checksum did not match. Nothing was installed or run. Try downloading a fresh script from the project.'
    mv "$work/download.tar.gz" "$archive" || fail 'Cannot save the verified download.'
  fi
  [ "$(hash_file "$archive")" = "$expected" ] || fail "Cached download checksum did not match. Nothing was run. Remove this archive and retry: $archive"
  tar -xzf "$archive" -C "$work" immich-go || fail 'Cannot unpack the verified immich-go download.'
  binary="$work/immich-go"
  chmod 700 "$binary" || fail 'Cannot prepare immich-go.'
  version=$("$binary" version 2>/dev/null || true)
  case "$version" in 'immich-go version:0.32.0,'*) :;; *) fail 'Downloaded binary did not report the expected version.';; esac
fi
printf 'Using immich-go v0.32.0.\n'

# No redirect following for authenticated server requests. Keys stay out of curl argv.
check_server() {
  local server=$1 label=$2 key='' status attempt=0
  if [[ "$server" == http://* ]]; then
    confirm "$label uses HTTP, which sends the key without encryption. Type HTTP to continue:" HTTP || fail 'Stopped before sending the key. Use an HTTPS address in the app if available.'
  fi
  while [ "$attempt" -lt 3 ]; do
    attempt=$((attempt+1))
    printf '%s API key (input hidden): ' "$label"
    IFS= read -r -s key || fail 'No key was entered. Run the script in an interactive terminal.'
    printf '\n'
    if [[ -z "$key" || "$key" == *[[:space:][:cntrl:]]* ]]; then printf 'Paste a key with no spaces or line breaks.\n'; continue; fi
    printf 'x-api-key: %s\n' "$key" > "$work/header" || fail 'Cannot create the temporary request header.'
    status=$(curl -q --silent --show-error --proto '=https,http' --connect-timeout 10 --max-time 15 \
      --header "@$work/header" --output "$work/about.json" --write-out '%{http_code}' "${server%/}/api/server/about" 2>/dev/null) || fail "$label could not be reached. Check the address, network, and HTTPS certificate, then regenerate the script if needed."
    case "$status" in
      200) grep -Eq '"version"[[:space:]]*:[[:space:]]*"[^"\r\n]+"' "$work/about.json" || fail "$label did not return Immich version information. Check the base address."; checked_key=$key; return;;
      401|403) printf '%s rejected the key or server.about permission. Check the key and try again.\n' "$label";;
      3??) fail "$label redirected the request. No redirected request was sent. Enter its final base address in the app.";;
      *) fail "$label returned HTTP $status. Check server availability and the base address.";;
    esac
  done
  fail "$label access could not be confirmed. Review the API key and permissions."
}
check_server "$destination" Destination
destination_key=$checked_key
source_key=''
if [ "$source" = immich ]; then check_server "$source_server" Source; source_key=$checked_key; fi
rm -f "$work/header" "$work/about.json"
printf 'Server information checks passed. Import permissions are checked by immich-go as operations run.\n'

log_root="${XDG_STATE_HOME:-$HOME/.local/state}/go-desktop/imports"
mkdir -p "$log_root" || fail 'Cannot create the import log folder.'
run_dir=$(mktemp -d "$log_root/run-$(date +%Y%m%d-%H%M%S).XXXXXX") || fail 'Cannot create a private import log folder.'
printf 'Logs use owner-only permissions but can contain keys, filenames, and server details.\nLog folder: %s\n' "$run_dir"
command_args=("upload")
case "$source" in folder) command_args+=(from-folder);; takeout) command_args+=(from-google-photos);; icloud) command_args+=(from-icloud);; immich) command_args+=(from-immich "--from-server=$source_server" "--from-api-key=$source_key");; esac
printf '{}\n' > "$work/config.yaml" || fail 'Cannot prepare the isolated CLI configuration.'
command_args+=("--server=$destination" "--api-key=$destination_key" "${import_flags[@]}" "--config=$work/config.yaml" --no-ui --log-type=text)

show_summary() {
  awk '
    / (ERR|ERROR) / {messages++} / (WRN|WARN) / {warnings++}
    { msg=$0; sub(/^.* (INF|INFO) /,"",msg) }
    msg=="Asset Tracking Report:" {found=1; section=1; errors=""; pending=""; processed=""; discarded=""; total=""; uploaded=""; closed=0; eventerrors=0}
    msg=="Event Report:" {section=2}
    section==1 && msg ~ /^Total Assets: [0-9]+$/ {total=msg; sub(/^.*: /,"",total)}
    section==1 && msg ~ /^Processed: [0-9]+$/ {processed=msg; sub(/^.*: /,"",processed)}
    section==1 && msg ~ /^Errors: [0-9]+$/ {errors=msg; sub(/^.*: /,"",errors)}
    section==1 && msg ~ /^Pending: [0-9]+$/ {pending=msg; sub(/^.*: /,"",pending)}
    section==1 && msg ~ /^Discarded: [0-9]+$/ {discarded=msg; sub(/^.*: /,"",discarded)}
    section==2 && msg ~ /^uploaded successfully: [0-9]+$/ {uploaded=msg; sub(/^.*: /,"",uploaded)}
    section==2 && msg ~ /^(upload failed|server error|file access error|incomplete processing): [0-9]+$/ {count=msg; sub(/^.*: /,"",count); eventerrors+=count}
    msg ~ /^Check the log file:/ {closed=1}
    END {
      printf "Reported uploads: %s | Skipped/discarded: %s | Asset errors: %s | Pending: %s\n", (uploaded==""?"Unknown":uploaded), (discarded==""?"Unknown":discarded), (errors==""?"Unknown":errors), (pending==""?"Unknown":pending)
      printf "Error messages: %d | Warnings: %d\n",messages,warnings
      print "Reported counts do not verify that your Immich library is complete."
      if (!found || !closed || total=="" || total+0==0 || processed=="" || discarded=="" || errors=="" || pending=="" || processed+discarded+errors+pending!=total || errors+0>0 || pending+0>0 || messages>0 || eventerrors>0) exit 2
    }' "$1"
}
run_import() {
  local stage=$1 dry=$2 log="$run_dir/$1.log" code summary_code
  printf '\n%s starting. Do not close this terminal; Ctrl+C stops the process.\n' "$stage"
  "$binary" "${command_args[@]}" "--dry-run=$dry" "--log-file=$log" -- "${paths[@]}" 2>&1 | tee "$run_dir/$stage-console.txt"
  code=${PIPESTATUS[0]}
  printf '\n%s log: %s\n' "$stage" "$log"
  summary_code=2
  if [ -r "$log" ]; then show_summary "$log"; summary_code=$?; else printf 'No readable log summary was produced. Review the terminal output.\n'; fi
  [ "$code" -eq 0 ] || { printf 'immich-go stopped with exit code %s. The result may be partial.\n' "$code"; return 1; }
  [ "$summary_code" -eq 0 ] || { printf 'The summary is missing, incomplete, or reports issues. Review the log before another attempt.\n'; return 2; }
}
run_import test true || fail 'Stopped after the test. No live upload was started. Review the log, correct the issue, and run the script again.'
printf '\nTest finished. Its counts do not mean photos were uploaded. Review warnings above.\n'
if ! confirm 'Upload using these settings now? Type UPLOAD to start; Enter stops:' UPLOAD; then
  printf 'Finished the test only. No live upload was started. Logs: %s\n' "$run_dir"; exit 0
fi
run_import upload false || fail 'Upload needs review. Some photos may have uploaded. Check the saved log and your Immich library before retrying.'
printf '\nUpload process finished without detected summary errors. Check your Immich library and review warnings.\nLogs: %s\nUse Settings > Help > Reading import results in Go Desktop to review the .log file.\n' "$run_dir"
