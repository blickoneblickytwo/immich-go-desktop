# Privacy and security review

Reviewed October 16, 2026. This describes the current client code and production build, rather than guaranteeing the behavior of every host, extension, dependency, or future version.

## Data flow

| Action | What happens |
| --- | --- |
| Load the app | The browser requests the page, bundled JavaScript, stylesheet, and branding images from the app host. The app has no analytics SDK or application backend collecting form details. Hosting infrastructure may record request metadata. |
| Enter connection details | Values are held in page memory. Blank key fields become placeholders in the generated command. Command preparation does not read photo files. |
| Continue | The app builds a command locally. If Remember is selected, it stores the destination address and any destination key in browser localStorage. Otherwise it attempts to remove that stored record. No connection test is run by Continue. |
| Test connection | The browser makes one GET request to the entered destination base URL plus `/api/server/about`, using the destination key in the `x-api-key` header. It does not test or send the source key. |
| Copy / download | The full generated command includes entered destination and source keys, even when the visual preview masks them. The clipboard or downloaded file receives those values. |
| Clear saved connection | The app removes its saved localStorage record and turns Remember off. Existing form values remain until reset/reload. It cannot erase prior clipboard entries, downloaded files, or terminal history. |
| Run the command | immich-go runs independently on the user's computer, reads files, and contacts the configured server(s). The web page neither executes the command nor receives its results. |
| Review a log | The user selects a local file or the built-in synthetic sample. The browser passes that file to a local worker, which streams and interprets it. The log contents are not sent to a server, written to browser storage, or logged to the console by this feature. The host serves the optional view code and worker. |
| Clear / cancel / leave log review | Active processing is terminated. Clearing removes the selected file reference and report from the view. Leaving unmounts the reader and discards its state while keeping the unfinished wizard in page memory. The original file is unchanged. The app cannot guarantee immediate erasure from browser memory, extensions, or the operating system. |

## Verified safeguards

- The connection test sets `redirect: error`, `credentials: omit`, `referrerPolicy: no-referrer`, and `cache: no-store`, with a ten-second abort timeout. Redirects are rejected rather than forwarding a test key to another URL. Browser preflight requests may also occur.
- Server URL validation accepts HTTP/HTTPS base URLs and rejects embedded user/password credentials, query strings, fragments, and control characters. HTTP remains available for existing local setups; it does not encrypt the key. Prefer HTTPS where available.
- A successful test means the destination returned an OK response containing an Immich-style version field. It is not a full import-permission check, server identity guarantee, or source-server check. Standard browser TLS validation applies for HTTPS.
- Remember is off by default. Storage writes explicitly select destination fields; source credentials and photo paths are not included. Malformed records are not restored. Unchecking Remember removes the record immediately when storage is available. Blocked reads/writes/removals are handled without treating a failed write/removal as successful.
- Saved keys are plain text, not encrypted by this app. localStorage is scoped to an origin, not a repository path: other scripts on that origin can access it. This matters for multiple projects served under the same GitHub Pages domain. Do not save keys on shared devices.
- Preview keys are replaced before shell formatting, so punctuation and spaces do not leave partial key fragments visible. This is visual masking, not encryption or removal from page memory.
- PowerShell exports use literal single-quoted strings. Unix shell strings escape apostrophes. CMD exports reject quotes, percent signs, and exclamation marks instead of trying to share unsafe interpolation rules between interactive and batch execution; use PowerShell for those values. Control characters and embedded line breaks are rejected. Photo paths starting with a hyphen are rejected so they cannot override command options; use a full path or `./` prefix. These controls do not make arbitrary unreviewed commands safe to execute.
- Runtime assets are bundled with the app; the card artwork is a CSS gradient. External help links use `noreferrer` and open third-party sites only when followed.
- Advanced controls are opt-in under Custom. Source-inapplicable settings are excluded from command generation and cleared on a source change. Concurrency, timeout, and time-zone values are validated; the existing shell escaping also applies to new string values. No arbitrary command/flag input or new persistence was added.
- Log processing is limited to 25 MiB and 50 detected runs, with bounded line lengths and retained evidence. It runs in a worker, supports cancellation, and displays source excerpts as escaped text. Invalid UTF-8 and binary/UTF-16 data are rejected. Source entries remain collapsed because logs can include keys, filenames, server details, and private paths; the excerpts are not guaranteed to be sanitised.

## Limits to the wording

The app does not promise “no network,” “no logs,” universal anonymity, or that nobody can access a key entered into a browser. The hosting provider, browser, extensions, clipboard history, saved files, shell history, process inspection, and the destination server have separate behavior and trust boundaries.

A dry run disables photo uploads in the targeted immich-go command; it is not an offline mode. Server requests and authentication still occur. Review import summaries and logs before treating an import as complete.

The permissions shown in Help are a baseline import set, not a proof of the minimum permissions for every source, flag combination, or server version. The optional browser test only exercises the server-info endpoint.

Log review reports recognised counters and messages. It does not contact the Immich library, scan your photo library, execute imports, or certify completion. A zero-error asset summary can coexist with errors in other operations. Unknown and unsupported records are not interpreted as successful outcomes. Patterns were checked against tagged v0.32.0 source; test/sample logs are synthetic. See [the log contract](docs/log-format-contract.md).

## Evidence and practical limits

- Regression tests cover request options, URL validation, timeout, unexpected responses, storage failure and field selection, redaction, shell quoting, command generation, Advanced applicability/validation, log interpretation, bounded streaming, cancellation, escaped source text, and wizard preservation.
- The locked dependency audit on October 15, 2026 reported zero known advisories. Dependencies were not changed for Advanced or log review. That audit is time-specific and is not proof that the code has no vulnerabilities.
- The production build is inspected separately from the development server, whose hot-reload traffic is development tooling.
- An actual photo import and execution on native Windows shells were not performed during this review. No claim of a penetration test or independent security certification is made.

References: [GitHub privacy](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement), [Fetch redirect behavior](https://developer.mozilla.org/en-US/docs/Web/API/Request/redirect), [browser localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), [PowerShell quoting](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules), [CMD parsing](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cmd), and the [targeted immich-go upload reference](https://github.com/simulot/immich-go/blob/v0.32.0/docs/commands/upload.md).
