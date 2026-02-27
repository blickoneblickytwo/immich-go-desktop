

# Immich-Go Desktop — Command Builder Wizard

A browser-based wizard that generates `immich-go upload from-folder` commands, styled as a native macOS desktop window.

## Page 1: macOS Window Shell
- Centered rounded container with drop shadow and inset white border
- Traffic-light dots (red/yellow/green) in the title bar with centered "Immich-Go Desktop" title
- Apple system font stack (SF Pro Text, -apple-system, BlinkMacSystemFont)
- Pill-shaped step indicators (1 → 2 → 3) showing active/completed states

## Page 2: Step 1 — Connection Setup
- Text inputs for Immich Server URL and API Key
- Optional Admin API Key input with explanation tooltip
- "Test Connection" button that pings the server's `/api/server-info` endpoint
- Success/error feedback with toast notifications
- Apple-blue focus rings on all inputs

## Page 3: Step 2 — Folder & Options
- Auto-detect OS (macOS/Windows/Linux) for path placeholders and shell formatting
- Three preset buttons: "Safe first run", "Google Takeout", "NAS upload cleanup" — each pre-fills relevant flags
- Native directory picker button + editable text input for the folder path, with a warning badge about browser path limitations
- Toggle switches/checkboxes for common flags (dry-run, create-albums, ignore-errors, pause-immich-jobs, etc.)
- Grouped options in collapsible sections

## Page 4: Step 3 — Review & Output
- Human-readable summary card listing all selected options
- Dark rounded "Terminal" container (SF Mono font) showing the generated command with proper escaping and line breaks for the detected OS
- "Copy to Clipboard" button (primary blue) and "Reset" button (muted gray)
- Success toast on copy

## Design Details
- All styling follows macOS conventions: subtle grays, rounded corners, system blue accents
- Responsive but optimized for desktop viewing
- No backend — all logic is client-side, credentials stay local
- The reference screenshot's card/subscription UI style informs the clean, card-based layout approach

