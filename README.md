# Crystalium

Crystalium is an early Chromium-based desktop browser prototype with a minimal dark interface, multi-tab navigation, bookmarks, history, and a local music player.

## Features in this prototype

- Chromium-powered web content through Electron `WebContentsView`
- Multiple tabs, address/search bar, back/forward/reload, and Ctrl+L / Ctrl+T / Ctrl+W shortcuts
- Quick-access websites
- Session-only bookmarks and recent history
- Built-in local audio player for files selected on your device
- Context isolation, sandboxed renderers, and Node integration disabled for web content
- Windows NSIS installer packaging

## Run locally

Requires Node.js 20+ and npm.

```bash
npm install
npm start
```

## Build the Windows installer

```bash
npm run dist:win
```

The installer is written to `release/Crystalium-Setup-0.2.0.exe`.

GitHub Actions builds a Windows installer on pushes to `main`. Download it from the repository's Actions workflow run under Artifacts. Tag a release as `v0.2.0` (or another version tag) to publish the installer to GitHub Releases.

## Performance and limitations

Crystalium enables Chromium background throttling and keeps the interface lean. This is not a guarantee of lower memory usage than Chrome, and no 100x improvement is claimed. Websites, renderer processes, and media all consume resources. Tab sleeping, extension compatibility, persistent bookmarks/history, and detailed per-tab memory diagnostics remain future work.

## Security notes

Web content uses sandboxing, context isolation, and no Node integration. Navigation is limited to HTTP(S) and new windows open in a new Crystalium tab. Review and test security changes before distributing builds.

## License

MIT