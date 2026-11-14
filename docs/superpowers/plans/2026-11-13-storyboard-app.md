# Storyboard App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An installable, offline web app for storyboarding talking-head videos on an iPad with Apple Pencil: script-to-panels, sketching, automatic timestamps, quick reordering, a filming tick-off mode.

**Architecture:** All board logic is pure functions over one immutable `Board` value (`src/model`), so it is tested without a browser. A small store wraps that value with undo history and debounced autosave to IndexedDB. React screens render the board and call model operations; drawing is vector strokes rendered as SVG.

**Tech Stack:** TypeScript, React 18, Vite, Vitest (+ jsdom, fake-indexeddb, @testing-library/react), vite-plugin-pwa, idb, perfect-freehand, @dnd-kit/core + @dnd-kit/sortable. Deployed to GitHub Pages by GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-13-storyboard-app-design.md`

## Global Constraints

- All paths below are relative to the repository root.
- No backend, no network calls at runtime, no analytics. All data stays on the device.
- Formats: exactly `'9:16'` and `'16:9'`.
- Defaults: 150 words per minute; minimum auto duration 1.5s; panel with no spoken line 3s; durations rounded to the nearest 0.5s; panels per row 3 for 9:16 and 2 for 16:9, range 1–6; undo depth 50.
- Every change autosaves. Nothing is saved only on an explicit action.
- Primary target is iPad Safari with Apple Pencil; must also work with a mouse in Chrome/Edge on Windows.
- Vite `base: './'` and hash-based routing, so the app works under a GitHub Pages sub-path.
- Fields on a panel are optional and stay out of the way until used.
- Own visual design, light and dark following the device. Do not copy StudioBinder's look or branding.
- Commit after every task. End commit messages with `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.

## Review Focus

1. **Pasting an empty, whitespace-only or heading-only script** → no panels are created, no crash, the import button is disabled. (Task 3)
2. **Importing a file that is not a board, is truncated, or has a newer `version`** → a plain error message, existing boards untouched. (Task 6)
3. **A duration override of 0, negative, or non-numeric text** → rejected; the panel keeps its previous duration. (Task 2, Task 9)
4. **Storage unavailable or full** (private browsing, quota) → a visible "not saved" banner with an "export board file" action; the in-memory board keeps working. (Task 7)
5. **A palm or finger touching the canvas while the pen is down** → no stray stroke, and the in-progress pen stroke is not cancelled. (Task 11)

---

## File Structure

```
index.html, package.json, vite.config.ts, tsconfig.json
.github/workflows/deploy.yml
public/icons/                    app icons (192, 512, apple-touch 180)
src/main.tsx, src/App.tsx        entry, hash router, theme
src/theme.css                    colour tokens, light/dark
src/model/types.ts               Board, Item, Panel, Section, Setup, Sketch, Stroke, Stamp
src/model/timing.ts              durations and timeline
src/model/script.ts              script text -> parsed items
src/model/ops.ts                 every board edit, pure
src/model/history.ts             undo/redo stack, pure
src/model/file.ts                board file export/import + validation
src/model/filming.ts             grouping for filming mode
src/store/db.ts                  IndexedDB access
src/store/useBoard.ts            React hook: board + history + autosave
src/draw/pointerPolicy.ts        which pointer may draw
src/draw/strokePath.ts           stroke -> SVG path data
src/draw/stamps.tsx              stamp artwork + definitions
src/draw/SketchView.tsx          read-only sketch (thumbnails, playthrough, print)
src/draw/SketchEditor.tsx        full-screen drawing screen
src/screens/Home.tsx
src/screens/BoardScreen.tsx, PanelCard.tsx, SectionHeader.tsx, ScriptImport.tsx, BoardSettings.tsx
src/screens/Playthrough.tsx
src/screens/Filming.tsx
src/screens/PrintView.tsx
```

Tests sit beside their files as `*.test.ts(x)`.

---

### Task 1: Project scaffold

**Files:** Create `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/theme.css`, `.gitignore`.

**Produces:** `npm run dev`, `npm run build`, `npm test` (Vitest, jsdom environment, `fake-indexeddb/auto` in the setup file). `App` renders routes by `location.hash`: `#/` Home, `#/board/:id`, `#/board/:id/sketch/:panelId`, `#/board/:id/play`, `#/board/:id/film`, `#/board/:id/print`.

