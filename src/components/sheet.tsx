'use client';

import { useEffect } from 'react';

/**
 * Bottom sheet on mobile, centred card on desktop. `dock` = the session editor, which docks
 * to the right on desktop. `wide` widens it for the builder.
 */
export function Sheet({
  onClose,
  children,
  label,
  dock,
  width = 460,
  z = 30,
  gap = 16,
}: {
  onClose: () => void;
  children: React.ReactNode;
  label: string;
  dock?: boolean;
  width?: number;
  z?: number;
  gap?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={dock ? 'sheet-bg dock' : 'sheet-bg'} style={{ zIndex: z }} onClick={onClose}>
      <div
        className={dock ? 'sheet tall' : 'sheet'}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{ maxWidth: width, gap }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function SheetHead({ title, sub, onClose }: { title: React.ReactNode; sub?: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 22, fontWeight: 700 }}>{title}</span>
        {sub && <span style={{ fontSize: 14, color: 'var(--muted)' }}>{sub}</span>}
      </span>
      <CloseBtn onClick={onClose} />
    </div>
  );
}

export function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button className="x-btn" onClick={onClick} aria-label="Lukk">
      ×
    </button>
  );
}

/** Pill chips where one is selected (ink-filled). */
export function Chips<T extends string | number>({
  options,
  value,
  onPick,
  label = (o) => String(o),
  off = 'var(--row)',
  small,
}: {
  options: readonly T[];
  value: T | null | undefined;
  onPick: (v: T) => void;
  label?: (o: T) => string;
  off?: string;
  small?: boolean;
}) {
  return (
    <>
      {options.map((o) => {
        const on = o === value;
        return (
          <button
            key={String(o)}
            className={small ? 'chip sm' : 'chip'}
            aria-pressed={on}
            onClick={() => onPick(o)}
            style={{ background: on ? 'var(--ink)' : off, color: on ? 'var(--bg)' : 'var(--ink)' }}
          >
            {label(o)}
          </button>
        );
      })}
    </>
  );
}

export function SportIcon({ icon, color, size = 16, style }: { icon: string; color: string; size?: number; style?: React.CSSProperties }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, flexShrink: 0, background: color, WebkitMask: icon, mask: icon, display: 'inline-block', ...style }}
    />
  );
}
