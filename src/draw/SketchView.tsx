import { memo } from 'react';
import { canvasSize, type Format, type Sketch } from '../model/types';
import { StampView } from './stamps';
import { strokeToPath } from './strokePath';

/** Read-only sketch. A sketch drawn in another format is fitted inside and letterboxed. */
export const SketchView = memo(function SketchView({
  sketch,
  format,
  className,
}: {
  sketch: Sketch;
  format: Format;
  className?: string;
}) {
  const frame = canvasSize(format);
  const own = canvasSize(sketch.format);
  const sameFormat = sketch.format === format;
  return (
    <svg
      className={className ? `sketch-view ${className}` : 'sketch-view'}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
      data-format={format}
      aria-hidden="true"
      focusable="false"
    >
      <rect className="sketch-paper" width={frame.width} height={frame.height} />
      <svg
        x={0}
        y={0}
        width={frame.width}
        height={frame.height}
        viewBox={`0 0 ${own.width} ${own.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {!sameFormat && <rect className="sketch-letterbox" width={own.width} height={own.height} />}
        {sketch.strokes.map((stroke, i) => (
          <path key={i} d={strokeToPath(stroke)} fill={stroke.color} />
        ))}
        {sketch.stamps.map((stamp) => (
          <StampView key={stamp.id} stamp={stamp} />
        ))}
      </svg>
    </svg>
  );
});
