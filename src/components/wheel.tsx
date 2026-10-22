'use client';

import { Component, createRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';

const WH = 220;
const IH = 44;

type Props = {
  values: number[];
  value: number | null | undefined;
  onChange?: (v: number) => void;
  format?: (v: number) => string;
  unit?: string;
  h?: number;
};
type Drag = { y: number; p: number; moved: boolean; hist: [number, number][] };

/**
 * iOS-style wheel picker, ported 1:1 from the prototype's `Wheel` class:
 * momentum on touch drag, mouse drag, trackpad/mouse wheel, arrow keys, ease-out-cubic snap over 220 ms.
 */
export class Wheel extends Component<Props, { pos: number }> {
  ref = createRef<HTMLDivElement>();
  v = 0;
  raf = 0;
  wt: ReturnType<typeof setTimeout> | undefined;
  drag: Drag | null = null;
  anim = false;

  constructor(p: Props) {
    super(p);
    this.state = { pos: this.idxOf(p.value) };
  }

  idxOf(v: number | null | undefined) {
    const a = this.props.values;
    if (v == null) return 0;
    let b = 0;
    let bd = Infinity;
    for (let i = 0; i < a.length; i++) {
      const d = Math.abs(a[i] - v);
      if (d < bd) {
        bd = d;
        b = i;
      }
    }
    return b;
  }

  componentDidMount() {
    this.ref.current?.addEventListener('wheel', this.onWheel, { passive: false });
  }
  componentWillUnmount() {
    this.ref.current?.removeEventListener('wheel', this.onWheel);
    cancelAnimationFrame(this.raf);
    clearTimeout(this.wt);
  }
  componentDidUpdate(pp: Props) {
    if (pp.value !== this.props.value && !this.drag && !this.anim) {
      const i = this.idxOf(this.props.value);
      if (i !== Math.round(this.state.pos)) this.setState({ pos: i });
    }
  }

  clamp(p: number) {
    return Math.max(0, Math.min(this.props.values.length - 1, p));
  }
  emit(i: number) {
    const v = this.props.values[i];
    if (v !== this.props.value) this.props.onChange?.(v);
  }
  snapTo(i: number) {
    cancelAnimationFrame(this.raf);
    i = Math.round(this.clamp(i));
    const a = this.state.pos;
    const t0 = performance.now();
    this.anim = true;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 220);
      const e = 1 - Math.pow(1 - k, 3);
      this.setState({ pos: a + (i - a) * e });
      if (k < 1) this.raf = requestAnimationFrame(step);
      else {
        this.anim = false;
        this.emit(i);
      }
    };
    this.raf = requestAnimationFrame(step);
  }
  momentum() {
    cancelAnimationFrame(this.raf);
    this.anim = true;
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(40, t - last);
      last = t;
      let p = this.state.pos + this.v * dt;
      this.v *= Math.pow(0.996, dt);
      const n = this.props.values.length - 1;
      if (p <= 0 || p >= n) {
        p = this.clamp(p);
        this.v = 0;
      }
      this.setState({ pos: p });
      if (Math.abs(this.v) > 0.002) this.raf = requestAnimationFrame(step);
      else this.snapTo(Math.round(p));
    };
    this.raf = requestAnimationFrame(step);
  }

  onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button) return;
    cancelAnimationFrame(this.raf);
    this.anim = false;
    this.drag = { y: e.clientY, p: this.state.pos, moved: false, hist: [[performance.now(), e.clientY]] };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };
  onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = this.drag;
    if (!d) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 3) d.moved = true;
    this.setState({ pos: this.clamp(d.p - dy / IH) });
    const now = performance.now();
    d.hist.push([now, e.clientY]);
    d.hist = d.hist.filter((x) => now - x[0] < 100);
  };
  onUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    if (!d.moved) {
      const r = this.ref.current!.getBoundingClientRect();
      this.snapTo(Math.round(this.state.pos + (e.clientY - r.top - (this.props.h || WH) / 2) / IH));
      return;
    }
    const h = d.hist;
    const a = h[0];
    const b = h[h.length - 1];
    const dt = b && a ? b[0] - a[0] : 0;
    this.v = dt > 0 ? -(b[1] - a[1]) / dt / IH : 0;
    if (Math.abs(this.v) > 0.004) this.momentum();
    else this.snapTo(Math.round(this.state.pos));
  };
  onWheel = (e: WheelEvent) => {
    e.preventDefault();
    cancelAnimationFrame(this.raf);
    this.anim = false;
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    this.setState((s) => ({ pos: this.clamp(s.pos + (dy / IH) * 0.5) }));
    clearTimeout(this.wt);
    this.wt = setTimeout(() => this.snapTo(Math.round(this.state.pos)), 120);
  };
  onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.snapTo(Math.round(this.state.pos) - 1);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.snapTo(Math.round(this.state.pos) + 1);
    }
  };

  render() {
    const { values, format, unit } = this.props;
    const H = this.props.h || WH;
    const pos = this.state.pos;
    const c = Math.round(pos);
    const items = [];
    for (let i = c - 4; i <= c + 4; i++) {
      if (i < 0 || i >= values.length) continue;
      const d = i - pos;
      const ad = Math.abs(d);
      const near = Math.min(ad, 1);
      const style: CSSProperties = {
        position: 'absolute', left: 0, right: 0, top: H / 2 - IH / 2, height: IH, display: 'flex', alignItems: 'center',
        justifyContent: 'center', transform: `translateY(${d * IH * 0.94}px) rotateX(${-d * 15}deg)`, opacity: Math.max(0, 1 - ad * 0.24),
        fontFamily: 'var(--num)', fontSize: 30 - near * 7, fontWeight: ad < 0.5 ? 700 : 500, color: ad < 0.5 ? 'var(--ink)' : 'var(--muted)',
        pointerEvents: 'none', fontVariantNumeric: 'tabular-nums',
      };
      items.push(
        <div key={i} style={style}>
          {format ? format(values[i]) : String(values[i])}
        </div>,
      );
    }
    const mask = 'linear-gradient(transparent,#000 28%,#000 72%,transparent)';
    return (
      <div
        ref={this.ref}
        tabIndex={0}
        role="slider"
        aria-valuenow={values[c]}
        aria-valuetext={format ? format(values[c]) : String(values[c])}
        onPointerDown={this.onDown}
        onPointerMove={this.onMove}
        onPointerUp={this.onUp}
        onPointerCancel={this.onUp}
        onKeyDown={this.onKey}
        style={{
          position: 'relative', height: H, touchAction: 'none', cursor: 'grab', userSelect: 'none', outline: 'none',
          perspective: '600px', overflow: 'hidden', WebkitMaskImage: mask, maskImage: mask,
        }}
      >
        <div style={{ position: 'absolute', left: 0, right: 0, top: H / 2 - IH / 2, height: IH, borderRadius: 12, background: 'var(--card2)' }} />
        {items}
        {unit ? (
          <div
            style={{
              position: 'absolute', right: 14, top: H / 2 - IH / 2, height: IH, display: 'flex', alignItems: 'center',
              fontSize: 14, fontWeight: 600, color: 'var(--muted)', pointerEvents: 'none',
            }}
          >
            {unit}
          </div>
        ) : null}
      </div>
    );
  }
}
