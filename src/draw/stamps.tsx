import type { ReactNode } from 'react';
import type { Stamp, StampKind } from '../model/types';

/** Stamp artwork, drawn in a box from -150 to 150 on both axes. */
export const STAMPS: Record<StampKind, { label: string; render: () => ReactNode }> = {
  figure: {
    label: 'Stick figure',
    render: () => (
      <>
        <circle cx="0" cy="-98" r="30" />
        <path d="M0 -68V28M-58 -26H58M0 28L-46 128M0 28L46 128" />
      </>
    ),
  },
  bust: {
    label: 'Head and shoulders',
    render: () => (
      <>
        <circle cx="0" cy="-52" r="56" />
        <path d="M-128 140C-128 52 -72 24 0 24C72 24 128 52 128 140" />
      </>
    ),
  },
  camera: {
    label: 'Camera',
    render: () => (
      <>
        <rect x="-120" y="-58" width="160" height="116" rx="16" />
        <path d="M40 -22L120 -62V62L40 22" />
        <circle cx="-76" cy="-86" r="22" />
        <circle cx="-14" cy="-90" r="28" />
      </>
    ),
  },
  arrow: {
    label: 'Arrow',
    render: () => <path d="M-125 0H125M72 -48L125 0L72 48" />,
  },
  curvedArrow: {
    label: 'Curved arrow',
    render: () => <path d="M-115 70C-70 -85 70 -85 112 40M52 30L112 40L128 -20" />,
  },
  frame: {
    label: 'Frame',
    render: () => <rect x="-135" y="-135" width="270" height="270" rx="4" />,
  },
};

export const STAMP_KINDS = Object.keys(STAMPS) as StampKind[];

export function StampArt({ kind }: { kind: StampKind }) {
  return (
    <g fill="none" stroke="#111111" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
      {STAMPS[kind].render()}
    </g>
  );
}

export function StampView({ stamp }: { stamp: Stamp }) {
  return (
    <g data-stamp={stamp.kind} transform={`translate(${stamp.x} ${stamp.y}) rotate(${stamp.rotation}) scale(${stamp.scale})`}>
      <StampArt kind={stamp.kind} />
    </g>
  );
}
