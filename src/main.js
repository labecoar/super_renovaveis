/**
 * As Super Renováveis — rebuild fiel ao GDD v0.1
 * Lógica em 320×180; canvas renderiza em 2× (640×360) pra ficar mais nítido.
 */
import { PAL, SPR, drawSprite, drawTurbine, gridSize } from "./sprites.js";
import { initAudio, isMuted, setHum, setMusic, sfx, toggleMute } from "./audio.js";

/* Velocidades em “px por frame a 60fps” — o update multiplica por dt*60. */
const CFG = {
  HERO_SPEED: 1.45,
  HERO_SPEED_TIRED: 0.85,
  JUMP_V: -6.5,
  JUMP_V_TIRED: -4.2,
  GRAVITY: 0.26,
  MAX_FALL: 7,
  RUN_ANIM: 4, // ciclos de pose por segundo (título e jogo iguais)
  ENERGY_MAX: 100,
  ENERGY_START: 60,
  DRAIN_MOVING: 3,
  DRAIN_IDLE: 1,
  SUN_GAIN: 12,
  WIND_GAIN: 12,
  BATTERY_CELLS: 3,
  CELL_SIZE: 30,
  BATTERY_KICKIN: 40,
  BATTERY_FLOW: 10,
  CO2_HIT: 15,
  PAPER_HIT: 10,
  PAPER_SLOW: 1,
  PAPER_EVERY: 4,
  WOLF_HIT: 30, // 1 célula de bateria
  WOLF_SPEED: 1.25,
  WOLF_AHEAD: 200, // se passar disso na frente do Lampião, vira e volta
  WOLF_STUN: 2,
  WOLF_HIT_STUN: 1.2,
  BOSS_CLOUD_EVERY: 2.5,
  BOSS_CLOUD_SPEED: 0.7,
  BOSS_HP: 3,
  HURT_INVULN: 1.2,
  CHECKPOINT_MIN_ENERGY: 50,
};
const FRAME = 60; // referência do feeling do protótipo antigo

const T = 16;
const MAP_W = 404;
const VW = 320;
const VH = 180;
const SCALE = 2; // 640×360 no canvas
const GROUND = 9; // topo da grama em tiles (y = 144); dirt embaixo
const GROUND_Y = GROUND * T; // 144 — igual ao mockup do GDD

const SKY = [
  [0, [0x8f, 0xd3, 0xf4]],
  [80 * T, [0xd9, 0xc9, 0x8a]],
  [170 * T, [0xf0, 0x8a, 0x5d]],
  [260 * T, [0x1d, 0x26, 0x50]],
  [380 * T, [0x2b, 0x2a, 0x5a]],
];

const SIGNS = {
  A: "Sobrou energia? A bateria guarda.",
  B: "Usina a gás: liga rápido, mas queima combustível fóssil.",
  C: "Vem aí a noite. Encha a bateria!",
  D: "Sem sol e sem vento. Agora é com a bateria.",
};

const WOLF_LINES = [
  "Assina aqui, é rapidinho!",
  "Bateria? Isso é luxo!",
  "Termelétrica resolve. Confia.",
  "Reuniãozinha? Só assinar…",
  "Sol de noite? Imagina!",
];

const BOSS_LINES = [
  "Sem gás, o Brasil apaga!",
  "Bateria é coisa de celular.",
  "Contrato de 30 anos. Assina!",
];

/** tempo pra ler balão; intervalo entre falas dos lobos */
const TALK_READ = 3.2;
const WOLF_CHAT_GAP = 8;

const CARDS = [
  {
    title: "Sol e vento têm horário próprio",
    text: "Painel solar só gera com luz. Turbina só gira com vento. A geração sobe e desce e nem sempre bate com o consumo.",
  },
  {
    title: "Sobrou? Guarda.",
    text: "Sol e vento às vezes produzem mais do que se consome. Baterias guardam a sobra e devolvem quando a geração cai.",
  },
  {
    title: "Menos fóssil quando escurece",
    text: "Quando a renovável cai, térmicas a gás costumam cobrir. Com armazenamento, a energia do dia ajuda a noite.",
  },
];

const QUOTE =
  "O futuro da energia não precisa ficar preso ao passado. Para avançar na transição energética, precisamos armazenar o futuro.";

const cv = document.getElementById("c");
const ctx = cv.getContext("2d");
/** Escala total do mundo→pixel físico (SCALE × fit CSS × DPR arredondado). */
let viewScale = SCALE;

/**
 * Escala inteira + Retina:
 * - CSS ocupa o espaço livre da janela (pode ser fracionário)
 * - buffer do canvas × DPR pra 1 pixel lógico = N pixels físicos (nearest, sem blur)
 */
function fitIntegerScale() {
  const dpr = Math.max(1, Math.round(window.devicePixelRatio) || 1);
  const touch = matchMedia("(hover: none) and (pointer: coarse)").matches;
  const padX = touch ? 24 : 72;
  const padY = !touch ? 120 : window.innerHeight <= 500 ? 100 : 190;
  const baseW = VW * SCALE;
  const baseH = VH * SCALE;
  const ratio = Math.min((window.innerWidth - padX) / baseW, (window.innerHeight - padY) / baseH);
  // meio-termo: ~80% do espaço livre (nunca menor que 640×360 se couber)
  const fit = Math.max(0.3, Math.min(ratio, 1), ratio * 0.8);

  // buffer sempre em múltiplo inteiro (sem frestas entre tiles), arredondado pra cima
  // e o CSS reduz um pouco — fica nítido em vez de borrado
  const k = Math.max(1, Math.ceil(fit * dpr));

  cv.style.width = `${Math.round(baseW * fit)}px`;
  cv.style.height = `${Math.round(baseH * fit)}px`;
  cv.width = baseW * k;
  cv.height = baseH * k;
  viewScale = SCALE * k;
  ctx.imageSmoothingEnabled = false;
}
fitIntegerScale();
addEventListener("resize", fitIntegerScale);

/* ===== mapa ===== */
const solid = Array.from({ length: 12 }, () => Array(MAP_W).fill(0));
const holes = [
  [36, 38],
  [188, 190],
  [220, 222],
  [276, 277],
  [290, 292],
  [306, 308],
  [318, 319],
  [330, 332],
];

for (let x = 0; x < MAP_W; x++) {
  if (!holes.some(([a, b]) => x >= a && x <= b)) {
    solid[GROUND][x] = 1;
    solid[GROUND + 1][x] = 1;
    if (GROUND + 2 < 12) solid[GROUND + 2][x] = 1;
  }
}

