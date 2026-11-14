# Storyboard app — design

Date: 2026-11-13
Status: approved 2026-11-13

"(my call)" marks a decision Claude made that the owner has not explicitly agreed to.

## Intent

The owner makes talking-head videos and wants more shot variety: different angles, B-roll, not one straight-on shot throughout. He wants to plan each video as a storyboard before filming: sketch each shot, write what happens and what is said, see timestamps, and have it all organised without effort. He will work from a script most of the time and from blank panels sometimes. The board sits next to him while filming and he ticks shots off as he goes.

The reference is StudioBinder's storyboard tool, minus everything that is not about one person quickly drawing up a board.

## Goals

- Sketch a shot with the Apple Pencil in seconds.
- Turn a pasted script into panels in one step.
- Add, split, merge, duplicate and reorder shots with one gesture each.
- Timestamps that maintain themselves.
- Vertical (9:16) or horizontal (16:9) boards.
- A filming mode for ticking shots off.
- Works offline on the iPad; usable with a mouse on a PC.

## Non-goals

- Accounts, sharing, comments, collaboration, any server.
- Syncing boards between devices (file export/import covers the rare case).
- Call sheets, schedules, equipment or lens lists.
- Image generation, photo import, audio, video export. Photo import is a possible later addition.
- A full illustration tool (layers, brushes, fills).

## Anti-goals

The app fails, even if it works, if:

- adding or moving a shot takes more than a tap or a drag;
- a sketch or board is ever lost (everything autosaves on every change);
- the board looks like a form: fields are optional and stay out of the way until used.

## Constraints

- Primary device: iPad with Apple Pencil, Safari. Secondary: Windows PC, mouse, Chrome or Edge.
- No backend. All data stays on the device.
- Free hosting on the owner's GitHub account.
- Development machine is Windows with Node 24 and git. There is no Mac, so a native app is out.
- Claude cannot test with an Apple Pencil. The owner checks pen feel on the real iPad.

## Approaches

1. **Installable web app (chosen).** Opened once in Safari, added to the home screen, then runs full-screen and offline. Same code runs on the PC. Trade-off: pen feel is very good, not quite Apple's native engine.
2. **Native iPad app.** Best pen feel. Needs a Mac and a paid Apple developer account and would not run on the PC. Ruled out.
3. **Template in an existing app** (Notion, Canva, a notes app). Nothing to build, but no script-to-panels, automatic timestamps, quick reordering or filming mode. Ruled out.

Hosting, within approach 1: free static hosting on GitHub Pages (chosen by the owner) over serving from the PC on home Wi-Fi, which only works at home and cannot run offline on an iPad.

## What it does

### Screens

1. **Home.** List of boards with title, format, length and last-edited date. New board, duplicate, delete (with confirmation), import a board file.
2. **Board.** The main screen: a grid of panels under collapsible section headings.
3. **Sketch.** Full-screen drawing for one panel.
4. **Playthrough.** Panels shown one after another at their durations.
5. **Filming.** The tick-off list.

### Board

- Created with a title and a format, 9:16 or 16:9. The format can be changed later; sketches are kept and letterboxed (my call).
- Starts from a pasted script or blank.
- Panels-per-row control (1 to 6). Defaults: 3 for vertical boards, 2 for horizontal (my call).
- Header shows the total running time and panel count.
- Sections: a titled divider ("Hook", "Point 1", "Call to action") that panels sit under. Collapsible. Each shows its own duration.

### Panel

```
┌───────────────┐  #4   0:18 – 0:26  (8s)
│               │  Setup: Side angle        ● colour
│   [ sketch ]  │  Says: "The mistake most people
│               │         make is..."
│               │  Notes: B-roll of desk over
└───────────────┘         second half      ☐ filmed
```

Fields, all optional:

- **Sketch** — in the board's format.
- **Says** — the spoken line.
- **Notes** — action, B-roll, anything else.
- **Setup** — a named camera position ("Front desk", "Side angle", "B-roll: hands"). Picked from chips of setups already used on this board, or typed new. Each setup gets a colour, shown as a stripe on the panel. This is what filming mode groups by (my call: one "setup" label instead of deriving groups from the detail chips).
- **Shot details** — tap-to-pick chips, hidden behind a "details" toggle: size (wide, medium, close-up, extreme close-up), angle (eye level, high, low, side, over-the-shoulder), movement (static, push in, pull out, pan, tilt, handheld).
- **Duration** — see Timing.
- **Filmed** — tick.

Panel numbers are positional and renumber automatically.

### Quick editing

