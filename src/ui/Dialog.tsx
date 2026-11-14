import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
  title: string;
  onClose(): void;
  children: ReactNode;
  wide?: boolean;
}

/** A focused task that needs protected attention: creating, confirming, pasting a script. */
export function Dialog({ title, onClose, children, wide }: DialogProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, select, button');
    first?.focus();
    return () => previous?.focus?.();
  }, []);

  return (
    <div
      className="dialog-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className={wide ? 'dialog dialog-wide' : 'dialog'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

interface ConfirmProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm(): void;
  onCancel(): void;
}

export function Confirm({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Dialog title={title} onClose={onCancel}>
      <p className="dialog-message">{message}</p>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
