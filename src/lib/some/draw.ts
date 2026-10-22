// Share card for Instagram/TikTok stories (prototype: drawLogo + drawCard). Pure canvas, no network.

export type Bg = 'night' | 'cream' | 'navy' | 'none';
export type Stat = { label: string; val: string; unit: string };
export type Card = { title: string; sub: string; stats: Stat[]; days: string; bg: Bg };

const TXT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Inter, system-ui, sans-serif';
const NUM = 'ui-rounded, "SF Pro Rounded", -apple-system, system-ui, sans-serif';

function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
}

function spaced(c: CanvasRenderingContext2D, txt: string, x: number, y: number, sp: number) {
  const ch = [...txt];
  const ws = ch.map((k) => c.measureText(k).width);
  const tot = ws.reduce((a, b) => a + b, 0) + sp * (ch.length - 1);
  let cx = x - tot / 2;
  const al = c.textAlign;
  c.textAlign = 'left';
  ch.forEach((k, i) => {
    c.fillText(k, cx, y);
    cx += ws[i] + sp;
  });
  c.textAlign = al;
}

/** The app logo: three athletes on stepped bars (120 × 64 units). */
export function drawLogo(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const circ = (cx: number, cy: number, r: number, col: string) => {
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fillStyle = col;
    c.fill();
  };
  const st = (d: string, w: number, col: string) => {
    c.lineWidth = w;
    c.strokeStyle = col;
    c.stroke(new Path2D(d));
  };
  c.save();
  c.translate(x, y + 2 * s);
  c.scale(s, s);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // swim
  c.fillStyle = '#19B2F5';
  rr(c, 0, 62, 120, 8, 1.5);
  c.fill();
  st('M3 57.5q3.5-3 7 0t7 0t7 0t7 0', 2.8, '#19B2F5');
  st('M8 52 L15 43 L29 40', 4.6, '#19B2F5');
  circ(25, 49, 4.6, '#19B2F5');
  // bike
  const y2 = '#FFC20E';
  c.fillStyle = y2;
  rr(c, 38, 44, 82, 8, 1.5);
  c.fill();
  c.lineWidth = 2.8;
  c.strokeStyle = y2;
  c.beginPath();
  c.arc(48, 36.5, 6.8, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.arc(68, 36.5, 6.8, 0, Math.PI * 2);
  c.stroke();
  st('M48 36.5 L56 27.5 L68 36.5 M56 27.5 L62.5 27.5', 2.4, y2);
  st('M57 28 L60.5 19.5 L67.5 22.5', 4.6, y2);
  circ(65.5, 13.5, 3.8, y2);
  // run
  const r2 = '#FF3B30';
  c.fillStyle = r2;
  rr(c, 76, 26, 44, 8, 1.5);
  c.fill();
  st('M97 9.5 L93 17.5', 4.8, r2);
  st('M93 17.5 L86 20.5 L82 19.5 M93 17.5 L99 21.5 L101 25.5', 3.6, r2);
  st('M96 11.5 L103 13.5 M96 11.5 L90 14.5', 3, r2);
  circ(99, 4, 3.8, r2);
  c.restore();
}

const THEME: Record<Bg, { ink: string; mute: string }> = {
  night: { ink: '#FFFFFF', mute: 'rgba(255,255,255,.62)' },
  cream: { ink: '#1B2A33', mute: 'rgba(27,42,51,.6)' },
  navy: { ink: '#F2EEE6', mute: 'rgba(242,238,230,.62)' },
  none: { ink: '#FFFFFF', mute: 'rgba(255,255,255,.8)' },
};

export function drawCard(c: CanvasRenderingContext2D, W: number, H: number, o: Card, slab: string) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, H);
  const th = THEME[o.bg];
  if (o.bg === 'night') {
    const g = c.createLinearGradient(0, 0, W * 0.3, H);
    g.addColorStop(0, '#0A1A2B');
    g.addColorStop(0.55, '#0D3442');
    g.addColorStop(1, '#071C26');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      c.strokeStyle = `rgba(46,212,191,${0.05 + i * 0.012})`;
      c.beginPath();
      const yb = H * 0.6 + i * (H / 24);
      for (let x = 0; x <= W; x += 24) {
        const yy = yb + Math.sin(x / 190 + i * 0.9) * (16 + i * 3);
        if (x) c.lineTo(x, yy);
        else c.moveTo(x, yy);
      }
      c.stroke();
    }
  } else if (o.bg === 'cream' || o.bg === 'navy') {
    c.fillStyle = o.bg === 'cream' ? '#F2EEE6' : '#16232D';
    c.fillRect(0, 0, W, H);
  }
  if (o.bg === 'none') {
    c.shadowColor = 'rgba(0,0,0,.45)';
    c.shadowBlur = 18;
  }
  const k = H / 1920; // story = 1, post (1350) is tighter
  c.textAlign = 'center';
  c.fillStyle = th.ink;
  c.font = `800 ${Math.round(64 * k)}px ${TXT}`;
  spaced(c, 'IRONMAN', W / 2, 180 * k, 20 * k);
  const ls = 6 * k;
  drawLogo(c, (W - 120 * ls) / 2, 240 * k, ls);

  let y = 760 * k;
  if (o.title) {
    c.fillStyle = th.ink;
    c.font = `700 ${Math.round(56 * k)}px ${TXT}`;
    c.fillText(o.title, W / 2, y, W - 140);
    y += 60 * k;
  }
  if (o.sub) {
    c.fillStyle = th.mute;
    c.font = `500 ${Math.round(34 * k)}px ${TXT}`;
    c.fillText(o.sub, W / 2, y, W - 140);
  }
  y += 90 * k;

  const bottom = H - (o.days ? 300 : 200) * k;
  const st = o.stats;
  const n = st.length;
  const rows = Math.ceil(n / 2);
  const rowH = rows ? Math.min(200 * k, (bottom - y) / rows) : 0;
  const sc = rowH / 200;
  st.forEach((s, i) => {
    const r = Math.floor(i / 2);
    const col = i % 2;
    const lastOdd = n % 2 === 1 && i === n - 1;
    const cx = lastOdd ? W / 2 : col ? W * 0.73 : W * 0.27;
    const cy = y + r * rowH;
    c.font = `700 ${Math.round(96 * sc)}px ${NUM}`;
    const vw = c.measureText(s.val).width;
    c.font = `600 ${Math.round(38 * sc)}px ${TXT}`;
    const uw = s.unit ? c.measureText(' ' + s.unit).width : 0;
    const sx = cx - (vw + uw) / 2;
    c.textAlign = 'left';
    c.fillStyle = th.ink;
    c.font = `700 ${Math.round(96 * sc)}px ${NUM}`;
    c.fillText(s.val, sx, cy + 96 * sc);
    if (s.unit) {
      c.font = `600 ${Math.round(38 * sc)}px ${TXT}`;
      c.fillStyle = th.mute;
      c.fillText(' ' + s.unit, sx + vw, cy + 96 * sc);
    }
    c.textAlign = 'center';
    c.fillStyle = th.mute;
    c.font = `600 ${Math.round(26 * sc)}px ${TXT}`;
    spaced(c, s.label.toUpperCase(), cx, cy + 96 * sc + 50 * sc, 4 * sc);
  });

  if (o.days) {
    c.textAlign = 'center';
    c.fillStyle = th.ink;
    c.font = `700 ${Math.round(46 * k)}px ${TXT}`;
    c.fillText(o.days, W / 2, H - 190 * k);
  }
  c.fillStyle = th.mute;
  c.font = `400 ${Math.round(34 * k)}px ${slab}`;
  c.fillText('You are an Ironman.', W / 2, H - 110 * k);
  c.shadowBlur = 0;
}

export function renderPng(W: number, H: number, o: Card, slab: string): Promise<Blob | null> {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  drawCard(cv.getContext('2d')!, W, H, o, slab);
  return new Promise((r) => cv.toBlob(r, 'image/png'));
}
