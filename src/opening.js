/**
 * Cutscene de abertura — substitui a tela de título.
 * Lógica em 320×180, igual ao jogo. O protótipo desenhava em 1280×720;
 * fonte e sombra usam essa escala (÷4) pra ocupar o mesmo lugar na tela.
 */
import { PAL, SPR } from "./sprites.js";

const FONT = '"Pixelify Sans","Press Start 2P",monospace';
const FS = 4;
const EXTRA = { M: "#9a8f96", m: "#6e6470", p: "#f29bb0" };

const RAT = [
  "...........KKKKKKKKKK...........",
  "...........KnnnnnnnnK...........",
  "...........KnnnnnnnnK...........",
  "...........KnnnnnnnnK...........",
  "...........KRRRRRRRRK...........",
  "........KKKKKKKKKKKKKKKK........",
  "...KKKK.KMMMMMMMMMMMMMMK.KKKK...",
  "..KppppKMMMMMMMMMMMMMMMMKppppK..",
  "..KppppKMKKKMMMMMMMMKKKMKppppK..",
  "...KpppKMMWKKMMMMMMKKWMMKpppK...",
  "....KKKKMMKKKMMMMMMKKKMMKKKK....",
  ".......KMMMMMMMMMMMMMMMMK.......",
  "........KMMMMMMMMMMMMMMK........",
  ".....K..KmMMMMMMMMMMMMmK..K.....",
  "......K..KmMMMMMMMMMMmK..K......",
  "...KKKKK..KmMMMMMMMMmK..KKKKK...",
  "...........KmMMppMMmK...........",
  "....KKK....KmMMppMMmK....KKK....",
  "............KMMKKMMK............",
  "............KWWWWWWK......KKKK..",
  ".............KWKKWK......KsGGsK.",
  ".........KKKKKKKKKKKKKK..KGGGGGK",
  ".......KKNNNNNWRRWNNNNNKKKGRRRGK",
  "......KNNNNNNNWRRWNNNNNNNKGRWRGK",
  ".....KNNNNNNNNWRRWNNNNNNNKGRRRGK",
  "....KKNNNNNNNNNRRNNNNNNNNKGGGGGK",
  "...KpKNNYYYYYYYYYYYYYYYYNKsGGGsK",
  "..KpKKNNNNNNNNNNNNNNNNNNNKGGGGGK",
  ".KpK..NNNNNNNNNNNNNNNNNNNKGGGGGK",
  "KpK....KKNNNNNNNNNNNNNNKK.KKKKK.",
  "KpKK....KmmmK......KmmmK........",
  ".KppK...KKKKK......KKKKK........",
];

let ctx;
const cache = {};

const col = (ch) => EXTRA[ch] || PAL[ch];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
const hx2 = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
function mix(a, b, t) {
  t = clamp(t);
  const A = hx2(a);
  const B = hx2(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

function R(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function spr(gr, x, y, o = {}) {
  const s = o.s || 1;
  const w = Math.max(...gr.map((r) => r.length));
  for (let r = 0; r < gr.length; r++) {
    for (let i = 0; i < gr[r].length; i++) {
      const ch = gr[r][i];
      const color = (o.map && o.map[ch]) || col(ch);
      if (!color) continue;
      const xi = o.mirror ? w - 1 - i : i;
      R(x + xi * s, y + r * s, s, s, color);
    }
  }
}
function outline(gr, x, y, color, s = 1, mirror) {
  const h = gr.length;
  const w = Math.max(...gr.map((r) => r.length));
  const on = (i, r) => r >= 0 && r < h && i >= 0 && i < w && col((gr[r] || "")[mirror ? w - 1 - i : i]);
  for (let r = -1; r <= h; r++) {
    for (let i = -1; i <= w; i++) {
      if (on(i, r)) continue;
      if (on(i + 1, r) || on(i - 1, r) || on(i, r + 1) || on(i, r - 1)) R(x + i * s, y + r * s, s, s, color);
    }
  }
}
function disc(cx, cy, r, color) {
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy));
    R(cx - w, cy + dy, w * 2 + 1, 1, color);
  }
}
function txt(s, x, y, size, color, align = "center", shadow = PAL.K, bold = false) {
  const px = size / FS;
  ctx.font = `${bold ? "700 " : ""}${px}px ${FONT}`;
  ctx.textBaseline = "top";
  ctx.textAlign = align;
  const off = Math.max(4, size / 8) / FS;
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(s, x + off, y + off);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}
function alpha(a, fn) {
  ctx.save();
  ctx.globalAlpha = clamp(a);
  fn();
  ctx.restore();
}