- [ ] Scaffold with `npm create vite@latest . -- --template react-ts`; add the dependencies listed in Tech Stack.
- [ ] Set `base: './'` in `vite.config.ts`; add the Vitest config.
- [ ] Write `App.test.tsx`: `renders the Home screen at "#/"` asserts the text "Storyboards" is present.
- [ ] Implement the hash router in `App.tsx` with placeholder screens.
- [ ] Run `npm test` → 1 passed. Run `npm run build` → exits 0.
- [ ] `git init`, commit `chore: scaffold storyboard app`.

### Task 2: Types and timing

**Files:** Create `src/model/types.ts`, `src/model/timing.ts`, `src/model/timing.test.ts`.

**Produces:**

```ts
export type Format = '9:16' | '16:9';
export interface Setup { id: string; name: string; color: string }
export interface Stroke { points: [number, number, number][]; color: string; width: number } // x, y, pressure
export type StampKind = 'figure' | 'bust' | 'camera' | 'arrow' | 'curvedArrow' | 'frame';
export interface Stamp { id: string; kind: StampKind; x: number; y: number; scale: number; rotation: number }
export interface Sketch { format: Format; strokes: Stroke[]; stamps: Stamp[] }
export interface Panel {
  type: 'panel'; id: string; says: string; notes: string; setupId: string | null;
  size: string | null; angle: string | null; movement: string | null;
  durationOverride: number | null; sketch: Sketch; filmed: boolean;
}
export interface Section { type: 'section'; id: string; title: string; collapsed: boolean }
export type Item = Panel | Section;
export interface Board {
  version: 1; id: string; title: string; format: Format; wordsPerMinute: number;
  panelsPerRow: number; setups: Setup[]; items: Item[];
  createdAt: number; updatedAt: number; lastExportedAt: number | null;
}
export interface TimelineEntry { panelId: string; number: number; start: number; end: number; duration: number }

export function countWords(text: string): number;
export function panelDuration(panel: Panel, wordsPerMinute: number): number;
export function timeline(board: Board): TimelineEntry[];
export function totalDuration(board: Board): number;
export function formatTime(seconds: number): string;            // 18 -> "0:18", 75.5 -> "1:15"
export function formatDuration(seconds: number): string;        // 8 -> "8s", 8.5 -> "8.5s"
export function parseDurationInput(text: string): number | null; // null when invalid
```

Sketch coordinates use a virtual canvas: 900×1600 for `'9:16'`, 1600×900 for `'16:9'`.

- [ ] Write failing tests:
  - `20 words at 150 wpm is 8s`
  - `3 words at 150 wpm is clamped to 1.5s`
  - `7 words at 150 wpm (2.8s) rounds to 3s`
  - `empty line with no override is 3s`
  - `override 5 wins over a 20-word line`
  - `timeline numbers panels 1..n, skips sections, and is cumulative` (three panels of 8, 3, 5 → starts 0, 8, 11; ends 8, 11, 16)
  - `panels in a collapsed section still count`
  - `parseDurationInput: "4" -> 4, "2.5" -> 2.5, "0" -> null, "-1" -> null, "abc" -> null, "" -> null`
- [ ] Run `npx vitest run src/model/timing.test.ts` → FAIL (module missing).
- [ ] Implement.
- [ ] Run again → PASS. Commit `feat: board types and timing`.

### Task 3: Script parsing

**Files:** Create `src/model/script.ts`, `src/model/script.test.ts`.

**Produces:**

```ts
export type ParsedItem = { kind: 'section'; title: string } | { kind: 'panel'; says: string };
export function parseScript(text: string, mode: 'paragraph' | 'sentence'): ParsedItem[];
```

Rules: normalise `\r\n`; a line starting with `#` is a section (leading `#`s and spaces stripped); paragraphs are separated by one or more blank lines; single newlines inside a paragraph become spaces; sentence mode splits a paragraph after `.`, `!` or `?` followed by whitespace.

- [ ] Write failing tests:
  - `two paragraphs become two panels`
  - `"# Hook" becomes a section titled "Hook"`
  - `line breaks inside a paragraph are joined with a space`
  - `sentence mode splits "One. Two! Three?" into three panels`
  - `empty, whitespace-only and "#"-only input returns no panels` (Review Focus 1)
  - `Windows line endings parse the same as Unix`