const plats = [
  [14, 6, 4],
  [24, 4, 3],
  // B · plataformas afastadas das usinas (100, 124, 148)
  [86, 6, 3],
  [112, 4, 3],
  [136, 5, 3],
  [180, 6, 3],
  [186, 4, 3],
  [192, 2, 3],
  [210, 5, 4],
  [228, 3, 3],
  [240, 5, 4],
  [270, 6, 3],
  [278, 4, 3],
  [286, 6, 3],
  [294, 4, 4],
  [300, 6, 3],
  [312, 5, 3],
  [316, 3, 3],
  [324, 6, 3],
  [334, 5, 3],
  [340, 6, 3],
  [350, 4, 3],
  [356, 2, 3],
];
plats.forEach(([x, y, l]) => {
  for (let i = 0; i < l; i++) if (x + i < MAP_W) solid[y][x + i] = 2; // plataforma
});

function blocked(x, y, w, h) {
  const x0 = Math.floor(x / T);
  const x1 = Math.floor((x + w - 1) / T);
  const y0 = Math.floor(y / T);
  const y1 = Math.floor((y + h - 1) / T);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || tx >= MAP_W) return true;
      if (ty >= 0 && ty < solid.length && solid[ty][tx]) return true;
    }
  }
  return false;
}

/* ===== entidades ===== */
const pickups = [];
const hazards = [];
const signs = [];
const checkpoints = [];
let wolves = [];
let papers = [];
let bossClouds = [];

function addPickup(type, tx, ty) {
  const g = type === "sun" ? SPR.sun.f1 : SPR.wind.f1;
  const { w, h } = gridSize(g);
  pickups.push({
    type,
    x: tx * T + Math.floor((T - w) / 2),
    y: ty * T,
    w,
    h,
    baseY: ty * T,
    got: false,
  });
}

function addCo2(tx, ty, amp = 16) {
  const { w, h } = gridSize(SPR.co2.f1);
  hazards.push({
    x: tx * T,
    y: ty * T,
    w,
    h,
    baseY: ty * T,
    amp,
    phase: Math.random() * 6,
    dead: false,
  });
}

function addSign(zone, tx) {
  signs.push({ zone, x: tx * T, y: GROUND_Y - 24, w: 16, text: SIGNS[zone], shown: false, sign: true });
}

function addCp(tx) {
  checkpoints.push({ x: tx * T, y: GROUND_Y - 28, reached: false, save: null });
}

// A · 12 sóis + 2 ventos (altura média: acima da cabeça, pulo confortável)
[6, 12, 18, 28, 34, 42, 48, 54, 60, 66, 72, 16].forEach((x, i) =>
  addPickup("sun", x, i === 11 ? 4 : i === 2 ? 4 : 6),
);
addPickup("wind", 40, 5);
addPickup("wind", 55, 5);

// B · 8 sóis + 6 CO₂ (nuvens no ar livre, longe de plataforma/usina)
[88, 98, 108, 118, 128, 138, 152, 160].forEach((x, i) => addPickup("sun", x, i % 3 === 0 ? 4 : 6));
// y=2, amp baixa — não desce até as plataformas (y≥4)
[94, 108, 118, 132, 142, 156].forEach((x, i) => addCo2(x, 2, 6 + (i % 3) * 2));

// usinas a gás (decoração da zona B)
const PLANTS = [100, 124, 148];

// C · 14 ventos + 4 sóis — no ar, sem atravessar plataforma
[
  [176, 1],
  [182, 1],
  [188, 1],
  [196, 1], // pula 192–194 (plataforma y=2)
  [200, 2],
  [206, 1],
  [214, 1],
  [218, 2],
  [224, 1],
  [232, 1], // pula 228–230 (plataforma y=3)
  [236, 2],
  [244, 1],
  [248, 2],
  [254, 1],
].forEach(([x, y]) => addPickup("wind", x, y));
[205, 220, 235, 250].forEach((x) => addPickup("sun", x, 6));
addSign("A", 22);
addSign("B", 92);
addSign("C", 178);
addSign("D", 268);
addCp(80);
addCp(170);
addCp(260);
addCp(350);

const SUB_X = 368 * T;
const boss = {
  x: 358 * T,
  y: GROUND_Y - 25,
  w: 26,
  h: 25,
  cloudCd: 0,
  alt: 0,
  talk: 0,
  active: false,
  hp: CFG.BOSS_HP,
  hitCd: 0,
  defeated: false,
  defeatAt: 0,
};

const BOSS_HIT_LINES = ["Ai! Meu contrato!", "Isso não tava no acordo!"];

function makeWolves() {
  return [0, 1].map((i) => ({
    x: 70 * T - i * 24,
    y: GROUND_Y - 20,
    w: 16,
    h: 20,
    stun: 0,
    talk: 0,
    paperCd: i * 2,
    frame: 0,
    face: 1,
  }));
}

function placeWolvesBehind() {
  if (!wolvesOn) return;
  wolves.forEach((w, i) => {
    w.x = p.x - 80 - i * 26;
    w.y = GROUND_Y - 20;
    w.stun = 0;
    w.talk = WOLF_CHAT_GAP * 0.6;
    w.paperCd = 1.2 + i;
    w.face = 1;
  });
}

/* ===== estado ===== */
const keys = {};
let state = "title";
let p;
let cam = 0;
let time = 0;
let jbuf = 0;
let coy = 0;
let lastTs = 0;
let catchT = 0;
/** Fala atual (uma por vez). who: quem fala (herói, lobo, chefão, placa) ou null = recordatório no topo. */
let msg = null;

function say(text, who = p, dur = TALK_READ) {
  msg = { text, who, t: dur };
}
let cardIdx = 0;
let delivered = 0;
let slowT = 0;
let endingAt = 0;
/** segundos por casa no ending — tempo pra ler o balão */
const END_HOUSE_SEC = 3;
const END_FIRST_AT = 0.8;
const END_QUOTE_AT = END_FIRST_AT + END_HOUSE_SEC * 3;
const END_ADVANCE_AT = END_QUOTE_AT + 1.2;
let wolvesOn = false;
let said = {};
let legT = 0; // relógio só da animação do Lampião (título = jogo)
let jumpLock = 0; // evita pular no mesmo Espaço que inicia

function batMax() {
  return CFG.BATTERY_CELLS * CFG.CELL_SIZE;
}

function collect(n) {
  const cellsBefore = Math.floor(p.battery / CFG.CELL_SIZE);
  const toBar = Math.min(CFG.ENERGY_MAX - p.energy, n);
  p.energy += toBar;
  p.battery = Math.min(batMax(), p.battery + (n - toBar));
  if (Math.floor(p.battery / CFG.CELL_SIZE) > cellsBefore) sfx("cell");
}

function saveCp(cp) {
  if (cp.x > 2 * T) sfx("checkpoint");
  cp.reached = true;
  cp.save = { x: cp.x + 4, y: GROUND_Y - 20, energy: p.energy, battery: p.battery };
  p.cp = cp.save;
}

function restoreCp() {
  const s = p.cp;
  p.x = s.x;
  p.y = s.y;
  p.vx = 0;
  p.vy = 0;
  p.energy = Math.max(s.energy, CFG.CHECKPOINT_MIN_ENERGY);
  p.battery = s.battery;
  papers = [];
  bossClouds = [];
  cam = clampCam(p.x);
  placeWolvesBehind();
  msg = null;
}