function hero(base, pin, gray) {
  const key = base + pin + gray;
  if (cache[key]) return cache[key];
  const W = 22;
  const H = 28;
  const g = Array.from({ length: H }, () => Array(W).fill("."));
  const ln = (x0, y0, x1, y1, ch) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n);
      const y = Math.round(y0 + ((y1 - y0) * i) / n);
      if (g[y] && x >= 0 && x < W) g[y][x] = ch;
    }
  };
  ln(5, 6, 9, 19, "K");
  ln(6, 6, 10, 19, "D");
  const pg = SPR.pin[((pin % 8) + 8) % 8];
  const gm = { C: "s", W: "G", Y: "g" };
  pg.forEach((row, r) =>
    [...row].forEach((ch, i) => {
      if (col(ch)) g[r][i] = gray && gm[ch] ? gm[ch] : ch;
    }),
  );
  SPR.hero[base].forEach((row, r) =>
    [...row].forEach((ch, i) => {
      if (col(ch)) g[r + 8][i + 6] = ch;
    }),
  );
  return (cache[key] = g.map((r) => r.join("")));
}

function sky(top, bot, y0, y1, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = Math.floor(y0 + (i * (y1 - y0)) / n);
    const b = Math.floor(y0 + ((i + 1) * (y1 - y0)) / n);
    R(0, a, 320, b - a + 1, mix(top, bot, i / (n - 1)));
  }
}
function hills(color, base, amp, ph, per = 40) {
  for (let x = 0; x < 320; x++) {
    const h = Math.round((amp * (1 + Math.sin((x / per) * 2 + ph))) / 2 + amp * 0.3 * Math.sin(x / 9 + ph));
    R(x, base - h, 1, h + 40, color);
  }
}
function ground(gy) {
  for (let i = 0; i < 21; i++) {
    spr(SPR.grass.f1, i * 16, gy);
    spr(SPR.grass.dirt, i * 16, gy + 16);
    spr(SPR.grass.dirt, i * 16, gy + 32);
    spr(SPR.grass.dirt, i * 16, gy + 48);
  }
}
function sunRays(cx, cy, r, ang, ray = PAL.Y) {
  for (let i = 0; i < 10; i++) {
    const a = ang + (i * Math.PI) / 5;
    for (let k = r + 3; k < r + 3 + Math.round(r * 0.45); k++) {
      R(Math.round(cx + Math.cos(a) * k), Math.round(cy + Math.sin(a) * k), 1, 1, ray);
    }
  }
  disc(cx, cy, r + 1, PAL.y);
  disc(cx, cy, r, PAL.Y);
  disc(cx - Math.round(r / 3), cy - Math.round(r / 3), Math.max(1, Math.round(r / 2.6)), PAL.L);
}
function moon(cx, cy, r, bg) {
  disc(cx, cy, r, PAL.L);
  disc(cx + Math.round(r * 0.55), cy - Math.round(r * 0.35), r - 1, bg);
}
function stars(a, seed = 3, ymax = 100) {
  alpha(a, () => {
    let s = seed;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(rnd() * 320);
      const y = Math.floor(rnd() * ymax);
      R(x, y, 1, 1, PAL.W);
      if (i % 9 === 0) {
        R(x - 1, y, 3, 1, "#cfd8ff");
        R(x, y - 1, 1, 3, "#cfd8ff");
      }
    }
  });
}
function cloud(x, y, color = PAL.W, sh = PAL.G) {
  [[0, 0, 4], [5, -3, 5], [11, -1, 4], [15, 1, 3]].forEach(([a, b, r]) => disc(x + a, y + b + 1, r, sh));
  [[0, 0, 4], [5, -3, 5], [11, -1, 4], [15, 1, 3]].forEach(([a, b, r]) => disc(x + a, y + b, r, color));
}
function turbine(x, base, ht, ang, bl, tw = PAL.W, ed = PAL.K) {
  const top = base - ht;
  R(x - 2, top, 5, ht, ed);
  R(x - 1, top + 1, 3, ht - 1, tw);
  R(x - 1, top + 1, 1, ht - 1, PAL.G);
  for (let i = 0; i < 3; i++) {
    const a = ang + i * 2.0944;
    const ux = Math.sin(a);
    const uy = -Math.cos(a);
    for (let t = 0; t <= bl; t++) {
      const w = t < bl * 0.4 ? 1 : 0;
      R(Math.round(x + ux * t) - 1, Math.round(top + uy * t) - 1, 3 + w, 3 + w, ed);
    }
    for (let t = 1; t < bl; t++) {
      const w = t < bl * 0.4 ? 1 : 0;
      R(Math.round(x + ux * t), Math.round(top + uy * t), 1 + w, 1 + w, tw);
    }
  }
  disc(x, top, 2, ed);
  R(x, top, 1, 1, PAL.G);
}
function gear(cx, cy, r, ang) {
  for (let k = 0; k < 8; k++) {
    const a = ang + (k * Math.PI) / 4;
    R(Math.round(cx + Math.cos(a) * (r + 1)) - 1, Math.round(cy + Math.sin(a) * (r + 1)) - 1, 3, 3, PAL.K);
  }
  for (let k = 0; k < 8; k++) {
    const a = ang + (k * Math.PI) / 4;
    R(Math.round(cx + Math.cos(a) * (r + 1)), Math.round(cy + Math.sin(a) * (r + 1)), 1, 1, "#c9c9bf");
  }
  disc(cx, cy, r, PAL.K);
  disc(cx, cy, r - 1, "#c9c9bf");
  disc(cx, cy, Math.max(1, r - 4), "#9a9a90");
  disc(cx, cy, 1, PAL.K);
}
function hud(e, label = true) {
  R(4, 4, 50, 13, PAL.K);
  R(6, 10, 44, 5, PAL.W);
  R(7, 11, 42, 3, PAL.K);
  const n = Math.round(42 * clamp(e / 100));
  if (n) {
    R(7, 11, n, 3, e < 20 ? PAL.R : PAL.Y);
    R(7, 11, n, 1, e < 20 ? "#ff9a9a" : PAL.L);
  }
  if (label) txt("ENERGIA", 6, 4.6, 18, PAL.W, "left", null);
}
function spark(x, y) {
  R(x - 1, y, 3, 1, PAL.L);
  R(x, y - 1, 1, 3, PAL.L);
  R(x, y, 1, 1, PAL.W);
}