- [ ] Run → FAIL. Implement. Run → PASS. Commit `feat: script parsing`.

### Task 4: Board operations

**Files:** Create `src/model/ops.ts`, `src/model/ops.test.ts`.

**Consumes:** types from Task 2, `ParsedItem` from Task 3.

**Produces** (all pure; each returns a new `Board` with `updatedAt` set):

```ts
export const SETUP_COLORS: string[];                  // 8 distinguishable colours, assigned in order, cycling
export function newBoard(title: string, format: Format): Board;
export function newPanel(format: Format, patch?: Partial<Panel>): Panel;
export function insertPanel(board: Board, index: number, patch?: Partial<Panel>): Board;
export function insertSection(board: Board, index: number, title: string): Board;
export function updatePanel(board: Board, id: string, patch: Partial<Panel>): Board;
export function updateSection(board: Board, id: string, patch: Partial<Section>): Board;
export function updateBoard(board: Board, patch: Partial<Pick<Board, 'title' | 'wordsPerMinute' | 'panelsPerRow' | 'format' | 'lastExportedAt'>>): Board;
export function deleteItem(board: Board, id: string): Board;           // deleting a section keeps its panels
export function duplicatePanel(board: Board, id: string): Board;       // copy placed directly after, filmed=false
export function splitPanel(board: Board, id: string, cursor: number): Board;
export function mergeWithPrevious(board: Board, id: string): Board;    // no-op if the previous item is not a panel
export function moveItem(board: Board, id: string, toIndex: number): Board;
export function moveSection(board: Board, id: string, toIndex: number): Board; // heading plus its panels
export function assignSetup(board: Board, panelId: string, name: string | null): Board; // creates the setup if the name is new (case-insensitive match)
export function appendScript(board: Board, parsed: ParsedItem[]): Board;
export function copySketchFromPrevious(board: Board, panelId: string): Board;
export function resetFilmed(board: Board): Board;
```

- [ ] Write failing tests:
  - `newBoard defaults: 150 wpm; panelsPerRow 3 for 9:16 and 2 for 16:9`
  - `insertPanel at index 1 of three items puts it second`
  - `deleteItem on a section leaves its panels in place`
  - `duplicatePanel copies says, setup and sketch, gives a new id, clears filmed`
  - `splitPanel("Hello world again", cursor 6) -> "Hello" and "world again"; second copies setupId and has an empty sketch; a set durationOverride is cleared on both`
  - `mergeWithPrevious joins text with a space, keeps the first sketch, removes the second`
  - `moveSection moves the heading and every panel up to the next heading`
  - `assignSetup with a new name adds a setup with the next colour; "side angle" reuses existing "Side Angle"`
  - `appendScript adds sections and panels at the end in order`
  - `updateBoard format change keeps each panel's sketch.format unchanged`
  - `resetFilmed clears every tick`
  - `no operation mutates its input` (deep-freeze the board before each call)
- [ ] Run → FAIL. Implement. Run → PASS. Commit `feat: board operations`.

### Task 5: Undo history

**Files:** Create `src/model/history.ts`, `src/model/history.test.ts`.

**Produces:**

```ts
export interface History<T> { past: T[]; present: T; future: T[] }
export function createHistory<T>(present: T): History<T>;
export function push<T>(h: History<T>, next: T, limit?: number): History<T>; // default limit 50, clears future
export function undo<T>(h: History<T>): History<T>;
export function redo<T>(h: History<T>): History<T>;
```

- [ ] Write failing tests: `push then undo restores the previous value`; `redo reapplies`; `push after undo clears redo`; `the 51st push drops the oldest step`; `undo with empty past is a no-op`.
- [ ] Run → FAIL. Implement. Run → PASS. Commit `feat: undo history`.

### Task 6: Board file export and import

**Files:** Create `src/model/file.ts`, `src/model/file.test.ts`.

**Produces:**

```ts
export function boardFileName(board: Board): string;   // "<title>.storyboard.json", unsafe filename characters replaced with "-"
export function serializeBoard(board: Board): string;
export function parseBoardFile(text: string): { ok: true; board: Board } | { ok: false; error: string };
```

`parseBoardFile` validates the shape of every field, gives the imported board a new `id`, and returns these exact errors: `"This isn't a storyboard file."` (not JSON or wrong shape) and `"This file was made by a newer version of the app."` (`version` > 1).