function clampCam(x) {
  return Math.max(0, Math.min(MAP_W * T - VW, x - 100));
}

function reset() {
  p = {
    x: 2 * T,
    y: GROUND_Y - 20,
    w: 12,
    h: 20,
    vx: 0,
    vy: 0,
    on: false,
    face: 1,
    energy: CFG.ENERGY_START,
    battery: 0,
    tired: false,
    discharging: false,
    hurtT: 0,
    cp: { x: 2 * T, y: GROUND_Y - 20, energy: CFG.ENERGY_START, battery: 0 },
  };
  cam = 0;
  time = 0;
  jbuf = 0;
  coy = 0;
  catchT = 0;
  say("Lampião, ontem a geladeira desligou de novo!", null);
  cardIdx = 0;
  delivered = 0;
  slowT = 0;
  endingAt = 0;
  wolvesOn = false;
  said = {};
  // legT NÃO zera — mantém o mesmo ritmo da tela inicial
  jumpLock = 0.2;
  papers = [];
  bossClouds = [];
  wolves = makeWolves();
  boss.active = false;
  boss.cloudCd = 0;
  boss.alt = 0;
  boss.hp = CFG.BOSS_HP;
  boss.hitCd = 0;
  boss.defeated = false;
  boss.defeatAt = 0;
  keys[" "] = false;
  keys.z = false;
  keys.arrowup = false;
  keys.w = false;
  keys.enter = false;
  pickups.forEach((c) => (c.got = false));
  hazards.forEach((h) => {
    h.dead = false;
  });
  signs.forEach((s) => (s.shown = false));
  checkpoints.forEach((c) => {
    c.reached = false;
    c.save = null;
  });
}

function start() {
  if (state === "play" || state === "caught" || state === "ending") return;
  if (state === "cards") {
    cardIdx++;
    if (cardIdx >= CARDS.length) state = "done";
    return;
  }
  reset();
  state = "play";
}

reset();

addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
  if (e.repeat) return;
  initAudio();
  const k = e.key.toLowerCase();
  if (k === "m") {
    toggleMute();
    return;
  }
  if (k === "escape" && state === "play") {
    state = "title";
    return;
  }
  if ([" ", "z", "arrowup", "w", "enter"].includes(k)) pressAction();
});

/** Pular / começar / avançar o final — teclado e botão de toque. */
function pressAction() {
  if (state === "ending") {
    // só avança depois das casas + frase final
    if (time - endingAt > END_ADVANCE_AT) {
      state = "cards";
      cardIdx = 0;
    }
    return;
  }
  if (state !== "play" && state !== "caught") start();
  else if (state === "play" && jumpLock <= 0) jbuf = 7 / FRAME;
}

/** Soltar o pulo cedo = pulo curto. */
function releaseJump() {
  if (p?.vy < -1.5) p.vy *= 0.55;
}

addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
  if ([" ", "z", "arrowup", "w"].includes(e.key.toLowerCase())) releaseJump();
});

document.querySelectorAll(".touch [data-key]").forEach((btn) => {
  const k = btn.dataset.key;
  const down = (e) => {
    e.preventDefault();
    e.stopPropagation();
    btn.setPointerCapture?.(e.pointerId);
    btn.classList.add("on");
    initAudio();
    if (k === "jump") pressAction();
    else keys[k] = true;
  };
  const up = (e) => {
    e.preventDefault();
    if (!btn.classList.contains("on")) return;
    btn.classList.remove("on");
    if (k === "jump") releaseJump();
    else keys[k] = false;
  };
  btn.addEventListener("pointerdown", down);
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) => btn.addEventListener(ev, up));
  btn.addEventListener("contextmenu", (e) => e.preventDefault());
});

const muteBtn = document.querySelector(".touch .mute");
if (muteBtn) {
  muteBtn.classList.toggle("off", isMuted());
  muteBtn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    initAudio();
    muteBtn.classList.toggle("off", toggleMute());
  });
}

addEventListener("pointerdown", () => {
  initAudio();
  if (state === "ending") {
    if (time - endingAt > END_ADVANCE_AT) {
      state = "cards";
      cardIdx = 0;
    }
    return;
  }
  if (state !== "play" && state !== "caught") start();
});

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function mixStops(stops, x) {
  if (x <= stops[0][0]) return stops[0][1];
  let i = 0;
  while (i < stops.length - 1 && x >= stops[i + 1][0]) i++;
  if (i >= stops.length - 1) return stops[stops.length - 1][1];
  const [ax, ac] = stops[i];
  const [bx, bc] = stops[i + 1];
  const k = (x - ax) / (bx - ax);
  return ac.map((v, n) => Math.round(v + (bc[n] - v) * k));
}

function mixSky(x) {
  return mixStops(SKY, x);
}

// horizonte e colinas seguem as mesmas zonas do céu, sem degraus no meio da fase
const HORIZON = [
  [0, [200, 230, 245]],
  [80 * T, [226, 222, 196]],
  [170 * T, [255, 170, 92]],
  [250 * T, [80, 55, 110]],
  [260 * T, [14, 18, 42]],
];
const HILL_FAR = [
  [0, [0x7a, 0xa8, 0x84]],
  [160 * T, [0x7a, 0xa8, 0x84]],
  [175 * T, [0x6a, 0x56, 0x89]],
  [250 * T, [0x6a, 0x56, 0x89]],
  [260 * T, [0x1a, 0x22, 0x40]],
];
const HILL_NEAR = [
  [0, [0x3e, 0x7a, 0x52]],
  [160 * T, [0x3e, 0x7a, 0x52]],
  [175 * T, [0x4e, 0x3d, 0x6e]],
  [250 * T, [0x4e, 0x3d, 0x6e]],
  [260 * T, [0x24, 0x30, 0x56]],
];

function rgb(c, a = 1) {
  return a < 1 ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : `rgb(${c[0]},${c[1]},${c[2]})`;
}

function updateEnergy(dt) {
  const moving = Math.abs(p.vx) > 0.05;
  p.energy = Math.max(0, p.energy - (moving ? CFG.DRAIN_MOVING : CFG.DRAIN_IDLE) * dt);
  p.discharging = false;
  if (p.energy < CFG.BATTERY_KICKIN && p.battery > 0) {
    const flow = Math.min(CFG.BATTERY_FLOW * dt, p.battery, CFG.ENERGY_MAX - p.energy);
    p.battery -= flow;
    p.energy += flow;
    p.discharging = true;
  }
  p.tired = p.energy <= 0;
}

function catchHero(text) {
  state = "caught";
  catchT = 0.5;
  say(text, null);
}

/** Pisão: caindo e, no quadro anterior, os pés estavam acima da cabeça (independe da velocidade). */
function isStomp(e) {
  return p.vy > 0 && (p.prevFeet ?? p.y + p.h) <= e.y + 6;
}