const GY = 118;
const HOUSES = [118, 156, 194];
function village(t, o) {
  const n = o.night || 0;
  const top = n < 0.5 ? mix("#6cc3ee", "#4a3f7a", n * 2) : mix("#4a3f7a", "#0e122a", (n - 0.5) * 2);
  const bot = n < 0.5 ? mix("#d6f1fb", "#ff9a5c", n * 2) : mix("#ff9a5c", "#2b2a5a", (n - 0.5) * 2);
  sky(top, bot, 0, GY, 12);
  if (n > 0.45) stars((n - 0.45) * 1.8);
  if (o.sun !== undefined) sunRays(48, o.sun, 9, t * 0.5);
  if (o.moon !== undefined) moon(262, o.moon, 7, mix(top, bot, clamp(o.moon / GY)));
  if (n < 0.6) {
    [[20, 22], [150, 14], [250, 30]].forEach(([x, y], i) => alpha(1 - n * 1.6, () => cloud(((x + t * 4 + i * 30) % 360) - 20, y)));
  }
  hills(mix("#a9d99a", "#262b52", n), GY, 16, 0.4, 46);
  turbine(292, GY + 1, 70, o.turb || 0, 22, mix("#fff8ea", "#8890ad", n));
  R(234, 88, 40, 31, PAL.K);
  R(235, 89, 38, 30, mix("#c98a5a", "#4a3a50", n));
  R(232, 84, 44, 6, PAL.K);
  R(233, 85, 42, 4, mix("#e04848", "#5a2a3a", n));
  R(240, 100, 10, 19, PAL.K);
  R(241, 101, 8, 18, mix("#6b4129", "#2a1f2a", n));
  gear(262, 103, 7, o.gear || 0);
  HOUSES.forEach((x) => spr(SPR.house.off, x, GY - 26, { s: 2 }));
  R(102, 78, 2, 41, PAL.K);
  R(99, 74, 8, 5, PAL.K);
  R(100, 75, 6, 3, o.lamp ? PAL.L : "#5d6178");
  ground(GY);
  if (n > 0) alpha(n * 0.55, () => R(0, 0, 320, 180, "#0b1030"));
  HOUSES.forEach((x, i) => {
    const on = o.win && o.win[i];
    if (!on) return;
    R(x + 8, GY - 12, 6, 6, PAL.K);
    R(x + 9, GY - 11, 4, 4, PAL.L);
    alpha(0.28, () => R(x + 4, GY - 16, 14, 14, PAL.Y));
    alpha(0.3, () => R(x + 6, GY, 10, 3, PAL.L));
  });
  if (o.lamp) {
    R(100, 75, 6, 3, PAL.L);
    alpha(0.22, () => {
      for (let k = 0; k < 40; k++) R(103 - k / 3, 79 + k, 1 + k / 1.5, 1, PAL.Y);
    });
  }
}

