# immich-go-desktop

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://blickoneblickytwo.github.io/immich-go-desktop/)

<img width="2016" height="2112" alt="Image_7b47zo7b47zo7b47" src="https://github.com/user-attachments/assets/382b43cd-6a2b-472e-8438-2727a9e3a5fe" />

A simple web interface that builds [immich-go](https://github.com/simulot/immich-go) commands for you. No more memorizing terminal flags or fixing typos in long command strings.

**[Launch the Web App](https://blickoneblickytwo.github.io/immich-go-desktop/)** · [Report Bug](https://github.com/blickoneblickytwo/immich-go-desktop/issues) · [Request Feature](https://github.com/blickoneblickytwo/immich-go-desktop/issues)

---

## Why This Exists

immich-go is fantastic for migrating your photo library, but let's be honest—typing out server URLs, API keys, and file paths in the terminal gets old fast. One typo and your upload stops, or things import in weird ways.

This tool gives you a visual wizard instead. Click through a few steps, copy the command, paste it in your terminal. Done.

## Features

- **Step-by-Step Wizard:** Walk through Connection, Folder, and Options in a clean interface
- **Real-Time Preview:** Watch your command build as you toggle settings
- **Smart Validation:** Test your server connection before you run anything
- **Works Everywhere:** Examples for macOS, Linux, and Windows file paths
- **100% Private:** Everything runs in your browser—your API keys never leave your machine

## How to Use

1. **Open the [Live Demo](https://blickoneblickytwo.github.io/immich-go-desktop/)**
2. **Connect:** Enter your Immich server URL and API key (test button included)
3. **Target:** Point to your photo folder with clear format examples
4. **Fine-Tune:** Toggle options like dry run, skip duplicates, RAW+JPEG stacking
5. **Copy & Run:** Grab the generated command and paste it into your terminal

## Requirements

You'll need `immich-go` installed to actually run the commands this tool generates:

```bash
go install github.com/simulot/immich-go@latest
```

If you don't have Go installed, check out the [immich-go installation guide](https://github.com/simulot/immich-go).

## Privacy

This runs entirely in your browser. No backend, no tracking, no external requests except the optional test ping to *your* Immich server. Your credentials stay on your machine.

Built with vanilla HTML, CSS, and JavaScript—no dependencies, no build step, no nonsense.

## Local Usage

Want to run it offline? Clone this repo and open `index.html` in any modern browser:

```bash
git clone https://github.com/blickoneblickytwo/immich-go-desktop.git
cd immich-go-desktop
open index.html  # macOS
# or just double-click the file
```

## License

MIT License—use it however you want.

---

**Questions or issues?** Open an issue or check out the [immich-go documentation](https://github.com/simulot/immich-go) for command details.