/** Tira energia: bateria primeiro, depois a barra. */
function drainCharge(n) {
  const fromBat = Math.min(n, p.battery);
  p.battery -= fromBat;
  if (n > fromBat) p.energy = Math.max(0, p.energy - (n - fromBat));
}

/** Lobo encosta: tira 1 carga (bateria primeiro) e empurra — sem reset de checkpoint. */
function wolfHit(w) {
  drainCharge(CFG.WOLF_HIT);
  sfx("hurt");
  const dir = p.x >= w.x ? 1 : -1;
  p.x += dir * 18;
  p.vx = dir * 2.2;
  p.vy = -2.4;
  w.stun = CFG.WOLF_HIT_STUN;
  w.face = dir; // continua no rumo, longe do herói
  say("Te peguei! Assina aqui.", w, 2);
}

function update(dt) {
  time += dt;
  legT += dt; // avança no título e no jogo com a mesma velocidade
  if (jumpLock > 0) jumpLock -= dt;

  if (state === "caught") {
    catchT -= dt;
    if (catchT <= 0) {
      restoreCp();
      state = "play";
    }
    return;
  }
  if (state !== "play") return;

  if (msg && (msg.t -= dt) <= 0) msg = null;
  if (slowT > 0) slowT -= dt;

  updateEnergy(dt);

  const step = dt * FRAME; // 1.0 ≈ um frame a 60fps
  const L = keys.arrowleft || keys.a;
  const R = keys.arrowright || keys.d;
  const spd = (p.tired ? CFG.HERO_SPEED_TIRED : CFG.HERO_SPEED) * (slowT > 0 ? 0.55 : 1);
  p.vx = (R ? spd : 0) - (L ? spd : 0);
  if (p.vx) p.face = p.vx > 0 ? 1 : -1;

  if (p.on) coy = 7 / FRAME;
  else if (coy > 0) coy -= dt;
  if (jbuf > 0) jbuf -= dt;
  if (jbuf > 0 && coy > 0 && jumpLock <= 0) {
    p.vy = p.tired ? CFG.JUMP_V_TIRED : CFG.JUMP_V;
    sfx("jump");
    jbuf = 0;
    coy = 0;
    p.on = false;
  }

  // no chão: sem gravidade (evita tremer 1px todo frame)
  if (!p.on) p.vy = Math.min(p.vy + CFG.GRAVITY * step, CFG.MAX_FALL);
  else p.vy = 0;

  p.x += p.vx * step;
  while (blocked(p.x, p.y, p.w, p.h)) p.x -= Math.sign(p.vx) || 1;
  if (p.x < 0) p.x = 0;

  p.prevFeet = p.y + p.h;
  p.y += p.vy * step;
  p.on = false;
  if (blocked(p.x, p.y, p.w, p.h)) {
    if (p.vy >= 0) {
      p.y = Math.floor((p.y + p.h) / T) * T - p.h;
      p.on = true;
      p.vy = 0;
    } else {
      p.y = (Math.floor(p.y / T) + 1) * T;
      p.vy = 0;
    }
  } else if (blocked(p.x, p.y + 1, p.w, p.h)) {
    // cola no chão sem afundar
    p.y = Math.floor((p.y + 1 + p.h) / T) * T - p.h;
    p.on = true;
    p.vy = 0;
  }
  if (p.on) p.y = Math.round(p.y);

  cam = clampCam(p.x);

  if (p.y > VH + 40) {
    sfx("fall");
    catchHero("Ops! Volta e tenta de novo.");
    return;
  }

  pickups.forEach((c) => {
    if (c.got) return;
    c.y = c.baseY + Math.sin(time * 3 + c.x * 0.05) * 2;
    if (overlap(p, c)) {
      c.got = true;
      sfx(c.type);
      collect(c.type === "sun" ? CFG.SUN_GAIN : CFG.WIND_GAIN);
    }
  });

  hazards.forEach((h) => {
    if (h.dead) return;
    h.phase += dt * 1.5;
    h.y = h.baseY + Math.sin(h.phase) * h.amp;
    if (overlap(p, h)) {
      p.energy = Math.max(0, p.energy - CFG.CO2_HIT);
      sfx("cough");
      h.dead = true;
    }
  });

  signs.forEach((s) => {
    if (!s.shown && Math.abs(p.x - s.x) < 20) {
      s.shown = true;
      say(s.text, s);
    }
  });

  checkpoints.forEach((cp) => {
    if (!cp.reached && p.x >= cp.x) saveCp(cp);
  });

  if (!wolvesOn && p.x >= 80 * T) {
    wolvesOn = true;
    placeWolvesBehind();
    say("Psiu! Energia de verdade é gás.", wolves[0]);
  }

  if (p.x > 174 * T && !said.C && !msg) {
    said.C = true;
    say("O sol tá indo embora. Bora encher essa bateria!");
  }

  if (p.hurtT > 0) p.hurtT -= dt;

  if (p.x >= 350 * T && !boss.defeated) {
    boss.active = true;
    if (!said.boss) {
      said.boss = true;
      say("Chefe, é com o senhor.", wolves[0]);
      wolves.forEach((w) => (w.stun = 99));
    }
  }

  updateWolves(dt);
  updateBoss(dt);
  updatePapers(dt);
  updateBossClouds(dt);

  if (p.x >= SUB_X && boss.defeated) {
    delivered = Math.round(p.energy + p.battery);
    endingAt = time;
    state = "ending";
  }
}

function updateWolves(dt) {
  if (!wolvesOn || boss.active) return;
  const step = dt * FRAME;
  const front = wolves.slice().sort((a, b) => b.x - a.x)[0];
  const tile = p.x / T;

  wolves.forEach((w) => {
    w.frame += dt * 6;
    if (w.stun > 0) {
      w.stun -= dt;
      return;
    }

    // 200px na frente → volta; 200px atrás → segue. No meio mantém o rumo
    if (w.x - p.x > CFG.WOLF_AHEAD) w.face = -1;
    else if (p.x - w.x > CFG.WOLF_AHEAD) w.face = 1;

    w.x += CFG.WOLF_SPEED * w.face * step;

    // pula buracos (igual o início), sem virar
    const look = w.face >= 0 ? w.x + w.w + 2 : w.x - 2;
    const footX = Math.floor(look / T);
    if (footX >= 0 && footX < MAP_W && !solid[GROUND][footX]) {
      w.x += w.face * 2 * step;
      w.y = GROUND_Y - 28;
    } else w.y = GROUND_Y - 20;

    if (w === front && tile >= 170 && tile < 350) {
      w.paperCd -= dt;
      if (w.paperCd <= 0) {
        w.paperCd = CFG.PAPER_EVERY;
        papers.push({
          x: w.x + (w.face > 0 ? 10 : -2),
          y: w.y + 4,
          vx: 2.2 * w.face,
          vy: -2.8,
          w: 8,
          h: 8,
        });
      }
    }

    if (w === front) {
      w.talk -= dt;
      if (w.talk <= 0 && !msg) {
        w.talk = WOLF_CHAT_GAP;
        say(WOLF_LINES[(Math.random() * WOLF_LINES.length) | 0], w);
      }
    }

    if (overlap(p, w)) {
      if (isStomp(w)) {
        w.stun = CFG.WOLF_STUN;
        sfx("boing");
        p.vy = -3.6;
      } else wolfHit(w);
    }
  });
}