- [ ] Write failing tests: `round trip preserves title, items, strokes and stamps`; `import assigns a new id`; `"hello" -> not a storyboard file`; `truncated JSON -> not a storyboard file`; `{"version":2,...} -> newer version`; `a panel missing "says" -> not a storyboard file`; `boardFileName('My: video/1') -> "My- video-1.storyboard.json"`.
- [ ] Run → FAIL. Implement. Run → PASS. Commit `feat: board file export and import`.

### Task 7: Storage and the board store

**Files:** Create `src/store/db.ts`, `src/store/db.test.ts`, `src/store/useBoard.ts`, `src/store/useBoard.test.tsx`.

**Consumes:** `Board`, ops, `History`.

**Produces:**

```ts
// db.ts — database "storyboard", object store "boards" keyed by id
export interface BoardSummary { id: string; title: string; format: Format; updatedAt: number; lastExportedAt: number | null; duration: number; panelCount: number }
export function listBoards(): Promise<BoardSummary[]>;   // newest first
export function loadBoard(id: string): Promise<Board | undefined>;
export function saveBoard(board: Board): Promise<void>;
export function deleteBoard(id: string): Promise<void>;
export function requestPersistence(): Promise<boolean>;  // navigator.storage.persist(), false if unavailable

// useBoard.ts
export function useBoard(id: string): {
  board: Board | null; loading: boolean; saveError: boolean;
  apply(op: (b: Board) => Board): void;   // pushes history, schedules a save 400ms later
  undo(): void; redo(): void; canUndo: boolean; canRedo: boolean;
};
```

`saveError` becomes true when `saveBoard` rejects and false after the next successful save. Pending saves flush on `visibilitychange` to hidden and on unmount.

- [ ] Write failing tests:
  - db: `save then load returns the board`; `listBoards is newest first with duration and panelCount`; `deleteBoard removes it`
  - hook: `apply updates the board and saves after 400ms` (fake timers); `undo restores and saves`; `a rejected save sets saveError and keeps the board in memory` (Review Focus 4); `unmount flushes a pending save`
- [ ] Run → FAIL. Implement. Run → PASS. Commit `feat: storage and board store`.

### Task 8: Home screen

**Files:** Create `src/screens/Home.tsx`, `src/screens/Home.test.tsx`. Modify `src/App.tsx`.

**Consumes:** `listBoards`, `saveBoard`, `deleteBoard`, `newBoard`, `parseBoardFile`, `formatTime`.

- [ ] Write failing tests: `lists saved boards with title, format and length`; `"New board" with a title and 9:16 creates it and navigates to #/board/<id>`; `delete asks for confirmation before removing`; `importing an invalid file shows "This isn't a storyboard file." and adds nothing`; `empty state invites creating the first board`; `a board with lastExportedAt older than 30 days (or null and created over 30 days ago) shows a "back up" hint`.
- [ ] Implement: board cards, new-board dialog (title, format picker showing the two shapes), duplicate, delete, import via file input.
- [ ] Run → PASS. Commit `feat: home screen`.

### Task 9: Board screen and quick editing

**Files:** Create `src/screens/BoardScreen.tsx`, `PanelCard.tsx`, `SectionHeader.tsx`, `BoardSettings.tsx`, `BoardScreen.test.tsx`. Create `src/draw/strokePath.ts`, `src/draw/SketchView.tsx`.

**Consumes:** `useBoard`, ops, `timeline`, `totalDuration`, `formatTime`, `formatDuration`, `parseDurationInput`.

**Produces:**

```ts
// strokePath.ts
export function strokeToPath(stroke: Stroke): string;   // perfect-freehand outline -> SVG path "d"
// SketchView.tsx — read-only; fits sketch.format inside `format` (contain, letterboxed)
export function SketchView(props: { sketch: Sketch; format: Format; className?: string }): JSX.Element;
```

Chip values — size: Wide, Medium, Close-up, Extreme close-up. Angle: Eye level, High, Low, Side, Over the shoulder. Movement: Static, Push in, Pull out, Pan, Tilt, Handheld.

