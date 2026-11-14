import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createHistory, push, redo, undo, type History } from '../model/history';
import { cloneSketch, isSketchEmpty, uid, updatePanel } from '../model/ops';
import { canvasSize, type Panel, type Sketch, type Stamp, type StampKind, type Stroke, type StrokePoint } from '../model/types';
import { navigate } from '../router';
import type { BoardStore } from '../store/useBoard';
import { Confirm } from '../ui/Dialog';
import {
  IconBack,
  IconCopy,
  IconEraser,
  IconForward,
  IconGrid,
  IconPen,
  IconRedo,
  IconSelect,
  IconTrash,
  IconUndo,
} from '../ui/icons';
import { eraserTouches, fitSketch, handlePosition, hitStamp, stampFromHandle, STAMP_HALF } from './geometry';
import { createPointerPolicy, type PointerRole } from './pointerPolicy';
import { STAMP_KINDS, STAMPS, StampArt, StampView } from './stamps';
import { strokeToPath } from './strokePath';

export const PEN_COLORS = [
  { name: 'Black', value: '#111111' },
  { name: 'Grey', value: '#8a8a8a' },
  { name: 'Red', value: '#d93025' },
  { name: 'Blue', value: '#1a73e8' },
  { name: 'Green', value: '#188038' },
  { name: 'White', value: '#ffffff' },
];
export const PEN_WIDTHS = [
  { name: 'Thin', value: 4 },
  { name: 'Medium', value: 10 },
  { name: 'Thick', value: 20 },
];

const AUTOSAVE_MS = 800;
const ERASER_RADIUS = 24;
const HANDLE_RADIUS = 44;
const MAX_ZOOM = 6;

type Tool = 'pen' | 'eraser' | 'select' | `stamp:${StampKind}`;
type Gesture =
  | { kind: 'stroke'; pointerId: number; points: StrokePoint[] }
  | { kind: 'erase'; pointerId: number; last: [number, number]; base: Sketch }
  | { kind: 'move'; pointerId: number; stampId: string; dx: number; dy: number; base: Sketch }
  | { kind: 'handle'; pointerId: number; stampId: string; base: Sketch };
interface View {
  x: number;
  y: number;
  scale: number;
}

const StrokePath = memo(function StrokePath({ stroke }: { stroke: Stroke }) {
  return <path d={strokeToPath(stroke)} fill={stroke.color} />;
});

