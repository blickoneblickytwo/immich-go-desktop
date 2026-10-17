# Guided import download

The browser downloads a local script; it does not run an import or install software itself. This feature keeps the four-step wizard and adds no required screen. Manual commands remain available separately and retain their original behavior.

## Runtime flow

1. Check the photo path on the computer running the script. Existing files/folders are checked for access; Takeout wildcard matches are passed as individual paths. When available, Unix unzip checks ZIP directory readability; PowerShell opens the ZIP directory. This does not verify every file or do a full ZIP CRC scan. A bad path can be corrected at the prompt.
2. Use an installed immich-go reporting exactly v0.32.0. Otherwise, detect ARM64/x86-64, download the matching official v0.32.0 archive, verify its pinned SHA-256, cache it, and unpack a fresh binary into a temporary working directory. Cached archives are reverified on each use. Mismatches stop execution. No system binary/PATH is replaced.
3. Ask for destination and, for migration, source keys using hidden console input. Keys entered in the web form are deliberately omitted from the script. Server addresses and paths are still present, so the script can contain private information.
4. Request each server's `/api/server/about` endpoint without following redirects. A rejected key can be retried; network/certificate/address failures stop with guidance. HTTP requires typing HTTP before a key is sent. Success only establishes an Immich-style version response, not all import permissions.
5. Run an explicit test using the selected import settings and an isolated empty CLI configuration. Save a fresh log and report explicit counters; omitted values remain Unknown. Processed is never labelled uploaded.
6. Stop if the CLI exits nonzero or the log has a missing, empty, incomplete, inconsistent, or unclosed asset summary, pending/error assets, error messages, or recognised error events. This conservative check can require manual investigation even if the underlying operation was harmless. Warnings are displayed for review.
7. Offer a live import only after that test. Only exact, case-sensitive UPLOAD starts it. Empty input, EOF, yes, or a lower-case answer does not. Even downloads generated from a live preset always test and ask first. The existing manual command is not changed by this gate.
8. Print reported counts and the log location. Nonzero or problematic live results are described as potentially partial, never as a certified complete library. Review the original files, log, and Immich library before retrying.

## Requirements and launching

- macOS/Linux: Bash (including macOS Bash 3.2), curl, tar, awk, tee, mktemp, and shasum or sha256sum for automatic setup. Optional unzip improves ZIP preflight. Unsupported CPUs/OSes get manual-install guidance.
- Windows: PowerShell 5.1 or later, x86-64 or ARM64. A device's execution policy may prevent launching downloaded scripts. The generated script does not modify or bypass that policy; follow the device's policy or ask its administrator. Native Windows validation remains outstanding.
- Save the download in Downloads on the import computer. In macOS/Linux Terminal: `bash "$HOME/Downloads/go-desktop-import.sh"`. In PowerShell: `& "$HOME\Downloads\go-desktop-import.ps1"`. Adjust the path if saved elsewhere. Review the script before launching it.
- Internet access to GitHub is needed only if setup cannot reuse a compatible installed CLI or verified cached archive. Network access to the chosen Immich server(s) is required for checks and imports.

## Files and privacy

| Platform | Cached archives | Run logs |
| --- | --- | --- |
| macOS/Linux | `${XDG_CACHE_HOME:-$HOME/.cache}/go-desktop/immich-go/v0.32.0` | `${XDG_STATE_HOME:-$HOME/.local/state}/go-desktop/imports/run-*` |
| Windows | `%LOCALAPPDATA%\Go Desktop\immich-go\v0.32.0` | `%LOCALAPPDATA%\Go Desktop\imports\run-*` |

Each stage has its own `.log` file. Bash also saves console output. Open the `.log` through Settings → Help → Reading import results. Runs are not automatically uploaded to the browser.

The script does not persist prompted keys as configuration, but passes them as CLI arguments. Process inspection and upstream CLI logging can expose them. Logs contain private paths and server details and are not guaranteed to remove keys. Bash creates files with owner-only permissions; Windows inherits the user's profile ACLs. No encrypted storage guarantee is made.

Normal exit and handled interruption clean the temporary working folder (including the Bash preflight header); a force kill or crash may leave it behind. Cached archives and logs remain for reuse/review. Remove only the named Go Desktop cache/log folders when no import is running if you no longer need them. Keep source photos/export files while reviewing results.

## Verification

Release digests come from the official v0.32.0 release metadata and checksums.txt, recorded in `src/lib/guided-script.ts`. No floating latest-version download is used. The test suite uses synthetic CLI/network fixtures, not a real photo library. It exercises fail-closed setup and test gates, all four sources, exact consent, cache reuse, and quoted values. A checksum-verified portable PowerShell runtime is used locally for parser and simulated execution checks; that does not establish native Windows or live-import compatibility.