function bateriaMae(cx, cy, t) {
  const x = cx - 15;
  const y = cy - 21;
  R(x + 8, y - 12, 14, 5, PAL.K);
  [[x + 8, y - 16], [x + 13, y - 18], [x + 19, y - 16]].forEach(([a, b]) => R(a, b, 3, 6, PAL.K));
  R(x + 9, y - 11, 12, 3, PAL.Y);
  [[x + 9, y - 15], [x + 14, y - 17], [x + 20, y - 15]].forEach(([a, b]) => R(a, b, 1, 5, PAL.Y));
  R(x + 14, y - 10, 2, 1, PAL.R);
  R(x + 10, y - 6, 10, 6, PAL.K);
  R(x + 11, y - 5, 8, 5, "#c3c9d6");
  R(x, y, 30, 44, PAL.K);
  R(x + 1, y + 1, 28, 42, "#24304a");
  for (let i = 0; i < 3; i++) {
    const on = (t * 2 + i) % 3 < 2.4;
    R(x + 4, y + 4 + i * 13, 22, 11, on ? PAL.P : "#3f8a5a");
    R(x + 4, y + 4 + i * 13, 22, 2, on ? "#a8f5c2" : "#5fae7a");
  }
  const bolt = (pts, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fill();
  };
  bolt(
    [[x + 18, y + 6], [x + 9, y + 24], [x + 15, y + 24], [x + 11, y + 39], [x + 22, y + 18], [x + 16, y + 18], [x + 20, y + 6]],
    PAL.K,
  );
  bolt(
    [[x + 18, y + 8], [x + 11, y + 23], [x + 16, y + 23], [x + 13, y + 35], [x + 20, y + 19], [x + 15, y + 19], [x + 19, y + 8]],
    PAL.Y,
  );
}

