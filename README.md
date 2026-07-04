# immich-go-desktop

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://blickoneblickytwo.github.io/immich-go-desktop/)
[![GitHub Stars](https://img.shields.io/github/stars/blickoneblickytwo/immich-go-desktop?style=flat)](https://github.com/blickoneblickytwo/immich-go-desktop/stargazers)
[![immich-go v0.32.0](https://img.shields.io/badge/immich--go-v0.32.0-blue)](https://github.com/simulot/immich-go)

![App Preview](screenshots/app-preview.png)

**A friendly, no-command-line-needed way to import your photos into Immich.**

[Launch the App](https://blickoneblickytwo.github.io/immich-go-desktop/) · [Report a Bug](https://github.com/blickoneblickytwo/immich-go-desktop/issues) · [Request a Feature](https://github.com/blickoneblickytwo/immich-go-desktop/issues)

---

## Who is this for?

If you've ever opened a terminal to run an immich-go command and immediately felt lost - this is for you.

I built this while migrating my own photo library. The tool that does the actual importing (immich-go) is great, but figuring out the right command to run is a real barrier if you're not a developer. One wrong flag or a typo in your server URL and things go sideways fast.

This app removes all of that. You click through a few steps, it builds the command for you, and you paste it into your terminal and run it. That's it.

---

## How it works

1. Open the [live app](https://blickoneblickytwo.github.io/immich-go-desktop/) - nothing to install
2. Pick what you're importing (a folder, a Google Takeout, an iCloud export, or another Immich server)
3. Enter your Immich server URL and API key (there's a test button so you can check it works)
4. Point it to your photos and choose how to handle them
5. Copy the generated command and paste it into your terminal

---

## What it does and doesn't do

This app **generates the command** for you. The actual importing is still done by immich-go running in your terminal - this just means you never have to write the command yourself.

It supports the main immich-go import sources:

- 📁 **A folder** on your computer
- 📦 **A Google Photos Takeout** (zip or extracted folder, with wildcard support)
- 🍎 **An Apple iCloud export**
- 🔁 **Another Immich server** — server-to-server migration

You'll need immich-go installed to run it. If you haven't installed it yet, follow the [immich-go installation guide](https://github.com/simulot/immich-go). This app is verified against **immich-go v0.32.0**.

---

## Your data stays private

Everything runs in your browser. There's no backend, no tracking, and no server that sees your credentials. The only external request this app ever makes is the optional connection test - which pings *your own* Immich server, not ours.

---

## Run it locally (optional)

You don't need to install anything to use the app - just open the link above. But if you want to run it offline:

```bash
git clone https://github.com/blickoneblickytwo/immich-go-desktop.git
cd immich-go-desktop
npm install
npm run dev
```

It's a frontend-only app built with Vite + React.

---

## Recent Updates

Curious about the latest improvements (like the new soft-card UI, iCloud support, and server-to-server migration)? Check out the [Changelog](CHANGELOG.md) for a full list of recent changes.

---

## Want to help?

This is an open source project and contributions are very welcome! A few areas where help would be especially appreciated:

- **Standalone desktop app** - wrapping this into a proper Mac/Windows/Linux app (Electron, Tauri, or similar) so users don't need to touch the terminal at all. If this sounds like something you could help with, please open an issue or reach out.
- **UI improvements and accessibility**
- **Support for more immich-go flags**
- **Testing across different setups**

Even if you just find a bug or have a feature idea, opening an issue is a huge help.

---

## License

MIT - use it however you want.