function updateBoss(dt) {
  if (!boss.active) return;
  if (boss.hitCd > 0) boss.hitCd -= dt;

  // não dá pra passar do chefão enquanto ele tiver vida
  if (p.x + p.w > boss.x + boss.w) p.x = boss.x + boss.w - p.w;

  if (overlap(p, boss)) {
    const stomp = isStomp(boss);
    if (stomp && boss.hitCd <= 0) {
      boss.hp--;
      sfx(boss.hp <= 0 ? "victory" : "bossHit");
      boss.hitCd = 0.6;
      p.vy = -4.6;
      if (boss.hp <= 0) {
        boss.defeated = true;
        boss.active = false;
        boss.defeatAt = time;
        bossClouds = [];
        say("Tá bom, tá bom… a bateria venceu!", { x: boss.x, y: boss.y + 6, w: boss.w });
        return;
      }
      say(BOSS_HIT_LINES[boss.hp % BOSS_HIT_LINES.length], boss, 2);
    } else if (!stomp && boss.hitCd <= 0 && p.hurtT <= 0) {
      drainCharge(CFG.WOLF_HIT);
      sfx("hurt");
      p.x = boss.x - p.w - 30;
      p.vy = -3;
      p.hurtT = CFG.HURT_INVULN;
      say("Assina logo, menino!", boss, 2);
    }
  }

  boss.cloudCd -= dt;
  boss.talk -= dt;
  if (boss.talk <= 0 && !msg) {
    boss.talk = WOLF_CHAT_GAP;
    say(BOSS_LINES[(Math.random() * BOSS_LINES.length) | 0], boss);
  }
  // corpo a corpo (colado ou em cima dele): não solta nuvem na cara do herói
  const close = p.x + p.w > boss.x - 40;
  if (boss.cloudCd <= 0 && !close) {
    boss.cloudCd = CFG.BOSS_CLOUD_EVERY;
    const high = boss.alt % 2 === 1;
    boss.alt++;
    const { w, h } = gridSize(SPR.co2.f1);
    bossClouds.push({
      x: boss.x - w - 2,
      y: high ? boss.y - 6 : boss.y + 8,
      w,
      h,
      vx: -CFG.BOSS_CLOUD_SPEED,
    });
  }
}

function updatePapers(dt) {
  const step = dt * FRAME;
  papers = papers.filter((pr) => {
    pr.vy += CFG.GRAVITY * 0.55 * step;
    pr.x += pr.vx * step;
    pr.y += pr.vy * step;
    if (overlap(p, pr)) {
      p.energy = Math.max(0, p.energy - CFG.PAPER_HIT);
      sfx("paper");
      slowT = CFG.PAPER_SLOW;
      return false;
    }
    return pr.y < GROUND_Y + 8 && pr.x < p.x + 220;
  });
}

function updateBossClouds(dt) {
  const step = dt * FRAME;
  bossClouds = bossClouds.filter((c) => {
    c.x += c.vx * step;
    if (overlap(p, c)) {
      p.energy = Math.max(0, p.energy - CFG.CO2_HIT);
      sfx("cough");
      return false;
    }
    return c.x > p.x - 160;
  });
}