- "+" appears between any two panels and at the end of each section. Tap inserts a blank panel there.
- Drag a panel by its handle to reorder, including across sections. Drag section headings to reorder whole sections.
- Panel menu: duplicate, split, merge with previous, delete.
- Split: place the cursor in the "Says" text and choose Split; text after the cursor moves to a new panel that copies the setup. Sketch stays with the first.
- Merge: joins the text; keeps the first panel's sketch.
- Undo and redo for every board change, at least 50 steps, for the current session. The Sketch screen has its own undo for strokes and stamps; leaving it records the whole sketch edit as one board step (my call).
- Sections are optional: panels can sit above the first heading. Deleting a heading keeps its panels, which join the section above (my call).

### Script import

- Paste text into a box. Preview shows how it will be cut before committing.
- Lines starting with `#` become section headings.
- Each paragraph (separated by a blank line) becomes one panel. A toggle switches to one panel per sentence (my call).
- Import into an existing board appends.

### Timing

- Duration of a panel = manual override if set, otherwise words in "Says" ÷ speaking pace × 60, rounded to the nearest half second, minimum 1.5s.
- Speaking pace is per board, default 150 words per minute, adjustable in board settings (my call).
- A panel with no spoken line and no override defaults to 3s (my call).
- Start and end timestamps are cumulative over board order. Panels in a collapsed section still count. They recalculate on every change.
- An overridden duration shows a small marker and a "reset to auto" action.

### Sketch

- Opens by tapping a panel's sketch. Canvas fills the screen in the board's format. Previous/next buttons move between panels without leaving the screen.
- Input: Apple Pencil draws with pressure. Once a pen has been seen, fingers never draw: one finger does nothing on the canvas, two fingers pinch-zoom and pan. With no pen (mouse, or finger on a device with no pen), the primary pointer draws.
- Tools: pen, eraser (removes whole strokes), three widths, six colours (black, grey, red, blue, green, white-out) (my call), undo/redo, clear.
- Stamps: stick figure, head-and-shoulders bust, camera, straight arrow, curved arrow, rectangle frame. Tap to place, then drag to move, corner handle to scale and rotate, delete.
- Rule-of-thirds guide toggle. Not part of the drawing.
- "Copy sketch from previous panel" action, for repeated framings.
- Sketches are stored as vector strokes and stamps, not images.

### Playthrough

- Shows each panel large with its spoken line beneath, advancing at the panel's duration. Progress bar with elapsed and total time. Play/pause, tap left/right to step, scrub.

### Filming

- Large panels in a single column: sketch, setup, line, notes, big tick target.
- Progress: "7 of 18 filmed".
- Toggle: story order, or grouped by setup (each group headed by the setup name, panels inside in story order, panel numbers kept). Panels with no setup go in a "No setup" group at the end.
- Option to hide filmed panels.
- Keeps the screen awake while open.
- "Reset all ticks", with confirmation.

### Export

- **Board file** (`<title>.storyboard.json`): the whole board, for backup and for moving between devices. Import on Home.
- **PDF:** a print layout of the board (sketch, number, timestamps, setup, line, notes; choice of panels per row), saved through the device's print-to-PDF (my call: print layout, not a generated PDF file, to keep it simple and reliable on iPad).

## How it's built (all my calls)

- **Stack:** TypeScript, React, Vite. Installable and offline through a service worker (vite-plugin-pwa) with a web app manifest and icons.
- **Storage:** IndexedDB on the device. Every change autosaves (debounced). Requests persistent storage on first run. Home shows a gentle reminder to export a backup for boards not exported in 30 days.
- **Drawing:** Pointer Events on an SVG or canvas surface, strokes smoothed with the `perfect-freehand` library using pen pressure. Thumbnails render from the same stroke data.
- **Reordering:** `dnd-kit`, which handles touch, pen and mouse.
- **Data shape:**
  - Board: id, title, format, wordsPerMinute, panelsPerRow, setups (name, colour), ordered items, created, updated, lastExported.
  - Section: id, title, collapsed.
  - Panel: id, says, notes, setupId, size, angle, movement, durationOverride, strokes, stamps, filmed.
  - Board file carries a version number so later changes can migrate old files.
- **Hosting:** a public GitHub repository, deployed to GitHub Pages by a GitHub Actions workflow on every push to `main`. Free Pages needs the repository to be public: the app's code is public, the boards are not in it.
- **Tests:** automated tests for timing, script splitting, split/merge, reordering and file export/import round-trips. Drawing and gestures are checked by hand, pen feel by The owner on the iPad.
- **Look:** quiet and neutral so the sketches stand out; light and dark themes following the device. Its own design, not StudioBinder's.

## What the owner does

1. Create an empty public repository on GitHub and give Claude its address.
2. Sign in to GitHub when git asks during the first push.
3. In the repository's Settings → Pages, set the source to "GitHub Actions".
4. Open the site on the iPad in Safari, Share → Add to Home Screen.
5. Try the pen and say what feels off.

## Left to the builder

- Visual styling, icons and exact layout at each screen size.
- Stamp artwork.
- Exact gesture thresholds and debounce timings.
- App name and icon. Working name: "Storyboard".
