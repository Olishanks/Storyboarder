# Storyboard

A storyboarding app for planning videos: sketch each shot, write what is said, and get timestamps that keep themselves up to date. Built for an iPad with Apple Pencil; works with a mouse too.

- Vertical (9:16) or horizontal (16:9) boards
- Paste a script and each paragraph becomes a panel
- Add, split, merge, duplicate and drag panels to reorder
- Sketch with pen pressure, stamps and a rule-of-thirds guide
- Playthrough at the timed lengths
- Filming mode: tick shots off, grouped by camera setup if you like
- Works offline. Boards are stored on the device and never uploaded

## Run it

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

## Put it online

Pushing to `main` builds and publishes the app to GitHub Pages (`.github/workflows/deploy.yml`). In the repository's Settings → Pages, the source must be set to "GitHub Actions".

## Install on an iPad

Open the published address in Safari, tap Share, then "Add to Home Screen". Open it from the home screen from then on: it runs full-screen and offline.

## Your boards

Boards live in the browser's storage on the device that made them. Use "Export board file" on a board to back it up or move it to another device, and "Import board file" on the home screen to bring it in.

## Pen feel

The stroke settings are in `src/draw/strokePath.ts` (`PEN_FEEL`).