- [ ] Write failing tests:
  - `header shows total time and panel count`
  - `each panel shows its number, start–end and duration`
  - `"+" between panels 1 and 2 inserts a blank panel as number 2`
  - `typing in "Says" updates the panel's duration`
  - `entering "5" as duration sets an override and shows the reset action; entering "abc" leaves the duration unchanged` (Review Focus 3)
  - `panel menu: duplicate, split at cursor, merge with previous, delete each change the board as in Task 4`
  - `picking a new setup name adds a chip that other panels can pick`
  - `details chips are hidden until "details" is toggled`
  - `collapsing a section hides its panels but the total time is unchanged`
  - `a section header shows the summed duration of its panels`
  - `undo button reverts the last change`
  - `saveError shows a "Not saved" banner with an "Export board file" action`
- [ ] Implement the grid (CSS grid, `panelsPerRow` columns), cards, section headers, settings sheet (title, format, pace, panels per row).
- [ ] Add drag-to-reorder with dnd-kit: panels by handle across sections (`moveItem`), section headers (`moveSection`). Sensors: pointer with an 8px activation distance, keyboard.
- [ ] Add export of the board file (download via Blob; sets `lastExportedAt`).
- [ ] Run → PASS. Check by hand in `npm run dev` that drag reorder works with a mouse. Commit `feat: board screen`.

### Task 10: Script import

**Files:** Create `src/screens/ScriptImport.tsx`, `ScriptImport.test.tsx`. Modify `BoardScreen.tsx`, `Home.tsx` (new-board dialog offers "Start from a script").

**Consumes:** `parseScript`, `appendScript`.

- [ ] Write failing tests: `preview lists the panels and headings the paste will create`; `switching to "one panel per sentence" updates the preview`; `import button is disabled when the preview has no panels`; `importing appends to the existing board in one undo step`.
- [ ] Implement. Run → PASS. Commit `feat: script import`.

### Task 11: Sketch editor

**Files:** Create `src/draw/pointerPolicy.ts`, `pointerPolicy.test.ts`, `src/draw/SketchEditor.tsx`, `SketchEditor.test.tsx`.

**Consumes:** `strokeToPath`, `updatePanel`, `useBoard`.

**Produces:**

```ts
export type PointerRole = 'draw' | 'navigate' | 'ignore';
export interface PointerPolicy {
  down(e: { pointerId: number; pointerType: string }): PointerRole;
  up(e: { pointerId: number }): void;
  readonly penSeen: boolean;
}
export function createPointerPolicy(): PointerPolicy;
```

Rules: `pen` → `draw`. `mouse` → `draw`. `touch` before any pen has been seen → `draw` when it is the only active pointer, `navigate` when a second touch joins (the in-progress stroke is discarded). `touch` after a pen has been seen → `ignore` for a single touch, `navigate` for two. A touch that lands while a pen is down → `ignore`, pen stroke unaffected.

Editor: SVG surface in the virtual canvas of the board's format, `touch-action: none`, pointer capture, coalesced events where available. Tools: pen, eraser (removes any stroke the pointer crosses), widths 4 / 10 / 20, colours `#111111`, `#8a8a8a`, `#d93025`, `#1a73e8`, `#188038`, `#ffffff`. Own undo/redo over strokes and stamps; on leaving, commit one `updatePanel` if the sketch changed. Clear asks for confirmation. Previous/next panel buttons. Two-finger pinch zoom and pan (1×–6×), double-tap with two fingers resets. Editing a sketch whose `format` differs from the board's converts it to the board's format first (scaled to fit).

- [ ] Write failing policy tests: `pen draws`; `mouse draws`; `single finger draws when no pen has been seen`; `after a pen, a single finger is ignored`; `two fingers navigate`; `a touch during a pen stroke is ignored and the pen keeps drawing` (Review Focus 5).
- [ ] Write failing editor tests (synthetic pointer events): `a pen drag adds one stroke with pressure values`; `undo removes it`; `eraser removes a crossed stroke`; `leaving the screen saves the sketch as one board undo step`; `leaving without changes adds no undo step`.
- [ ] Implement. Run → PASS. Check by hand with a mouse. Commit `feat: sketch editor`.

### Task 12: Stamps, guide, copy previous

**Files:** Create `src/draw/stamps.tsx`, `stamps.test.tsx`. Modify `SketchEditor.tsx`, `SketchView.tsx`.

**Produces:**

```ts
export const STAMPS: Record<StampKind, { label: string; viewBox: string; render: () => JSX.Element }>;
export function StampView(props: { stamp: Stamp }): JSX.Element;
```

