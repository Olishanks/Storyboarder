import type { ReactNode } from 'react';

function Icon({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconBack = () => (
  <Icon>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);
export const IconForward = () => (
  <Icon>
    <path d="M9 5l7 7-7 7" />
  </Icon>
);
export const IconPlus = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const IconMinus = () => (
  <Icon>
    <path d="M5 12h14" />
  </Icon>
);
export const IconUndo = () => (
  <Icon>
    <path d="M8 6L4 10l4 4" />
    <path d="M4 10h10a6 6 0 010 12h-3" transform="translate(0 -3)" />
  </Icon>
);
export const IconRedo = () => (
  <Icon>
    <path d="M16 6l4 4-4 4" />
    <path d="M20 10H10a6 6 0 000 12h3" transform="translate(0 -3)" />
  </Icon>
);
export const IconPlay = () => (
  <Icon>
    <path d="M7 4.5v15l12-7.5z" />
  </Icon>
);
export const IconPause = () => (
  <Icon>
    <path d="M8 5v14M16 5v14" />
  </Icon>
);
export const IconCamera = () => (
  <Icon>
    <rect x="3" y="7" width="13" height="10" rx="2" />
    <path d="M16 10.5l5-3v9l-5-3" />
  </Icon>
);
export const IconDownload = () => (
  <Icon>
    <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
  </Icon>
);
export const IconUpload = () => (
  <Icon>
    <path d="M12 16V5M7 9l5-5 5 5M5 20h14" />
  </Icon>
);
export const IconPrint = () => (
  <Icon>
    <path d="M7 9V4h10v5" />
    <rect x="4" y="9" width="16" height="8" rx="2" />
    <path d="M7 14h10v6H7z" />
  </Icon>
);
export const IconSettings = () => (
  <Icon>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Icon>
);
export const IconGrip = () => (
  <Icon>
    <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth="2.5" />
  </Icon>
);
export const IconMore = () => (
  <Icon>
    <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth="2.5" />
  </Icon>
);
export const IconChevronDown = () => (
  <Icon>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);
export const IconChevronRight = () => (
  <Icon>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);
export const IconTrash = () => (
  <Icon>
    <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />
  </Icon>
);
export const IconCopy = () => (
  <Icon>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
  </Icon>
);
export const IconScript = () => (
  <Icon>
    <path d="M6 3h9l4 4v14H6z" />
    <path d="M9 11h7M9 15h7M9 7h3" />
  </Icon>
);
export const IconSection = () => (
  <Icon>
    <path d="M4 6h16M4 12h10M4 18h16" />
  </Icon>
);
export const IconPen = () => (
  <Icon>
    <path d="M4 20l1-5L16 4l4 4L9 19z" />
    <path d="M14 6l4 4" />
  </Icon>
);
export const IconEraser = () => (
  <Icon>
    <path d="M8 19l-4-4L14 5l6 6-8 8z" />
    <path d="M10 9l6 6M8 19h12" />
  </Icon>
);
export const IconSelect = () => (
  <Icon>
    <path d="M6 4l12 8-5 1.5L10 19z" />
  </Icon>
);
export const IconGrid = () => (
  <Icon>
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <path d="M9.33 4v16M14.67 4v16M4 9.33h16M4 14.67h16" />
  </Icon>
);
export const IconClose = () => (
  <Icon>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);
export const IconCheck = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);
export const IconClock = () => (
  <Icon>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l3 2" />
  </Icon>
);
