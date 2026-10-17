# Go Desktop · immich-go-desktop

[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm%20Noncommercial-yellow.svg)](LICENSE)
[![Open app](https://img.shields.io/badge/Open-App-brightgreen)](https://blickoneblickytwo.github.io/immich-go-desktop/)
[![immich-go v0.32.0 checked](https://img.shields.io/badge/immich--go-v0.32.0%20checked-blue)](IMMICH_GO_BASELINE.md)

**Prepare a guided photo import in four simple steps.** Bring a photo folder, Google Photos Takeout, Apple iCloud export, or another Immich library into your own Immich server.

[Open the app](https://blickoneblickytwo.github.io/immich-go-desktop/) · [Report a problem or suggest a feature](https://github.com/blickoneblickytwo/immich-go-desktop/issues) · [What's new](CHANGELOG.md)

The app builds a script for you to run in a terminal. It sets up immich-go if needed, asks for your keys, and runs a test before asking whether to upload. **The web page does not upload your photos or run the script itself.** A standalone desktop package is not included. Experienced users can still copy a manual command.

> Screenshots show the revision in this repository. The hosted app may differ until that revision is deployed. All screenshots use example details; the log sample is synthetic.

## Before you start

Have these three things ready:

- **Your Immich server address**, such as `https://photos.example.com`.
- **Your photos or export**, accessible from the computer that will run the command. For a server-to-server move, have the source server address and its API key instead.
- **Terminal or PowerShell** on that computer, with network access to your Immich server. The guided script sets up immich-go v0.32.0 if needed; no separate immich-go installation is required on supported macOS/Linux/Windows ARM64 or x86-64 computers. Setup needs internet access to GitHub unless a compatible installed copy or verified cached archive is available.

A terminal is the command window on your computer: Terminal on macOS/Linux or PowerShell on Windows. The guided download asks for API keys with hidden input when it runs, so you can leave key fields blank in the web page. **Settings → Help** explains where to create a key and which permissions to review.

## Your first import, screen by screen

Start with **Test run**. It skips photo uploads but still contacts your server when you run it.

### 1. Choose where your photos are coming from

Open **choose source** and select a photo folder, Google Photos Takeout, Apple iCloud export, or another Immich server. Press the arrow to continue.

<img src="screenshots/design-revision/process/01-source.png" width="760" alt="Step 1: Choose the source of your photos, then continue with the arrow." />

### 2. Enter your Immich server address

Use your own server address. Leave the API key blank for the guided script, which asks for it later. You can enter a key here for the optional browser **Test connection** or a manual command. Leave **Remember on this device** off if you do not want destination details saved in this browser. Entered keys are not embedded in the guided download.

<img src="screenshots/design-revision/process/02-connect.png" width="760" alt="Step 2: Enter the destination server address and optional API key. The example key is blank and Remember is off." />

For **Another Immich server**, this step also asks for the source server details. The browser connection test checks only the destination.

### 3. Add your photo path and choose Test run

Enter the full path to the folder or export **on the computer where immich-go will run**. This is a path field, not a photo upload. On macOS, dragging a folder into Terminal can help you find its path. For Takeout, use the path to your export ZIP files or extracted folder.

Check the operating-system selector, keep **Test run** selected, then choose **Prepare import**. The options vary with your source; you can leave **Custom** alone for your first attempt. Server-to-server moves do not need a local photo path.

<img src="screenshots/design-revision/process/03-options.png" width="760" alt="Step 3: A sample photo path with Test run selected and the Prepare import button." />

### 4. Download your guided script and run it

Choose **Download guided script**, save it in Downloads on the computer with your photos, then open Terminal or PowerShell. Review the script before running it. Expand **How to run the download** for the command to paste:

<img src="screenshots/design-revision/process/04-guided.png" width="760" alt="Step 4: Download guided script, runtime instructions, and a separate collapsed manual command." />

macOS/Linux:

```bash
bash "$HOME/Downloads/go-desktop-import.sh"
```

Windows PowerShell:

```powershell
& "$HOME\Downloads\go-desktop-import.ps1"
```

Adjust the path if you saved the script elsewhere. Windows script policies may block the download; follow your device's policy or ask its administrator. The script does not change those policies. Supported platforms need their standard tools; see [requirements and behavior](docs/guided-import.md).

The script checks the photo path, uses a compatible installed immich-go or downloads and checksum-verifies its own copy, then asks for your destination key (and source key for migration). It checks each server's version response and runs a test. HTTP addresses need explicit acknowledgement before sending a key.

**After the test:** review the output and warnings. Type **UPLOAD** only when ready to upload using these settings, or press Enter to stop after the test. A failed, incomplete, empty, or problematic test stops before this prompt. Every invocation tests first, including a download generated from a live preset. The script prints reported counts and the exact saved log folder; check your library and keep your original photos/export files while reviewing results.

<details>
<summary>Already have immich-go installed? Use a manual command</summary>

Open **Manual command**, then **Copy command**. Replace `YOUR_API_KEY` and, where applicable, `YOUR_SOURCE_API_KEY` if you left them blank. The copied command contains any entered keys and runs its selected mode directly; it does not include guided setup, key prompts, or a test-to-upload confirmation. Keep it private. See the [official installation guide](https://github.com/simulot/immich-go/blob/v0.32.0/docs/installation.md) if using this route.

</details>

## Optional: more control with Advanced

In step 3, choose **Custom**, then open **Advanced**. It starts collapsed and adds no required step.

- Choose a destination album for folder imports, or filter a Takeout import to one named source album.
- Group burst or matching HEIC/JPEG photos into stacks for folder and Takeout imports. The exposed stacking choices keep both versions.
- Set a time-zone override, add a session tag, or adjust concurrency and request timeout.

**Slow** uses 2 concurrent tasks, **Fast** uses 8, and **Balanced** lets immich-go choose. An explicit **Concurrent tasks** value overrides the speed setting. Advanced overrides apply only while Custom is selected; **Reset Advanced** clears them. This is a selected set of CLI options, not every option immich-go supports.

For server-to-server moves, the timeout controls destination requests. The source server has a separate timeout that this UI does not expose.

<details>
<summary>See the Advanced screen</summary>

<img src="screenshots/design-revision/new-features/advanced-desktop.png" width="760" alt="Expanded Advanced controls for a Takeout import, including album filtering, stacking, time zone, session tagging, concurrency, and timeout." />

</details>

## Optional: understand an import log

After running immich-go, open **After you run it → Review an import log**, or **Settings → Help → Reading import results → Review an import log**. Choose an existing UTF-8 text or JSON-lines log, up to 25 MiB. **Try a sample log** lets you explore using clearly labelled example data.

The reader shows reported uploads, skipped/discarded assets, asset errors, and pending assets, plus grouped warnings and errors. Missing counts stay **Unknown**. It flags partial logs and conflicting summaries, and keeps appended runs separate. **These are reported counts, not a check that your Immich library is complete.**

<details>
<summary>See log selection and a sample report</summary>

<img src="screenshots/design-revision/new-features/log-review-start.png" width="760" alt="Log review starting screen with Choose log file and Try a sample log." />

<img src="screenshots/design-revision/new-features/log-review-report.png" width="760" alt="Synthetic sample report showing counts and a warning about an error outside the zero-error asset summary." />

</details>

Log contents are processed in browser memory and are not uploaded or saved by the app. Logs can contain credentials and private paths; source excerpts start collapsed. **Clear log**, return to the wizard, or reload to discard the report from the view. The original file is unchanged. Returning to the wizard keeps your unfinished form in page memory; a reload does not preserve that form.

Recognition is based on immich-go v0.32.0. Other formats may be only partially understood. See the [log format contract](docs/log-format-contract.md).

## Settings and privacy

**Settings** is below the main card. **Privacy** explains data handling and lets you clear a saved connection. **Help** covers API keys and import results. **About** includes version and licensing information.

<details>
<summary>See Settings</summary>

<img src="screenshots/design-revision/settings-after.png" width="760" alt="Settings with Privacy, Help, and About tabs, key-handling explanations, and saved-connection status." />

</details>

- **Connection testing sends your destination key to the address you enter.** Use HTTPS. The test blocks redirects and does not verify all import permissions; an unreachable browser test does not necessarily mean immich-go cannot reach your server.
- **Remember is optional and unencrypted.** Continue or a successful test saves the destination address and any destination key as plain text in this site's browser storage when Remember is on. Scripts on the same origin can read it. Source-server details and photo paths are not saved.
- **Copied manual commands contain entered keys.** The guided script leaves them out and asks with hidden input when it runs. Runtime keys are still passed to immich-go and can be exposed through process information or CLI logs. Scripts also contain your chosen addresses and paths; keep scripts and logs private.
- **The host serves the web page and may log request metadata.** This version has no analytics or application backend receiving form details. External help links open third-party sites. The browser does not scan your photo library or upload photos; the optional reader reads only the file you choose. A downloaded script runs separately, checks paths, contacts GitHub when setup is needed, and uses immich-go to contact your servers and read/import photos.

See [PRIVACY.md](PRIVACY.md) for the complete data flow and limits, including clearing saved details, browser extensions, and log processing. You can also [run the app locally](#run-it-locally-optional).

## Compatibility

The latest official immich-go release was **v0.32.0** when checked on **October 17, 2026**. All exposed Advanced flags were checked against the checksum-verified official macOS ARM64 binary and tagged source. The four source commands' sanitized help captures and 18 help-only flag-parsing checks are recorded in [the verification baseline](IMMICH_GO_BASELINE.md).

Those checks confirm flag registration and parsing; **a real photo import and native Windows execution have not been tested**. The optional connection-test endpoint was separately checked against the Immich v3.3.0 API specification on October 8, 2026. That is an API-specification check, not a full integration guarantee.

## Run it locally (optional)

Use **Node.js 24 LTS** and npm. To work on this repository:

```bash
git clone https://github.com/blickoneblickytwo/immich-go-desktop.git
cd immich-go-desktop
npm ci
npm run dev
```

Open `http://127.0.0.1:8080/`. The server listens on this computer only by default. Cloning uses the repository's default branch; select the revision you want before installing dependencies if you are reviewing an unreleased change.

Local operation avoids loading the app from GitHub Pages. Installing dependencies needs internet access; connection tests and terminal imports still contact your chosen server.

This is a Vite + React frontend. Its Tailwind CSS 4 build targets Safari 16.4+, Chrome 111+, and Firefox 128+. For development checks:

```bash
npm test
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

## Common questions

**Do I still need immich-go?**

The import still uses immich-go, but the guided script sets up the pinned version if needed. Manual commands require your own compatible installation.

**Where should I put my photos?**

Somewhere accessible to the computer running immich-go. The path you type must make sense on that computer, even if you opened this page on a different device. For Google Takeout, see the [upstream Takeout guide](https://github.com/simulot/immich-go/blob/v0.32.0/docs/commands/upload.md#from-google-photos).

**Which API key permissions do I need?**

Review **Settings → Help** and the [upstream permission discussion](https://github.com/simulot/immich-go/discussions/1032) for your version and selected options. Generated commands set `--pause-immich-jobs=false`. The browser connection test checks only server information, not the full import permission set. Avoid sharing API keys in issues or screenshots.

**What if the browser connection test fails?**

Double-check the address, HTTPS setup, key, and browser access. You can continue without the browser test. The guided script separately checks both configured servers from the import computer before its test run. Neither server-info check verifies every import permission.

**What does “assets did not reach a final state” mean?**

The run needs review. Check the final summary, log, and Immich library before calling it complete. Log review can help you find issues, but does not prove success or failure on its own.

## Contributing

[Open an issue](https://github.com/blickoneblickytwo/immich-go-desktop/issues) for bugs, feature ideas, accessibility feedback, or testing results. Useful reports include your source type, OS/shell, and immich-go version. Remove keys, private addresses, and personal paths from anything you share.

Before contributing code, open an issue to agree on contribution licensing, including any permission needed for separate commercial licensing. Standalone desktop packaging and testing across more setups are welcome areas for contributions. See the [changelog](CHANGELOG.md) for recent work.

## License

This revision uses the [PolyForm Noncommercial License 1.0.0](LICENSE). Personal and other permitted noncommercial uses are free under those terms. The license also expressly permits uses by the noncommercial organizations it lists.

**Commercial use outside those permitted purposes requires a separate written commercial license before use.** This includes commercial applications, paid hosting or migration services, and internal business use that is outside the license's permitted purposes. [Contact blickoneblickytwo on GitHub](https://github.com/blickoneblickytwo/immich-go-desktop/issues/new?template=commercial-license.yml) to discuss permission. Opening an issue does not itself grant permission.

This is **source-available**, rather than OSI-approved open source. See [commercial licensing and license history](COMMERCIAL-LICENSE.md) for details. Existing MIT grants remain valid; the [previous MIT notice](LICENSES/MIT-legacy.txt) is retained for previously MIT-licensed material. Third-party components, including immich-go, retain their own licenses.