- [ ] Write failing tests: `choosing a stamp then tapping the canvas places it at that point`; `dragging a selected stamp moves it`; `the corner handle scales and rotates`; `delete removes the selected stamp`; `thirds guide toggles and is absent from the saved sketch`; `"Copy from previous" replaces an empty sketch and asks first when the sketch is not empty`; `SketchView renders stamps`.
- [ ] Draw the six stamps as simple line SVGs. Implement. Run → PASS. Commit `feat: stamps and guides`.

### Task 13: Playthrough

**Files:** Create `src/screens/Playthrough.tsx`, `Playthrough.test.tsx`.

**Consumes:** `timeline`, `SketchView`, `formatTime`.

- [ ] Write failing tests (fake timers): `starts on panel 1 and advances after its duration`; `pause stops advancing`; `tapping the right half steps forward, the left half back`; `progress shows elapsed and total time`; `stops on the last panel`; `an empty board shows a message, not an error`.
- [ ] Implement with a single `requestAnimationFrame`-driven clock. Run → PASS. Commit `feat: playthrough`.

### Task 14: Filming mode

**Files:** Create `src/model/filming.ts`, `filming.test.ts`, `src/screens/Filming.tsx`, `Filming.test.tsx`.

**Produces:**

```ts
export interface FilmingGroup { setup: Setup | null; panels: { panel: Panel; number: number }[] }
export function groupBySetup(board: Board): FilmingGroup[]; // groups in order of first appearance; the null-setup group last
export function filmedCount(board: Board): { filmed: number; total: number };
```

- [ ] Write failing tests: `groupBySetup keeps story order inside a group and original panel numbers`; `panels with no setup are in a final "No setup" group`; `ticking a panel shows "1 of 3 filmed" and persists`; `"Group by setup" switches the layout`; `"Hide filmed" removes ticked panels from view`; `"Reset all ticks" asks for confirmation`; `requests a screen wake lock on open and releases it on close, and does not fail where the API is missing`.
- [ ] Implement: single column, large tick targets (at least 56px). Run → PASS. Commit `feat: filming mode`.

### Task 15: Print layout

**Files:** Create `src/screens/PrintView.tsx`, `PrintView.test.tsx`, print rules in `src/theme.css`.

- [ ] Write failing tests: `renders every panel with number, timestamps, setup, line and notes, including panels in collapsed sections`; `panels-per-row choice (2, 3 or 4) sets the grid`; `the Print button calls window.print`.
- [ ] Implement with `@media print` rules: white background, no app chrome, `break-inside: avoid` on panels, section headings kept with their first panel.
- [ ] Run → PASS. Check the print preview in Chrome by hand. Commit `feat: print layout`.

### Task 16: Install, offline, deploy

**Files:** Modify `vite.config.ts` (vite-plugin-pwa: `registerType: 'autoUpdate'`, manifest name "Storyboard", `display: 'standalone'`, theme colours, icons). Create `public/icons/*`, `.github/workflows/deploy.yml`, `README.md`. Modify `index.html` (apple-touch-icon, `apple-mobile-web-app-capable`, viewport with `viewport-fit=cover`), `src/main.tsx` (call `requestPersistence()` once).

- [ ] Add the manifest, icons and service worker config.
- [ ] Write the workflow: on push to `main`, `npm ci`, `npm test`, `npm run build`, upload `dist` with `actions/upload-pages-artifact`, deploy with `actions/deploy-pages`.
- [ ] Run `npm run build && npx vite preview`; in Chrome DevTools confirm the manifest is installable and the app reloads with the network set to offline.
- [ ] Write `README.md`: what it is, how to run, how to deploy, how to install on iPad.
- [ ] Commit `feat: installable offline app and deploy workflow`.
- [ ] the owner's steps: create the public repository; then `git remote add origin <url>` and `git push -u origin main`; set Pages source to "GitHub Actions". Confirm the deployed URL loads.

### Task 17: iPad check

- [ ] The owner opens the site in Safari on the iPad, adds it to the home screen, and tries: creating a board from a script, sketching with the Pencil, palm resting on the screen, reordering, playthrough, filming mode, turning on airplane mode and reopening.
- [ ] Fix what he reports. Pen-feel settings to tune live in `strokeToPath` (perfect-freehand `size`, `thinning`, `smoothing`, `streamline`).
