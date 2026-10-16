# Privacy and security review

Reviewed October 15, 2026. This describes the current client code and production build, rather than guaranteeing the behavior of every host, extension, dependency, or future version.

## Data flow

| Action | What happens |
| --- | --- |
| Load the app | The browser requests the page, bundled JavaScript, stylesheet, and branding images from the app host. The app has no analytics SDK or application backend collecting form details. Hosting infrastructure may record request metadata. |
| Enter connection details | Values are held in page memory. Blank key fields become placeholders in the generated command. The page does not read photo files. |
| Continue | The app builds a command locally. If Remember is selected, it stores the destination address and any destination key in browser localStorage. Otherwise it attempts to remove that stored record. No connection test is run by Continue. |
| Test connection | The browser makes one GET request to the entered destination base URL plus `/api/server/about`, using the destination key in the `x-api-key` header. It does not test or send the source key. |
| Copy / download | The full generated command includes entered destination and source keys, even when the visual preview masks them. The clipboard or downloaded file receives those values. |
| Clear saved connection | The app removes its saved localStorage record and turns Remember off. Existing form values remain until reset/reload. It cannot erase prior clipboard entries, downloaded files, or terminal history. |
| Run the command | immich-go runs independently on the user's computer, reads files, and contacts the configured server(s). The web page neither executes the command nor receives its results. |

## Verified safeguards

- The connection test sets `redirect: error`, `credentials: omit`, `referrerPolicy: no-referrer`, and `cache: no-store`, with a ten-second abort timeout. Redirects are rejected rather than forwarding a test key to another URL. Browser preflight requests may also occur.
- Server URL validation accepts HTTP/HTTPS base URLs and rejects embedded user/password credentials, query strings, fragments, and control characters. HTTP remains available for existing local setups; it does not encrypt the key. Prefer HTTPS where available.
- A successful test means the destination returned an OK response containing an Immich-style version field. It is not a full import-permission check, server identity guarantee, or source-server check. Standard browser TLS validation applies for HTTPS.
- Remember is off by default. Storage writes explicitly select destination fields; source credentials and photo paths are not included. Malformed records are not restored. Unchecking Remember removes the record immediately when storage is available. Blocked reads/writes/removals are handled without treating a failed write/removal as successful.
- Saved keys are plain text, not encrypted by this app. localStorage is scoped to an origin, not a repository path: other scripts on that origin can access it. This matters for multiple projects served under the same GitHub Pages domain. Do not save keys on shared devices.
- Preview keys are replaced before shell formatting, so punctuation and spaces do not leave partial key fragments visible. This is visual masking, not encryption or removal from page memory.
- PowerShell exports use literal single-quoted strings. Unix shell strings escape apostrophes. CMD exports reject quotes, percent signs, and exclamation marks instead of trying to share unsafe interpolation rules between interactive and batch execution; use PowerShell for those values. Control characters and embedded line breaks are rejected. Photo paths starting with a hyphen are rejected so they cannot override command options; use a full path or `./` prefix. These controls do not make arbitrary unreviewed commands safe to execute.
- Runtime assets are bundled with the app; the card artwork is a CSS gradient. External help links use `noreferrer` and open third-party sites only when followed.

## Limits to the wording

The app does not promise “no network,” “no logs,” universal anonymity, or that nobody can access a key entered into a browser. The hosting provider, browser, extensions, clipboard history, saved files, shell history, process inspection, and the destination server have separate behavior and trust boundaries.

A dry run disables photo uploads in the targeted immich-go command; it is not an offline mode. Server requests and authentication still occur. Review import summaries and logs before treating an import as complete.

The permissions shown in Help are a baseline import set, not a proof of the minimum permissions for every source, flag combination, or server version. The optional browser test only exercises the server-info endpoint.

## Evidence and practical limits

- Regression tests cover request options, URL validation, timeout, unexpected responses, storage failure and field selection, redaction, shell quoting, and command generation.
- The locked dependency audit on the review date reported zero known advisories. That result is time-specific and is not proof that the code has no vulnerabilities.
- The production build is inspected separately from the development server, whose hot-reload traffic is development tooling.
- An actual photo import and execution on native Windows shells were not performed during this review. No claim of a penetration test or independent security certification is made.

References: [GitHub privacy](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement), [Fetch redirect behavior](https://developer.mozilla.org/en-US/docs/Web/API/Request/redirect), [browser localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), [PowerShell quoting](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules), [CMD parsing](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cmd), and the [targeted immich-go upload reference](https://github.com/simulot/immich-go/blob/v0.32.0/docs/commands/upload.md).