function parse(s) {
  const out = [];
  let hl = false;
  for (const ch of s) {
    if (ch === "[") {
      hl = true;
      continue;
    }
    if (ch === "]") {
      hl = false;
      continue;
    }
    out.push({ ch, hl });
  }
  return out;
}
function wrap(chars, maxW, size) {
  ctx.font = `${size}px ${FONT}`;
  const lines = [[]];
  let word = [];
  const width = (a) => ctx.measureText(a.map((o) => o.ch).join("")).width;
  const flush = () => {
    const cur = lines[lines.length - 1];
    if (cur.length && width(cur.concat(word)) > maxW) lines.push(word.slice(word[0] && word[0].ch === " " ? 1 : 0));
    else lines[lines.length - 1] = cur.concat(word);
    word = [];
  };
  chars.forEach((o) => {
    if (o.ch === " ") {
      flush();
      word = [o];
    } else word.push(o);
  });
  flush();
  return lines;
}
function textbox(text, shown, done, t) {
  R(4, 141, 312, 36, PAL.K);
  R(5, 142, 310, 34, "#1b2242");
  R(6, 143, 308, 1, "#3d5088");
  const size = 27 / FS;
  const lines = wrap(parse(text), 1210 / FS, size);
  ctx.font = `${size}px ${FONT}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  let k = 0;
  lines.forEach((ln, li) => {
    let x = 12;
    ln.forEach((o) => {
      if (k < shown) {
        ctx.fillStyle = o.hl ? PAL.Y : "#fff8ea";
        ctx.fillText(o.ch, x, 146 + li * 8);
      }
      x += ctx.measureText(o.ch).width;
      k++;
    });
  });
  if (done && Math.floor(t * 2.5) % 2 === 0) {
    R(304, 169, 5, 1, PAL.Y);
    R(305, 170, 3, 1, PAL.Y);
    R(306, 171, 1, 1, PAL.Y);
  }
}

const SC = [
  {
    text: "Nosso herói [Zé Voltinho] nasceu com dois superpoderes: a [força do Sol] e a [força do Vento].",
    min: 7,
    draw(t) {
      sky("#ffcf8a", "#fff1c8", 0, 140, 12);
      hills("#b9e0a0", 128, 10, 1, 50);
      for (let i = 0; i < 21; i++) spr(SPR.grass.f1, i * 16, 128);
      const s1 = ease((t - 1) / 0.6);
      if (s1 > 0) {
        sunRays(56, 60, Math.round(16 * s1), t * 0.6);
        if (t > 1.6) txt("SOL", 56, 88, 34, PAL.Y, "center", PAL.K, true);
      }
      const s2 = ease((t - 2) / 0.6);
      if (s2 > 0) {
        alpha(s2, () => {
          [[232, 40], [244, 56], [230, 72]].forEach(([x, y], i) =>
            spr(SPR.wind[(Math.floor(t * 4) + i) % 2 ? "f1" : "f2"], x + Math.sin(t * 3 + i) * 3, y, { s: 3 }),
          );
        });
        if (t > 2.6) txt("VENTO", 256, 98, 34, PAL.C, "center", PAL.K, true);
      }
      const bob = Math.floor(t * 3) % 2;
      spr(hero("idle", Math.floor(t * 10), false), 127, 44 - bob, { s: 3 });
      const n = ease(t / 0.6);
      alpha(n, () => txt("ZÉ VOLTINHO", 160, 6, 64, PAL.Y, "center", PAL.K, true));
    },
  },
  {
    text: "Trabalha em sua vila durante o dia.",
    min: 5,
    draw(t) {
      village(t, { sun: 30, turb: t * 2.5, gear: 0 });
      const x = -10 + t * 20;
      spr(hero(Math.floor(t * 6) % 2 ? "run1" : "run2", Math.floor(t * 8), false), x, GY - 28 - (Math.floor(t * 6) % 2));
    },
  },
  {
    text: "O [Sol] brilha, o [Vento] sopra, ele está [cheio de energia].",
    min: 6,
    draw(t) {
      sky("#5fb8ea", "#d6f1fb", 0, 140, 12);
      sunRays(46, 36, 14, t * 0.8);
      hills("#a9d99a", 122, 14, 2, 40);
      for (let i = 0; i < 21; i++) {
        spr(SPR.grass.f1, i * 16, 122);
        spr(SPR.grass.dirt, i * 16, 138);
      }
      const hits = [0.9, 1.7, 2.5, 3.3];
      let e = 30;
      hits.forEach((h, i) => {
        const p = (t - (h - 1.0)) / 1.0;
        if (p > 0 && p < 1) spr(SPR.wind[Math.floor(t * 6) % 2 ? "f1" : "f2"], 330 - p * (330 - 160), 58 + ((i * 9) % 22) + Math.sin(t * 5 + i) * 2, { s: 2 });
        if (t > h) {
          e += 17.5;
          if (t < h + 0.7) txt("+ENERGIA", 172, 48 - (t - h) * 16, 22, PAL.Y, "left", PAL.K);
        }
      });
      for (let i = 0; i < 5; i++) {
        const r = 24 + ((t * 30 + i * 12) % 30);
        alpha(0.7, () => R(46 + Math.cos(0.5 + i * 0.18) * r * 2.2, 36 + Math.sin(0.5 + i * 0.18) * r * 1.6, 2, 2, PAL.L));
      }
      const full = e >= 99;
      const gr = hero("idle", Math.floor(t * (full ? 20 : 12)), false);
      if (full && Math.floor(t * 6) % 2 === 0) outline(gr, 118, 66, PAL.Y, 2);
      spr(gr, 118, 66, { s: 2 });
      hud(Math.min(100, e));
      if (full) txt("CHEIO!", 72, 5, 22, PAL.Y, "left", PAL.K, true);
    },
  },
  {
    text: "Consegue [iluminar as casas], [movimentar máquinas], fazer tudo funcionar.",
    min: 6.5,
    draw(t) {
      const times = [0.8, 1.5, 2.2, 2.9, 3.6];
      const targets = [[128, GY - 9], [166, GY - 9], [204, GY - 9], [262, 103], [103, 76]];
      const on = times.map((x) => t > x + 0.5);
      village(t, { sun: 30, turb: t * 2.5, gear: on[3] ? (t - 4.1) * 3 : 0, win: on.slice(0, 3), lamp: on[4] });
      const gr = hero("idle", Math.floor(t * 10), false);
      if (Math.floor(t * 6) % 2 === 0) outline(gr, 56, GY - 28, PAL.Y);
      spr(gr, 56, GY - 28);
      times.forEach((s, i) => {
        const p = (t - s) / 0.5;
        if (p > 0 && p < 1) {
          const [tx, ty] = targets[i];
          const sx = 74;
          const sy = GY - 22;
          const x = sx + (tx - sx) * p;
          const y = sy + (ty - sy) * p - Math.sin(Math.PI * p) * 26;
          spark(Math.round(x), Math.round(y));
          spark(Math.round(x - (tx - sx) * 0.06), Math.round(y + 3));
        }
      });
    },
  },
  {
    text: "Chega a noite.",
    min: 5,
    draw(t) {
      const n = ease(t / 3.5);
      const spin = Math.max(0, 1 - n * 1.15);
      village(t, {
        night: n,
        sun: 30 + n * 100,
        moon: 130 - ease((t - 1.2) / 2.8) * 100,
        turb: 2.5 * (t - t * t * n * 0.12),
        gear: t * 3 * spin,
        win: [1, 1, 1],
        lamp: true,
      });
      spr(hero("idle", Math.floor(t * 10 * spin), false), 56, GY - 28);
    },
  },
  {
    text: "As pessoas continuam precisando de eletricidade e sua [força diminui].",
    min: 6.5,
    draw(t) {
      const off = [1.4, 2.4, 3.4];
      const win = off.map((x) => !(t > x) && !(t > x - 0.5 && Math.floor(t * 10) % 2 === 0));
      village(t, { night: 1, moon: 30, turb: 0.4, gear: t < 2.6 ? t * 1.2 : 3.1, win, lamp: t < 4.0 });
      off.forEach((x, i) => {
        if (t > x + 0.2) txt("?", HOUSES[i] + 16, GY - 40 - Math.min(4, (t - x) * 12), 34, PAL.W, "center", PAL.K, true);
      });
      const e = Math.max(6, 100 - t * 24);
      const tired = e < 30;
      spr(hero(tired ? "tired" : "idle", 0, tired), 56, GY - 28 + (tired ? 1 : 0));
      hud(e);
    },
  },
  {
    text: "Para conseguir armazenar energia, ele precisa encontrar o grande tesouro: a [Bateria Mãe].",
    min: 7.5,
    draw(t) {
      sky("#0e122a", "#2b1f4a", 0, 140, 12);
      stars(1, 9, 120);
      const a = ease((t - 0.6) / 1);
      ctx.save();
      ctx.globalAlpha = a * 0.5;
      for (let i = 0; i < 12; i++) {
        const an = t * 0.35 + (i * Math.PI) / 6;
        ctx.fillStyle = i % 2 ? "#5fe08a" : "#ffd23f";
        ctx.beginPath();
        ctx.moveTo(210, 66);
        ctx.lineTo(210 + Math.cos(an) * 200, 66 + Math.sin(an) * 200);
        ctx.lineTo(210 + Math.cos(an + 0.18) * 200, 66 + Math.sin(an + 0.18) * 200);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      R(186, 104, 48, 8, PAL.K);
      R(187, 105, 46, 6, "#7d8297");
      R(180, 111, 60, 10, PAL.K);
      R(181, 112, 58, 8, "#9aa0b4");
      R(181, 112, 58, 1, "#c3c9d6");
      if (a > 0) {
        alpha(a, () => bateriaMae(210, 82, t));
        [[176, 40], [246, 52], [238, 92], [180, 90], [214, 22]].forEach(([x, y], i) => {
          if ((Math.floor(t * 4) + i) % 3) spark(x, y);
        });
      }
      if (t > 0.6 && t < 1.0) alpha((1.0 - t) * 2, () => R(0, 0, 320, 140, PAL.W));
      hills("#141a3a", 140, 18, 3, 30);
      spr(hero("tired", 0, true), 34, 112);
      [[56, 106, 1], [62, 100, 2], [70, 92, 3]].forEach(([x, y, r], i) => {
        if (t > 0.2 + i * 0.15) disc(x, y, r, "#c3c9d6");
      });
      if (t > 1.6) alpha(ease((t - 1.6) / 0.5), () => txt("A BATERIA MÃE", 210, 4, 40, PAL.Y, "center", PAL.K, true));
    },
  },
  {
    text: "Ele parte então em sua [aventura],",
    min: 5.5,
    draw(t) {
      sky("#f7a98a", "#bfe3f5", 0, 120, 12);
      sunRays(262, 92, 10, t * 0.4);
      ctx.fillStyle = "#6e7fa8";
      ctx.beginPath();
      ctx.moveTo(196, 120);
      ctx.lineTo(262, 48);
      ctx.lineTo(330, 120);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#8f9cc0";
      ctx.beginPath();
      ctx.moveTo(262, 48);
      ctx.lineTo(274, 62);
      ctx.lineTo(266, 60);
      ctx.lineTo(258, 66);
      ctx.lineTo(250, 62);
      ctx.closePath();
      ctx.fill();
      if (Math.floor(t * 3) % 2 === 0) spark(262, 44);
      disc(262, 46, 1, PAL.P);
      hills("#8fca78", 124, 12, 0.2, 36);
      [[14, 104], [34, 108]].forEach(([x, y]) => spr(SPR.house.on, x, y));
      for (let i = 0; i < 21; i++) {
        spr(SPR.grass.f1, i * 16, 124);
        spr(SPR.grass.dirt, i * 16, 140);
      }
      R(170, 104, 2, 20, PAL.K);
      R(156, 98, 34, 10, PAL.K);
      R(157, 99, 32, 8, "#c98a5a");
      R(186, 100, 4, 6, PAL.K);
      txt("BATERIA MÃE", 173, 99.6, 16, PAL.K, "center", null, true);
      const x = -20 + t * 44;
      const f = Math.floor(t * 8) % 2;
      spr(hero(f ? "run1" : "run2", Math.floor(t * 12), false), x, 124 - 28 - f);
    },
  },
  {
    text: "mas vai precisar enfrentar o famoso [Ratão do Gás] e seus capangas: os [Lobos Lobbistas].",
    min: 8,
    draw(t) {
      sky("#1a0b1f", "#5a1a2a", 0, 140, 12);
      const shake = t > 0.8 && t < 1.1 ? Math.round(Math.sin(t * 90) * 2) : 0;
      ctx.save();
      ctx.translate(shake, 0);
      alpha(0.25, () => {
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = "#ff6a3c";
          ctx.fillRect((i * 44 - ((t * 20) % 44)), 0, 10, 140);
        }
      });
      R(0, 128, 320, 12, "#2a0f1f");
      R(0, 127, 320, 1, "#7a2a3a");
      const ry = Math.min(32, -100 + ease(t / 0.8) * 132);
      spr(RAT, 112, ry, { s: 3 });
      if (t > 1) {
        for (let i = 0; i < 6; i++) {
          const p = (t * 0.7 + i / 6) % 1;
          alpha(1 - p, () => disc(Math.round(197 + p * 10 + Math.sin(p * 8 + i) * 3), Math.round(ry + 56 - p * 40), 1 + Math.round(p * 4), "#7a9a6a"));
        }
      }
      const wl = ease((t - 1.8) / 0.6);
      const wb = Math.floor(t * 3) % 2;
      if (wl > 0) {
        spr(SPR.wolf.run1, -40 + wl * 66, 88 - wb, { s: 2 });
        spr(SPR.wolf.run1, 328 - wl * 66, 88 - (1 - wb), { s: 2, mirror: true });
      }
      ctx.restore();
      if (t > 0.6 && t < 0.75) alpha(0.6, () => R(0, 0, 320, 140, PAL.W));
      if (t > 1.0) alpha(ease((t - 1) / 0.4), () => txt("RATÃO DO GÁS", 160, 4, 52, "#ff7a5a", "center", PAL.K, true));
      if (t > 2.6) {
        alpha(ease((t - 2.6) / 0.4), () => {
          txt("LOBOS", 59, 64, 24, PAL.W, "center", PAL.K, true);
          txt("LOBBISTAS", 59, 71, 24, PAL.W, "center", PAL.K, true);
          txt("LOBOS", 261, 64, 24, PAL.W, "center", PAL.K, true);
          txt("LOBBISTAS", 261, 71, 24, PAL.W, "center", PAL.K, true);
        });
      }
    },
  },
  {
    text: "",
    min: 6,
    draw(t) {
      sky("#6cc3ee", "#d6f1fb", 0, 180, 14);
      sunRays(276, 32, 10, t * 0.5);
      [[30, 30], [180, 20]].forEach(([x, y]) => cloud(((x + t * 6) % 360) - 20, y));
      hills("#a9d99a", 150, 16, 1, 44);
      turbine(40, 151, 60, t * 3, 19);
      turbine(64, 151, 44, t * 3 + 1, 14);
      for (let i = 0; i < 21; i++) {
        spr(SPR.grass.f1, i * 16, 150);
        spr(SPR.grass.dirt, i * 16, 166);
      }
      const f = Math.floor(t * 8) % 2;
      spr(hero(f ? "run1" : "run2", Math.floor(t * 14), false), 138, 150 - 56 - f * 2, { s: 2 });
      const a = ease(t / 0.6);
      alpha(a, () => {
        txt("AS SUPER", 160, 10, 44, PAL.W, "center", PAL.K, true);
        txt("RENOVÁVEIS", 160, 24, 76, PAL.Y, "center", PAL.K, true);
      });
      if (t > 1.2) txt("A aventura de Zé Voltinho", 160, 50, 30, PAL.K, "center", null);
      if (t > 1.8 && Math.floor(t * 2) % 2 === 0) txt("Aperte para começar", 160, 162, 30, PAL.W, "center", PAL.K);
    },
  },
];

SC.forEach((s) => {
  s.chars = parse(s.text).length;
  s.typeEnd = 0.5 + s.chars / 30;
  s.dur = Math.max(s.min, s.typeEnd + 2.4);
});

export const OPENING_COUNT = SC.length;

export function openingFrame(i) {
  return SC[(i + SC.length) % SC.length];
}

/** Noite no meio da história e na entrada do Ratão. O resto fica na trilha do dia. */
export function openingMusic(i) {
  return i === 4 || i === 5 || i === 6 || i === 8 ? "night" : "day";
}

export function drawOpening(context, index, t, skipType, holdTitle) {
  ctx = context;
  const s = openingFrame(index);
  const prevBaseline = ctx.textBaseline;
  const prevAlign = ctx.textAlign;
  R(0, 0, 320, 180, "#0b0d1c");
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 320, s.text ? 140 : 180);
  ctx.clip();
  s.draw(t);
  ctx.restore();
  if (s.text) {
    const shown = skipType ? s.chars : Math.floor(clamp((t - 0.5) * 30, 0, s.chars));
    textbox(s.text, shown, shown >= s.chars, t);
  }
  const fi = clamp(1 - t / 0.35);
  const fo = holdTitle ? 0 : clamp((t - (s.dur - 0.35)) / 0.35);
  const f = Math.max(fi, fo);
  if (f > 0) alpha(f, () => R(0, 0, 320, 180, "#000"));
  ctx.textBaseline = prevBaseline;
  ctx.textAlign = prevAlign;
}