export function SketchEditor({ store, panelId }: { store: BoardStore; panelId: string }) {
  const board = store.board!;
  const panels = useMemo(() => board.items.filter((item): item is Panel => item.type === 'panel'), [board.items]);
  const index = panels.findIndex((p) => p.id === panelId);
  const panel = panels[index] as Panel | undefined;
  const size = canvasSize(board.format);

  const initial = useRef<Sketch>(panel ? fitSketch(panel.sketch, board.format) : { format: board.format, strokes: [], stamps: [] });
  const [draft, setDraft] = useState<History<Sketch>>(() => createHistory(initial.current));
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const [working, setWorking] = useState<Sketch | null>(null);
  const [live, setLive] = useState<Stroke | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(PEN_COLORS[0].value);
  const [width, setWidth] = useState(PEN_WIDTHS[1].value);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const [confirm, setConfirm] = useState<'clear' | 'copy' | null>(null);

  const svg = useRef<SVGSVGElement>(null);
  const policy = useRef(createPointerPolicy());
  const roles = useRef(new Map<number, PointerRole>());
  const gesture = useRef<Gesture | null>(null);
  const touchPoints = useRef(new Map<number, { x: number; y: number }>());
  const viewRef = useRef(view);
  viewRef.current = view;
  const workingRef = useRef<Sketch | null>(null);

  const shown = working ?? draft.present;
  const selected = shown.stamps.find((s) => s.id === selectedId) ?? null;

  const commitDraft = useCallback((next: Sketch) => setDraft((h) => (next === h.present ? h : push(h, next))), []);

  // Every save from one visit to this screen merges into a single board undo step.
  const visitKey = useRef(`sketch:${panelId}:${uid()}`);
  const save = useCallback(() => {
    const current = draftRef.current.present;
    if (current === initial.current) return;
    initial.current = current;
    store.apply((b) => updatePanel(b, panelId, { sketch: current }), visitKey.current, Infinity);
  }, [store, panelId]);

  const saveRef = useRef(save);
  saveRef.current = save;
  const flushRef = useRef(store.flush);
  flushRef.current = store.flush;

  // Leaving by the browser's own back button still saves.
  useEffect(() => () => saveRef.current(), []);

  // A sketch must survive the app being closed mid-drawing: save soon after each change...
  useEffect(() => {
    if (draft.present === initial.current) return;
    const timer = setTimeout(() => saveRef.current(), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [draft.present]);

  // ...and write to storage at once when the app goes to the background.
  useEffect(() => {
    const saveNow = () => {
      saveRef.current();
      flushRef.current();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', saveNow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', saveNow);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      setDraft((h) => (e.shiftKey ? redo(h) : undo(h)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toCanvas = (e: { clientX: number; clientY: number }): [number, number] => {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return [e.clientX, e.clientY];
    const v = viewRef.current;
    return [
      v.x + ((e.clientX - rect.left) / rect.width) * (size.width / v.scale),
      v.y + ((e.clientY - rect.top) / rect.height) * (size.height / v.scale),
    ];
  };

  const setWork = (next: Sketch | null) => {
    workingRef.current = next;
    setWorking(next);
  };

  const clampView = (v: View): View => {
    const scale = Math.max(1, Math.min(MAX_ZOOM, v.scale));
    return {
      scale,
      x: Math.max(0, Math.min(size.width - size.width / scale, v.x)),
      y: Math.max(0, Math.min(size.height - size.height / scale, v.y)),
    };
  };

  const zoomAround = (clientX: number, clientY: number, nextScale: number, toClientX = clientX, toClientY = clientY) => {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const v = viewRef.current;
    const fx = (clientX - rect.left) / rect.width;
    const fy = (clientY - rect.top) / rect.height;
    const cx = v.x + fx * (size.width / v.scale);
    const cy = v.y + fy * (size.height / v.scale);
    const scale = Math.max(1, Math.min(MAX_ZOOM, nextScale));
    const tx = (toClientX - rect.left) / rect.width;
    const ty = (toClientY - rect.top) / rect.height;
    const next = clampView({ scale, x: cx - tx * (size.width / scale), y: cy - ty * (size.height / scale) });
    viewRef.current = next;
    setView(next);
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const role = policy.current.down(e);
    roles.current.set(e.pointerId, role);
    if (e.pointerType === 'touch') touchPoints.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (role === 'ignore') return;
    if (role === 'navigate') {
      // A second finger arrived: whatever the first finger started is not a drawing.
      if (gesture.current && roles.current.get(gesture.current.pointerId) !== undefined && e.pointerType === 'touch') {
        const g = gesture.current;
        if (touchPoints.current.has(g.pointerId)) {
          gesture.current = null;
          setLive(null);
          setWork(null);
        }
      }
      for (const id of touchPoints.current.keys()) roles.current.set(id, 'navigate');
      return;
    }
    // A pen outranks a finger: if a palm landed first and started something, drop it.
    if (gesture.current && e.pointerType === 'pen' && touchPoints.current.has(gesture.current.pointerId)) {
      roles.current.set(gesture.current.pointerId, 'ignore');
      gesture.current = null;
      setLive(null);
      setWork(null);
    }
    if (gesture.current) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const [x, y] = toCanvas(e);
    const base = draftRef.current.present;

    if (tool === 'pen') {
      const points: StrokePoint[] = [[x, y, e.pressure > 0 ? e.pressure : 0.5]];
      gesture.current = { kind: 'stroke', pointerId: e.pointerId, points };
      setLive({ points: [...points], color, width });
      setSelectedId(null);
      return;
    }
    if (tool === 'eraser') {
      gesture.current = { kind: 'erase', pointerId: e.pointerId, last: [x, y], base };
      eraseBetween([x, y], [x, y], base);
      return;
    }
    if (tool === 'select') {
      const current = base.stamps.find((s) => s.id === selectedId);
      if (current) {
        const handle = handlePosition(current);
        if (Math.hypot(x - handle.x, y - handle.y) <= HANDLE_RADIUS / viewRef.current.scale) {
          gesture.current = { kind: 'handle', pointerId: e.pointerId, stampId: current.id, base };
          return;
        }
      }
      const hit = hitStamp(base.stamps, x, y);
      setSelectedId(hit?.id ?? null);
      if (hit) gesture.current = { kind: 'move', pointerId: e.pointerId, stampId: hit.id, dx: x - hit.x, dy: y - hit.y, base };
      return;
    }
    const kind = tool.slice('stamp:'.length) as StampKind;
    const stamp: Stamp = { id: uid(), kind, x, y, scale: 1, rotation: 0 };
    commitDraft({ ...base, stamps: [...base.stamps, stamp] });
    setSelectedId(stamp.id);
    setTool('select');
  };

  const eraseBetween = (from: [number, number], to: [number, number], base: Sketch) => {
    const current = workingRef.current ?? base;
    const radius = ERASER_RADIUS / viewRef.current.scale;
    const strokes = current.strokes.filter((stroke) => !eraserTouches(stroke, from, to, radius));
    if (strokes.length !== current.strokes.length) setWork({ ...current, strokes });
  };

  const replaceStamp = (base: Sketch, stamp: Stamp) =>
    setWork({ ...base, stamps: base.stamps.map((s) => (s.id === stamp.id ? stamp : s)) });

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const role = roles.current.get(e.pointerId);
    if (role === 'navigate') {
      const before = [...touchPoints.current.values()];
      touchPoints.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const after = [...touchPoints.current.values()];
      if (before.length >= 2 && after.length >= 2) {
        const mid = (p: { x: number; y: number }[]) => ({ x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 });
        const dist = (p: { x: number; y: number }[]) => Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1;
        const from = mid(before);
        const to = mid(after);
        zoomAround(from.x, from.y, viewRef.current.scale * (dist(after) / dist(before)), to.x, to.y);
      }
      return;
    }
    if (e.pointerType === 'touch') touchPoints.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;

    if (g.kind === 'stroke') {
      const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
      for (const event of events.length > 0 ? events : [e.nativeEvent]) {
        const [x, y] = toCanvas(event);
        const last = g.points[g.points.length - 1];
        if (Math.abs(x - last[0]) < 0.5 && Math.abs(y - last[1]) < 0.5) continue;
        g.points.push([x, y, event.pressure > 0 ? event.pressure : 0.5]);
      }
      setLive({ points: [...g.points], color, width });
      return;
    }
    const [x, y] = toCanvas(e);
    if (g.kind === 'erase') {
      eraseBetween(g.last, [x, y], g.base);
      g.last = [x, y];
      return;
    }
    const stamp = g.base.stamps.find((s) => s.id === g.stampId);
    if (!stamp) return;
    if (g.kind === 'move') replaceStamp(g.base, { ...stamp, x: x - g.dx, y: y - g.dy });
    else replaceStamp(g.base, stampFromHandle(stamp, x, y));
  };

  const endPointer = (e: ReactPointerEvent<SVGSVGElement>, cancelled: boolean) => {
    policy.current.up(e);
    roles.current.delete(e.pointerId);
    touchPoints.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gesture.current = null;
    if (g.kind === 'stroke') {
      setLive(null);
      if (!cancelled) {
        const base = draftRef.current.present;
        commitDraft({ ...base, strokes: [...base.strokes, { points: g.points, color, width }] });
      }
      return;
    }
    const result = workingRef.current;
    setWork(null);
    if (!cancelled && result) commitDraft(result);
  };

  const go = (path: string) => {
    save();
    navigate(path);
  };

  if (!panel) {
    return (
      <main className="sketch-screen">
        <p className="empty">
          This panel no longer exists. <a href={`#/board/${board.id}`}>Back to the board</a>
        </p>
      </main>
    );
  }

  const previous = panels[index - 1];
  const next = panels[index + 1];
  const copyPrevious = () => {
    setConfirm(null);
    if (!previous) return;
    commitDraft(fitSketch(cloneSketch(previous.sketch), board.format));
    setSelectedId(null);
  };
  const handle = selected && tool === 'select' ? handlePosition(selected) : null;
  const vbWidth = size.width / view.scale;
  const vbHeight = size.height / view.scale;

  return (
    <main className="sketch-screen" data-format={board.format}>
      <header className="sketch-bar">
        <button type="button" className="btn btn-primary" onClick={() => go(`/board/${board.id}`)}>
          Done
        </button>
        <div className="sketch-nav">
          <button type="button" className="icon-btn" aria-label="Previous panel" disabled={!previous} onClick={() => previous && go(`/board/${board.id}/sketch/${previous.id}`)}>
            <IconBack />
          </button>
          <span className="sketch-position">{`Panel ${index + 1} of ${panels.length}`}</span>
          <button type="button" className="icon-btn" aria-label="Next panel" disabled={!next} onClick={() => next && go(`/board/${board.id}/sketch/${next.id}`)}>
            <IconForward />
          </button>
        </div>
        <div className="toolbar-group">
          <button type="button" className="icon-btn" aria-label="Undo" disabled={draft.past.length === 0} onClick={() => setDraft(undo)}>
            <IconUndo />
          </button>
          <button type="button" className="icon-btn" aria-label="Redo" disabled={draft.future.length === 0} onClick={() => setDraft(redo)}>
            <IconRedo />
          </button>
        </div>
      </header>

      <div className="sketch-stage">
        <svg
          ref={svg}
          className="sketch-canvas"
          role="img"
          aria-label="Sketch canvas"
          data-tool={tool.startsWith('stamp:') ? 'stamp' : tool}
          viewBox={`${view.x} ${view.y} ${vbWidth} ${vbHeight}`}
          style={{ aspectRatio: `${size.width} / ${size.height}` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endPointer(e, false)}
          onPointerCancel={(e) => endPointer(e, true)}
          onWheel={(e) => zoomAround(e.clientX, e.clientY, viewRef.current.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15))}
          onContextMenu={(e) => e.preventDefault()}
        >
          <rect className="sketch-paper" width={size.width} height={size.height} />
          {shown.strokes.map((stroke, i) => (
            <StrokePath key={i} stroke={stroke} />
          ))}
          {shown.stamps.map((stamp) => (
            <StampView key={stamp.id} stamp={stamp} />
          ))}
          {live && <path d={strokeToPath(live)} fill={live.color} />}
          {guide && (
            <path
              data-testid="thirds-guide"
              className="thirds-guide"
              vectorEffect="non-scaling-stroke"
              d={`M${size.width / 3} 0V${size.height}M${(2 * size.width) / 3} 0V${size.height}M0 ${size.height / 3}H${size.width}M0 ${(2 * size.height) / 3}H${size.width}`}
            />
          )}
          {selected && tool === 'select' && (
            <g className="stamp-selection">
              <rect
                x={-STAMP_HALF}
                y={-STAMP_HALF}
                width={STAMP_HALF * 2}
                height={STAMP_HALF * 2}
                vectorEffect="non-scaling-stroke"
                transform={`translate(${selected.x} ${selected.y}) rotate(${selected.rotation}) scale(${selected.scale})`}
              />
              {handle && <circle cx={handle.x} cy={handle.y} r={22 / view.scale} vectorEffect="non-scaling-stroke" />}
            </g>
          )}
        </svg>
        {view.scale > 1 && (
          <button type="button" className="btn zoom-reset" onClick={() => setView({ x: 0, y: 0, scale: 1 })}>
            Fit to screen
          </button>
        )}
      </div>

      <div className="sketch-tools" role="toolbar" aria-label="Drawing tools">
        <div className="tool-group">
          <button type="button" className="tool-btn" aria-label="Pen" aria-pressed={tool === 'pen'} onClick={() => setTool('pen')}>
            <IconPen />
          </button>
          <button type="button" className="tool-btn" aria-label="Eraser" aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')}>
            <IconEraser />
          </button>
          <button type="button" className="tool-btn" aria-label="Select" aria-pressed={tool === 'select'} onClick={() => setTool('select')}>
            <IconSelect />
          </button>
        </div>
        <div className="tool-group" role="group" aria-label="Line width">
          {PEN_WIDTHS.map((w) => (
            <button key={w.name} type="button" className="tool-btn" aria-label={w.name} aria-pressed={width === w.value} onClick={() => { setWidth(w.value); setTool('pen'); }}>
              <span className="width-dot" style={{ width: 4 + w.value * 0.7, height: 4 + w.value * 0.7 }} />
            </button>
          ))}
        </div>
        <div className="tool-group" role="group" aria-label="Colour">
          {PEN_COLORS.map((c) => (
            <button key={c.name} type="button" className="tool-btn" aria-label={c.name} aria-pressed={color === c.value} onClick={() => { setColor(c.value); setTool('pen'); }}>
              <span className="swatch" style={{ background: c.value }} />
            </button>
          ))}
        </div>
        <div className="tool-group" role="group" aria-label="Stamps">
          {STAMP_KINDS.map((kind) => (
            <button key={kind} type="button" className="tool-btn" aria-label={STAMPS[kind].label} title={STAMPS[kind].label} aria-pressed={tool === `stamp:${kind}`} onClick={() => setTool(`stamp:${kind}`)}>
              <svg className="stamp-icon" viewBox="-160 -160 320 320" aria-hidden="true">
                <StampArt kind={kind} />
              </svg>
            </button>
          ))}
        </div>
        <div className="tool-group">
          <button type="button" className="tool-btn" aria-label="Thirds guide" title="Rule-of-thirds guide" aria-pressed={guide} onClick={() => setGuide((g) => !g)}>
            <IconGrid />
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-text"
            disabled={!previous}
            title="Copy the sketch from the panel before"
            onClick={() => (isSketchEmpty(draft.present) ? copyPrevious() : setConfirm('copy'))}
          >
            <IconCopy />
            <span>Copy previous</span>
          </button>
          {selected && tool === 'select' && (
            <button
              type="button"
              className="tool-btn tool-btn-text"
              onClick={() => {
                commitDraft({ ...draft.present, stamps: draft.present.stamps.filter((s) => s.id !== selected.id) });
                setSelectedId(null);
              }}
            >
              <IconTrash />
              <span>Delete stamp</span>
            </button>
          )}
          <button type="button" className="tool-btn tool-btn-text" disabled={isSketchEmpty(draft.present)} onClick={() => setConfirm('clear')}>
            <span>Clear</span>
          </button>
        </div>
      </div>

      {confirm === 'clear' && (
        <Confirm
          title="Clear this sketch?"
          message="Every line and stamp on this panel will be removed. Undo brings it back while you stay on this screen."
          confirmLabel="Clear"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            setSelectedId(null);
            commitDraft({ format: board.format, strokes: [], stamps: [] });
          }}
        />
      )}
      {confirm === 'copy' && (
        <Confirm
          title="Replace this sketch?"
          message="The sketch from the panel before will replace what is drawn here."
          confirmLabel="Replace"
          onCancel={() => setConfirm(null)}
          onConfirm={copyPrevious}
        />
      )}
    </main>
  );
}