/* ===== desenho ===== */
function fill(x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function text(s, x, y, size, color, align = "center") {
  ctx.font = `${size}px "Pixelify Sans","Press Start 2P",monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}

const BUBBLE = {
  speech: { bg: PAL.W, line: PAL.K, ink: PAL.K },
  sign: { bg: PAL.L, line: PAL.D, ink: PAL.K },
  caption: { bg: PAL.Y, line: PAL.K, ink: PAL.K },
};

/** Balão de quadrinho em pixel: cantos cortados + rabicho apontando pra quem fala. */
function bubble(str, wx, wy, kind = "speech") {
  if (!str) return;
  const st = BUBBLE[kind];
  const size = 5;
  const maxW = 120;
  ctx.font = `${size}px "Pixelify Sans","Press Start 2P",monospace`;
  const words = str.split(" ");
  const lines = [];
  let line = "";
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  });
  if (line) lines.push(line);
  const shown = lines.slice(0, 2);
  if (lines.length > 2) shown[1] = shown[1].replace(/.{0,2}$/, "…");
  const tw = Math.ceil(Math.max(...shown.map((l) => ctx.measureText(l).width))) + 10;
  const th = shown.length * (size + 2) + 5;
  const ax = Math.round(wx - cam);
  const bx = Math.round(kind === "caption" ? (VW - tw) / 2 : Math.max(4, Math.min(VW - tw - 4, ax - tw / 2)));
  const by = Math.round(kind === "caption" ? 30 : Math.max(30, wy - th - 7));

  // contorno com cantos arredondados (2px cortados) + sombra dura
  fill(bx + 2, by + th + 1, tw, 1, "rgba(0,0,0,0.35)");
  fill(bx + tw + 1, by + 2, 1, th - 1, "rgba(0,0,0,0.35)");
  fill(bx + 2, by - 1, tw - 4, 1, st.line);
  fill(bx + 2, by + th, tw - 4, 1, st.line);
  fill(bx - 1, by + 2, 1, th - 4, st.line);
  fill(bx + tw, by + 2, 1, th - 4, st.line);
  fill(bx + 1, by, 1, 1, st.line);
  fill(bx + tw - 2, by, 1, 1, st.line);
  fill(bx, by + 1, 1, 1, st.line);
  fill(bx + tw - 1, by + 1, 1, 1, st.line);
  fill(bx + 1, by + th - 1, 1, 1, st.line);
  fill(bx + tw - 2, by + th - 1, 1, 1, st.line);
  fill(bx, by + th - 2, 1, 1, st.line);
  fill(bx + tw - 1, by + th - 2, 1, 1, st.line);
  fill(bx + 2, by, tw - 4, th, st.bg);
  fill(bx + 1, by + 1, tw - 2, th - 2, st.bg);
  fill(bx, by + 2, tw, th - 4, st.bg);

  if (kind !== "caption") {
    // rabicho em escada, inclinado pro lado de quem fala
    const tx = Math.max(bx + 4, Math.min(bx + tw - 8, ax - 2));
    const lean = ax < bx + tw / 2 ? -1 : 1;
    for (let i = 0; i < 4; i++) {
      const w = 4 - i;
      const x = tx + (lean > 0 ? i : 0);
      fill(x - 1, by + th + i, w + 2, 1, st.line);
      fill(x, by + th + i - (i === 0 ? 1 : 0), w, i === 0 ? 2 : 1, st.bg);
    }
    fill(tx + (lean > 0 ? 4 : -1), by + th + 4, 1, 1, st.line);
  }

  shown.forEach((l, i) => text(l, bx + 5, by + size + 2 + i * (size + 2), size, st.ink, "left"));
}

function drawMsg() {
  if (!msg) return;
  const w = msg.who;
  if (!w) return bubble(msg.text, 0, 0, "caption");
  bubble(msg.text, w.x + w.w / 2, w.y - 2, w.sign ? "sign" : "speech");
}

/** Sol/lua em disco pixelado (estilo do mockup do GDD). */
function disc(cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2, 1);
  }
}

function drawSky() {
  const top = mixSky(p.x);
  // estrelas/lua só perto do checkpoint 3, onde o GDD diz “anoitece”
  const night = p.x >= 255 * T;
  const progress = Math.min(1, p.x / (260 * T));
  const bot = mixStops(HORIZON, p.x);

  // faixas grossas pixel (como o mockup), não gradient suave
  const bands = 12;
  const bh = Math.ceil(VH / bands);
  for (let i = 0; i < bands; i++) {
    const k = i / (bands - 1);
    ctx.fillStyle = rgb(top.map((v, n) => Math.round(v + (bot[n] - v) * k)));
    ctx.fillRect(0, i * bh, VW, bh);
  }

  if (night) {
    for (let i = 0; i < 40; i++) {
      const sx = (i * 73 + Math.floor(cam * 0.05)) % VW;
      const sy = (i * 37) % 70 + 4;
      if ((i + Math.floor(time * 2)) % 7) fill(sx, sy, 1, 1, PAL.W);
    }
    disc(280, 26, 9, PAL.L);
    disc(284, 23, 8, rgb(top));
  } else {
    // sol desce conforme a fase (no entardecer fica atrás das colinas)
    const sunX = VW * 0.78 - progress * 40;
    const sunY = 36 + progress * 88;
    const r = Math.round(16 - progress * 3);
    disc(sunX, sunY, r + 3, "#ffe7a0");
    disc(sunX, sunY, r, PAL.Y);

    // nuvens decorativas só de manhã — na usina/CO₂ viravam faixas cinza estranhas
    if (p.x < 80 * T) {
      for (let i = 0; i < 4; i++) {
        const cx = Math.round(((i * 110 - cam * 0.12) % (VW + 80)) - 20);
        const cy = 26 + (i % 3) * 12;
        fill(cx + 8, cy, 22, 6, PAL.W);
        fill(cx + 4, cy + 4, 30, 6, PAL.W);
        fill(cx + 12, cy - 4, 14, 6, PAL.W);
      }
    }
  }

  // colinas pixeladas coluna a coluna (igual ao mockup do doc)
  const oFar = cam * 0.15;
  const far = rgb(mixStops(HILL_FAR, p.x));
  ctx.fillStyle = far;
  for (let x = 0; x < VW; x++) {
    const h = Math.round(26 + 8 * Math.sin((x + oFar) / 28) + 5 * Math.sin((x + oFar) / 11));
    ctx.fillRect(x, GROUND_Y - h, 1, h);
  }
  const oNear = cam * 0.35;
  const near = rgb(mixStops(HILL_NEAR, p.x));
  ctx.fillStyle = near;
  for (let x = 0; x < VW; x++) {
    const h = Math.round(12 + 5 * Math.sin((x + oNear) / 19) + 3 * Math.sin((x + oNear) / 7));
    ctx.fillRect(x, GROUND_Y - h, 1, h);
  }
  // continua a cor da colina até embaixo — buracos mostram o fundo (verde/roxo), não o céu azul
  fill(0, GROUND_Y, VW, VH - GROUND_Y, near);
}

function drawGround() {
  const x0 = Math.floor(cam / T) - 1;
  const x1 = Math.floor((cam + VW) / T) + 1;
  for (let x = x0; x <= x1; x++) {
    if (x < 0 || x >= MAP_W) continue;
    const sx = x * T - cam;

    // buraco = só não desenha chão (fundo da fase aparece)
    if (solid[GROUND][x]) {
      // grama no topo; terra contínua até embaixo (sem emenda de tile)
      drawSprite(ctx, SPR.grass.f1, x * T, GROUND_Y, cam);
      fill(sx, GROUND_Y + 4, T, VH - (GROUND_Y + 4), PAL.D);
      for (let row = 0; GROUND_Y + 4 + row < VH; row++) {
        const pattern = SPR.grass.dirt[row % SPR.grass.dirt.length];
        for (let col = 0; col < T; col++) {
          const hex = PAL[pattern[col % pattern.length]];
          if (!hex || hex === PAL.D) continue;
          fill(sx + col, GROUND_Y + 4 + row, 1, 1, hex);
        }
      }
    }

    for (let y = 0; y < GROUND; y++) {
      if (solid[y][x] === 2) {
        drawSprite(ctx, SPR.grass.f1, x * T, y * T, cam);
      }
    }
  }
}

function drawPlant(tx) {
  const ux = tx * T - cam;
  if (ux > VW || ux + 36 < 0) return;
  fill(ux, GROUND_Y - 40, 36, 40, PAL.B);
  fill(ux + 4, GROUND_Y - 34, 8, 8, PAL.Y);
  fill(ux + 16, GROUND_Y - 34, 8, 8, PAL.Y);
  fill(ux + 24, GROUND_Y - 56, 8, 56, PAL.s);
  fill(ux + 22, GROUND_Y - 62, 12, 8, PAL.g);
  // fumaça da chaminé
  const sx = ux + 26;
  const sy = GROUND_Y - 70 - Math.floor(time * 3 + tx) % 3;
  fill(sx, sy, 10, 4, PAL.g);
  fill(sx - 2, sy - 5, 14, 4, PAL.G);
}

function drawDecor() {
  // usinas B
  PLANTS.forEach(drawPlant);

  // turbinas C
  const spinning = mixSky(p.x)[0] >= 60;
  if (cam < 270 * T && cam + VW > 170 * T) {
    [185, 205, 225, 245].forEach((tx, i) => {
      drawTurbine(ctx, tx * T, GROUND_Y - 48, spinning ? time * 2.5 + i : i, cam);
    });
  }

  // placas
  signs.forEach((s) => {
    fill(s.x + 6 - cam, s.y + 10, 3, 18, PAL.d);
    fill(s.x - cam, s.y, 16, 12, PAL.D);
    fill(s.x + 2 - cam, s.y + 2, 12, 8, PAL.L);
  });

  // checkpoints
  checkpoints.forEach((cp) => {
    fill(cp.x + 2 - cam, cp.y, 2, 26, PAL.D);
    fill(cp.x + 4 - cam, cp.y + (cp.reached ? 0 : 8), 10, 8, cp.reached ? PAL.P : PAL.W);
  });

  // subestação
  const sx = SUB_X - cam;
  fill(sx, GROUND_Y - 32, 20, 32, PAL.b);
  fill(sx + 3, GROUND_Y - 28, 14, 24, PAL.g);
  if (!boss.defeated) {
    // trancada: corrente + cadeado vermelho até o chefão cair
    fill(sx + 1, GROUND_Y - 18, 18, 2, PAL.K);
    fill(sx + 7, GROUND_Y - 21, 6, 7, PAL.K);
    fill(sx + 8, GROUND_Y - 20, 4, 5, PAL.R);
  } else {
    fill(sx + 7, GROUND_Y - 20, 6, 6, Math.floor(time * 3) % 2 ? PAL.Y : PAL.P);
  }
}

function drawHud() {
  // energia
  fill(4, 4, 118, 26, PAL.K);
  text("ENERGIA", 8, 13, 8, PAL.W, "left");
  text("BATERIA", 76, 13, 8, PAL.W, "left");
  fill(8, 17, 60, 8, PAL.W);
  fill(9, 18, 58, 6, PAL.K);
  const pct = Math.max(0, p.energy / CFG.ENERGY_MAX);
  const low = p.energy < 20 && Math.floor(time * 6) % 2 === 0;
  fill(9, 18, 58 * pct, 6, low ? PAL.R : PAL.Y);
  fill(9, 18, 58 * pct, 2, PAL.L);

  for (let i = 0; i < 3; i++) {
    const filled = p.battery > i * CFG.CELL_SIZE + 0.01;
    const blink = p.discharging && Math.floor(p.battery / CFG.CELL_SIZE) === i && Math.floor(time * 8) % 2;
    drawSprite(ctx, filled || blink ? SPR.battery.full : SPR.battery.empty, 76 + i * 13, 14, 0);
  }

  // progresso do mapa (céu da fase) — contorno fino; noite um pouco mais legível
  fill(217, 8, 94, 8, PAL.K);
  for (let x = 0; x < 92; x++) {
    const world = (x / 91) * SUB_X;
    let col = mixSky(world);
    // evita o fim da barra parecer um “bloco preto” sem sentido
    if (col[0] < 40) col = [45, 52, 96];
    ctx.fillStyle = rgb(col);
    ctx.fillRect(218 + x, 9, 1, 6);
  }
  const mark = Math.min(1, p.x / SUB_X);
  fill(218 + mark * 92, 6, 3, 12, PAL.W);
  fill(308, 7, 5, 4, PAL.Y);
  fill(309, 6, 1, 10, PAL.W);
}

function runPhase() {
  return Math.floor(legT * CFG.RUN_ANIM) % 2;
}

/** Mesma função do título e do jogo — só o pulinho dos frames run1/run2. */
function drawLampiao(wx, wy, face = 1, camX = 0, inAir = false, tired = false) {
  let grid;
  if (inAir) grid = SPR.hero.jump;
  else if (tired) grid = SPR.hero.tired;
  else grid = runPhase() ? SPR.hero.run2 : SPR.hero.run1;
  drawSprite(ctx, grid, wx, wy, camX, face < 0);
}

function drawHero() {
  if (state === "caught" && Math.floor(time * 12) % 2) return;
  if (p.hurtT > 0 && Math.floor(time * 12) % 2) return;
  const inAir = !p.on && coy <= 0;
  drawLampiao(p.x - 2, p.y, p.face, cam, inAir, p.tired && !inAir);
  if (p.discharging && runPhase() === 0) {
    ctx.strokeStyle = PAL.P;
    ctx.strokeRect(Math.round(p.x - 2 - cam), Math.round(p.y), 16, 20);
  }
}

function drawWolf(w) {
  const g = w.stun > 0 ? SPR.wolf.dizzy : Math.floor(w.frame) % 2 ? SPR.wolf.run2 : SPR.wolf.run1;
  drawSprite(ctx, g, w.x, w.y, cam, (w.face ?? 1) < 0);
  if (w.stun > 0) {
    text("*", w.x - cam + 14, w.y + 2, 8, PAL.Y);
    text("*", w.x - cam - 2, w.y + 6, 8, PAL.Y);
  }
}

function drawBoss() {
  if (boss.defeated) {
    // cai pra fora da tela, de ponta-cabeça
    const t = time - boss.defeatAt;
    if (t > 1.2) return;
    const g = SPR.boss.idle.slice().reverse();
    drawSprite(ctx, g, boss.x, boss.y - 20 * t + 220 * t * t, cam);
    return;
  }
  if (!boss.active && p.x < 320 * T) return;
  // pisca logo depois de levar pisão
  if (boss.hitCd > 0 && Math.floor(time * 16) % 2) return;
  const bob = Math.floor(time * 3) % 2;
  const g = bob ? SPR.boss.idle2 : SPR.boss.idle;
  drawSprite(ctx, g, boss.x, boss.y + bob, cam);

  if (boss.active) {
    for (let i = 0; i < CFG.BOSS_HP; i++) {
      const hx = boss.x - cam + 3 + i * 7;
      fill(hx, boss.y - 9, 6, 5, PAL.K);
      fill(hx + 1, boss.y - 8, 4, 3, i < boss.hp ? PAL.R : PAL.b);
    }
  }
}

function drawTitle() {
  fill(0, 0, VW, VH, "rgba(28,34,64,0.45)");
  text("As Super Renováveis", VW / 2, 58, 14, PAL.Y);
  text("Guarde o sol de hoje para a noite.", VW / 2, 78, 8, PAL.W);
  if (Math.floor(time * 2) % 2 === 0) text("Aperte Espaço / Toque para jogar", VW / 2, 120, 8, PAL.P);
  drawLampiao(VW / 2 - 8, GROUND_Y - 20, 1, 0, false, false);
}

function drawEnding() {
  const et = time - endingAt;
  // céu noite (slide 8)
  fill(0, 0, VW, VH, "#1d2650");
  for (let i = 0; i < 40; i++) {
    if ((i + Math.floor(time * 1.5)) % 7) fill((i * 73) % VW, (i * 37) % 70 + 4, 1, 1, PAL.W);
  }
  // lua crescente na posição/proporção do slide
  disc(284, 27, 10, PAL.L);
  disc(289, 24, 9, "#1d2650");

  // chão na mesma altura do jogo (faixa fina de grama + terra até embaixo)
  for (let x = 0; x < VW; x += T) {
    drawSprite(ctx, SPR.grass.f1, x, GROUND_Y, 0);
    for (let y = GROUND_Y + T; y < VH; y += T) {
      drawSprite(ctx, SPR.grass.dirt, x, y, 0);
    }
    const last = GROUND_Y + T + Math.floor((VH - GROUND_Y - T) / T) * T;
    if (last < VH) fill(x, last, T, VH - last, PAL.D);
  }

  const lit = et < END_FIRST_AT ? 0 : Math.min(3, 1 + Math.floor((et - END_FIRST_AT) / END_HOUSE_SEC));
  const HOUSE_S = 2;
  const HOUSE_W = 16 * HOUSE_S;
  const HOUSE_H = 13 * HOUSE_S;
  const houses = [120, 180, 240];
  const houseY = GROUND_Y - HOUSE_H;
  const labels = [
    "Ana termina o dever de casa.",
    "A comida da família continua gelada.",
    "A mercearia da Dona Lúcia fica aberta.",
  ];

  // painéis 44×61, medidos proporcionalmente no mock do GDD
  houses.forEach((hx) => {
    ctx.fillStyle = "rgba(105,91,91,0.42)";
    ctx.fillRect(hx - 6, 83, 44, GROUND_Y - 83);
  });

  // subestação + cabo amarelo (slide)
  const subX = 65;
  fill(subX, GROUND_Y - 28, 12, 28, PAL.K);
  fill(subX + 2, GROUND_Y - 26, 8, 24, PAL.g);
  fill(subX + 4, GROUND_Y - 22, 4, 4, lit > 0 ? PAL.Y : PAL.b);
  if (lit > 0) {
    const hx = houses[Math.min(2, lit - 1)];
    fill(subX + 12, GROUND_Y - 3, hx + 4 - (subX + 12), 2, PAL.Y);
  }

  drawSprite(ctx, SPR.hero.idle, 43, GROUND_Y - 20, 0);

  houses.forEach((hx, i) => {
    if (i < lit) {
      ctx.fillStyle = "rgba(255,210,63,0.18)";
      ctx.fillRect(hx - 3, houseY - 3, HOUSE_W + 6, HOUSE_H + 4);
    }
    drawSprite(ctx, i < lit ? SPR.house.on : SPR.house.off, hx, houseY, 0, false, HOUSE_S);
  });

  // três células quadradas no canto, iguais às do slide
  for (let i = 0; i < 3; i++) {
    const bx = 8 + i * 11;
    fill(bx, 8, 9, 9, PAL.W);
    fill(bx + 1, 9, 7, 7, i < 3 - lit ? PAL.P : PAL.b);
  }

  if (lit >= 1 && lit <= 3 && et < END_QUOTE_AT) {
    bubble(labels[lit - 1], houses[lit - 1] + HOUSE_W / 2 + cam, houseY);
  }

  if (et > END_QUOTE_AT) {
    fill(16, 36, VW - 32, 48, "rgba(28,34,64,0.92)");
    wrap(QUOTE, VW / 2, 50, VW - 44, 8, PAL.W);
    if (et > END_ADVANCE_AT && Math.floor(time * 2) % 2 === 0) {
      text("Espaço / toque: cartões", VW / 2, VH - 14, 8, PAL.P);
    }
  }
}

function wrap(str, x, y, maxW, size, color) {
  const words = str.split(" ");
  let line = "";
  let yy = y;
  ctx.font = `${size}px "Pixelify Sans","Press Start 2P",monospace`;
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW) {
      text(line, x, yy, size, color);
      line = w;
      yy += size + 4;
    } else line = test;
  });
  if (line) text(line, x, yy, size, color);
}

function drawCards() {
  fill(0, 0, VW, VH, "#1d2650");
  const c = CARDS[cardIdx];
  text(`CARTÃO ${cardIdx + 1}/3`, VW / 2, 28, 8, PAL.Y);
  text(c.title, VW / 2, 52, 10, PAL.W);
  wrap(c.text, VW / 2, 78, VW - 40, 8, PAL.G);
  text("Espaço / toque", VW / 2, VH - 16, 8, PAL.P);
}

function drawDone() {
  fill(0, 0, VW, VH, "#1d2650");
  text("Vila acesa!", VW / 2, 60, 14, PAL.Y);
  text(`Você levou ${delivered} de energia para a vila`, VW / 2, 90, 8, PAL.W);
  text("Espaço / toque: jogar de novo", VW / 2, 130, 8, PAL.P);
}

function beginFrame() {
  ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function draw() {
  beginFrame();

  if (state === "ending") {
    drawEnding();
    return;
  }
  if (state === "cards") {
    drawCards();
    return;
  }
  if (state === "done") {
    drawDone();
    return;
  }

  drawSky();
  drawGround();
  drawDecor();

  pickups.forEach((c) => {
    if (c.got) return;
    const g =
      c.type === "sun"
        ? Math.floor(time * 4) % 2
          ? SPR.sun.f2
          : SPR.sun.f1
        : Math.floor(time * 4) % 2
          ? SPR.wind.f2
          : SPR.wind.f1;
    drawSprite(ctx, g, c.x, c.y, cam);
  });

  hazards.forEach((h) => {
    if (!h.dead) drawSprite(ctx, SPR.co2.f1, h.x, h.y, cam);
  });
  papers.forEach((pr) => drawSprite(ctx, SPR.paper.f1, pr.x, pr.y, cam));
  bossClouds.forEach((c) => drawSprite(ctx, SPR.co2.f1, c.x, c.y, cam));

  if (wolvesOn) wolves.forEach(drawWolf);
  drawBoss();
  if (state === "play" || state === "caught") drawHero();

  drawHud();

  if (state === "play" || state === "caught") drawMsg();

  if (state === "title") drawTitle();
}

// atalho de debug: ?zone=B|C|D|boss|ending|cards
const zoneJump = new URLSearchParams(location.search).get("zone");
if (zoneJump) {
  start();
  if (zoneJump === "ending" || zoneJump === "cards") {
    delivered = 90;
    endingAt = time;
    state = zoneJump === "cards" ? "cards" : "ending";
    cardIdx = 0;
  } else {
    const tx = zoneJump === "boss" ? 348 : zoneJump === "D" ? 265 : zoneJump === "C" ? 175 : zoneJump === "B" ? 85 : 2;
    p.x = tx * T;
    p.y = GROUND_Y - 20;
    p.energy = 90;
    p.battery = 60;
    cam = clampCam(p.x);
  if (tx >= 80) {
    wolvesOn = true;
    placeWolvesBehind();
  }
    if (tx >= 350) boss.active = true;
  }
}

let litHeard = 0;

/** Trilha por momento do jogo + zumbido da bateria + "plim" das janelas no final. */
function updateAudio() {
  const ending = state === "ending" || state === "cards" || state === "done";
  const inGame = state === "play" || state === "caught";
  // no título (Escape) a música para; volta ao retomar
  setMusic(ending ? "ending" : !inGame ? null : p.x >= 255 * T ? "night" : "day");
  setHum(state === "play" && p.discharging);
  if (state === "ending") {
    const et = time - endingAt;
    const lit = et < END_FIRST_AT ? 0 : Math.min(3, 1 + Math.floor((et - END_FIRST_AT) / END_HOUSE_SEC));
    if (lit > litHeard) sfx("plim");
    litHeard = lit;
  } else litHeard = 0;
}

// evita loop duplicado no hot-reload (senão a animação fica 2× mais rápida)
if (window.__srRaf) cancelAnimationFrame(window.__srRaf);
lastTs = 0;
(function loop(ts) {
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  update(dt);
  updateAudio();
  draw();
  window.__srRaf = requestAnimationFrame(loop);
})(0);
