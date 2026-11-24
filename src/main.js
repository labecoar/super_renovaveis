/**
 * As Super Renováveis — GDD v0.1 + retificação 01
 * Duas fases com mapa entre elas, cata-vento no Zé Voltinho, lobos negociando na frente.
 * Lógica em 320×180; canvas renderiza em 2× (640×360) pra ficar mais nítido.
 */
import { PAL, SPR, drawPin, drawSprite, drawTurbine, gridSize } from "./sprites.js";
import { initAudio, isMuted, setHum, setMusic, sfx, toggleMute } from "./audio.js";
import { OPENING_COUNT, drawOpening, openingFrame, openingMusic } from "./opening.js";

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
  WOLF_SPEED: 1.45, // perseguição, igual à corrida do Zé Voltinho
  WOLF_CHARGE: 60 / 60, // investida, px por frame
  WOLF_ALERT: 96, // 6 tiles
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
/** Corte no pôr do sol (checkpoint 3 do GDD). Fase 2 recomeça neste tile. */
const PHASE2_START = 260;
const TOWER_TX = 258;
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

/** Antes do mapa: objetivo, energia, inimigos e controles. Cada tela tem um retrato. */
const LESSONS = [
  {
    kicker: "OBJETIVO",
    title: "Acender a vila",
    scene: "goal",
    lines: [
      "Leve o sol e o vento até a vila.",
      "De dia você junta. De noite, usa o que guardou.",
    ],
  },
  {
    kicker: "ENERGIA",
    title: "A barra e a bateria",
    scene: "energy",
    lines: [
      "Correr gasta a barra. Sóis e ventos enchem.",
      "O que sobra fica na bateria, para a noite.",
    ],
  },
  {
    kicker: "LOBOS",
    title: "Eles querem o gás",
    scene: "wolves",
    lines: [
      "Negociam, depois correm e jogam papel.",
      "Pule na cabeça. Encostar gasta muita energia.",
    ],
  },
  {
    kicker: "CHEFÃO",
    title: "O chefe da noite",
    scene: "boss",
    lines: [
      "No fim da noite ele tranca a subestação.",
      "Três pulos na cabeça. A fumaça também dói.",
    ],
  },
  {
    kicker: "COMO JOGAR",
    title: "Andar, pular, chegar",
    scene: "play",
    lines: [
      "Setas, A e D andam. Espaço pula.",
      "No celular, use os botões. A torre fecha o dia.",
    ],
  },
];

const cv = document.getElementById("c");
const ctx = cv.getContext("2d");
/** Escala total do mundo→pixel físico (SCALE × fit CSS × DPR arredondado). */
let viewScale = SCALE;

/**
 * Escala + Retina:
 * - mede a chrome real (título, film, toque) em vez de chute fixo
 * - buffer do canvas × DPR pra 1 pixel lógico = N pixels físicos
 */
function chromeH(el) {
  if (!el || el.hidden || getComputedStyle(el).display === "none") return 0;
  return el.getBoundingClientRect().height;
}

function fitIntegerScale() {
  const dpr = Math.max(1, Math.round(window.devicePixelRatio) || 1);
  const touch = matchMedia("(hover: none) and (pointer: coarse)").matches;
  const stage = document.querySelector(".stage");
  const bezel = document.querySelector(".bezel");
  const film = document.querySelector(".film");
  const touchBar = document.querySelector(".touch");
  const topbar = document.querySelector(".topbar");
  const hint = document.querySelector(".hint");
  const vv = window.visualViewport;
  const viewW = vv?.width || window.innerWidth;
  const viewH = vv?.height || window.innerHeight;
  const stageW = stage ? stage.clientWidth : viewW;
  const bezelPad = bezel
    ? (parseFloat(getComputedStyle(bezel).paddingLeft) || 0) * 2 + 4
    : touch
      ? 24
      : 28;
  const gap = touch ? 6 : 14;
  // body.is-opening / film visível — evita pegar `state` antes do init
  const opening = document.body.classList.contains("is-opening") || (film && !film.hidden);
  const topbarFlow =
    topbar && getComputedStyle(topbar).position !== "absolute" ? chromeH(topbar) : 0;
  // controles ficam embaixo do canvas (nunca por cima das falas)
  const extras =
    topbarFlow +
    (opening ? chromeH(film) || (touch ? 40 : 0) : 0) +
    (!opening ? chromeH(touchBar) : 0) +
    chromeH(hint) +
    gap * (opening || touch ? 2 : 3) +
    (touch ? 4 : 24);
  const availW = Math.max(160, Math.min(stageW, viewW) - bezelPad);
  const availH = Math.max(90, viewH - extras - bezelPad);
  const baseW = VW * SCALE;
  const baseH = VH * SCALE;
  const ratio = Math.min(availW / baseW, availH / baseH);
  // PC: ~80% do espaço livre, podendo passar de 640×360. Celular: preenche o que sobrou.
  const fit = touch
    ? Math.max(0.25, Math.min(ratio, 1.35))
    : Math.max(0.3, Math.min(ratio, 1), ratio * 0.8);

  const k = Math.max(1, Math.ceil(fit * dpr));
  const cssW = Math.floor(baseW * fit);
  const cssH = Math.floor(baseH * fit);
  cv.style.width = `${cssW}px`;
  cv.style.height = `${cssH}px`;
  cv.width = baseW * k;
  cv.height = baseH * k;
  viewScale = SCALE * k;
  ctx.imageSmoothingEnabled = false;
}
fitIntegerScale();
addEventListener("resize", fitIntegerScale);
addEventListener("orientationchange", () => setTimeout(fitIntegerScale, 80));
visualViewport?.addEventListener("resize", fitIntegerScale);

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
let tables = [];
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

// Fase 2 · rajadas raras no meio da noite (chão livre, pulo baixo). A bateria continua sendo o grosso.
[
  [284, 6],
  [298, 6],
  [311, 6],
  [322, 6],
  [337, 6],
  [346, 6],
].forEach(([x, y]) => addPickup("wind", x, y));
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

/** Encontros da retificação: negociam na frente, só depois perseguem. */
const WOLF_GROUPS = {
  1: [
    {
      tile: 96,
      table: true,
      lines: ["Fechado! Mais 30 anos de gás.", "Assina aqui, é rapidinho."],
      wolves: [
        { dx: -18, face: 1, behind: false },
        { dx: 26, face: -1, behind: true },
      ],
    },
    {
      tile: 186,
      table: false,
      lines: ["Essa turbina aí… dá pra trocar por gás."],
      wolves: [{ dx: 0, face: -1, behind: false }],
    },
  ],
  2: [
    {
      tile: 272, // pouco depois do começo da fase 2, pra mesa aparecer negociando
      table: true,
      lamp: true,
      lines: ["Ele guardou energia? Impossível!", "Amanhã a gente fecha com o Chefe."],
      wolves: [
        { dx: -18, face: 1, behind: false },
        { dx: 26, face: -1, behind: true },
        { dx: 46, face: -1, behind: true },
      ],
    },
  ],
};

function spawnWolves(which) {
  wolves = [];
  tables = [];
  for (const g of WOLF_GROUPS[which]) {
    let table = null;
    if (g.table) {
      table = { x: g.tile * T, y: GROUND_Y - 10, w: 24, h: 10, lamp: !!g.lamp };
      tables.push(table);
    }
    const base = table ? table.x : g.tile * T;
    g.wolves.forEach((spec, i) => {
      const x = base + spec.dx;
      wolves.push({
        x,
        y: GROUND_Y - 20,
        homeX: x,
        homeY: GROUND_Y - 20,
        w: 16,
        h: 20,
        estado: "negociando",
        t: 0,
        vy: 0,
        face: spec.face,
        homeFace: spec.face,
        behind: !!spec.behind,
        frame: i * 0.4,
        talk: 0.6 + i * 2,
        linei: i,
        lines: g.lines,
        paperCd: 1.2 + i,
        stun: 0,
        yelled: false,
      });
    });
  }
}

/** Buraco: quem ainda não viu o Lampião volta pra mesa; quem já entrou na briga reaparece atrás. */
function restoreWolves() {
  wolves.forEach((w, i) => {
    w.stun = 0;
    w.vy = 0;
    w.y = w.homeY;
    if (p.x + 40 < w.homeX) {
      w.estado = "negociando";
      w.x = w.homeX;
      w.face = w.homeFace;
      w.t = 0;
      w.yelled = false;
    } else {
      w.estado = "perseguicao";
      w.face = 1;
      w.x = p.x - 70 - i * 22;
      w.yelled = true;
      w.talk = 2;
    }
  });
}

/* ===== estado ===== */
const keys = {};
let state = "opening";
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
let phase = 1;
let fasesConcluidas = 0;
let carried = { energy: CFG.ENERGY_START, battery: 0 };
let windSpin = 0;
let mapT = 0;
let mapSkip = false;
let phaseClearT = 0;
let introIdx = 0;
let settingsOpen = false;
let openIdx = 0;
let openT = 0;
let openSkip = false;
let openPlaying = true;
const reduceOpen = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduceOpen) {
  openT = openingFrame(0).dur - 0.6;
  openSkip = true;
}

/** Volta pro cartaz final da abertura, sem repetir os 10 quadros. */
function showOpeningTitle() {
  state = "opening";
  openIdx = OPENING_COUNT - 1;
  openT = 2.2;
  openSkip = true;
  openPlaying = true;
  msg = null;
}

function enterOpening(i) {
  openIdx = Math.max(0, Math.min(OPENING_COUNT - 1, i));
  openT = reduceOpen ? openingFrame(openIdx).dur - 0.6 : 0;
  openSkip = reduceOpen;
}

function restartOpening() {
  openPlaying = true;
  enterOpening(0);
}

function prevOpening() {
  if (openIdx <= 0) {
    openT = 0;
    openSkip = false;
    return;
  }
  enterOpening(openIdx - 1);
}

function nextOpening() {
  if (openIdx >= OPENING_COUNT - 1) {
    openMap();
    return;
  }
  enterOpening(openIdx + 1);
}

function advanceOpening() {
  const frame = openingFrame(openIdx);
  if (frame.text && !openSkip && (openT - 0.5) * 30 < frame.chars) {
    openSkip = true;
    openT = Math.max(openT, 0.5);
    return;
  }
  nextOpening();
}

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
  restoreWolves();
  msg = null;
}

function clampCam(x) {
  const min = phase === 2 ? PHASE2_START * T : 0;
  const worldEnd = phase === 1 ? (TOWER_TX + 6) * T : MAP_W * T;
  return Math.max(min, Math.min(Math.max(min, worldEnd - VW), x - 100));
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
  say("Zé Voltinho, ontem a geladeira desligou de novo!", null);
  cardIdx = 0;
  delivered = 0;
  slowT = 0;
  endingAt = 0;
  wolvesOn = false;
  said = {};
  // legT NÃO zera — mantém o mesmo ritmo da tela inicial
  jumpLock = 0.2;
  windSpin = 0;
  phase = 1;
  papers = [];
  bossClouds = [];
  spawnWolves(1);
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

function openMap() {
  if (state === "map") return;
  state = "map";
  mapT = 0;
  mapSkip = false;
  jumpLock = 0.2;
  msg = null;
}

function confirmMap() {
  if (fasesConcluidas <= 0) beginPhase(1);
  else if (fasesConcluidas === 1) beginPhase(2);
  else beginEnding();
}

function onMapAction() {
  const t1 = MAP_DOTS[fasesConcluidas].length * 0.06;
  const settled = mapSkip || mapT >= t1 + 2;
  if (settled) confirmMap();
  else mapSkip = true;
}

function beginPhase(n) {
  if (n === 1) {
    phase = 1;
    reset();
    state = "play";
    jumpLock = 0.25;
    return;
  }
  phase = 2;
  windSpin = 0;
  p.x = PHASE2_START * T + 22;
  p.y = GROUND_Y - 20;
  p.vx = 0;
  p.vy = 0;
  p.on = true;
  p.face = 1;
  p.energy = Math.max(carried.energy, CFG.CHECKPOINT_MIN_ENERGY);
  p.battery = carried.battery;
  p.tired = p.energy <= 0;
  p.discharging = false;
  p.hurtT = 0;
  p.cp = { x: p.x, y: p.y, energy: p.energy, battery: p.battery };
  papers = [];
  bossClouds = [];
  msg = null;
  said = {};
  slowT = 0;
  catchT = 0;
  wolvesOn = false;
  boss.active = false;
  boss.cloudCd = 1.2;
  boss.alt = 0;
  boss.hp = CFG.BOSS_HP;
  boss.hitCd = 0;
  boss.defeated = false;
  boss.defeatAt = 0;
  boss.talk = 1.5;
  spawnWolves(2);
  checkpoints.forEach((cp) => {
    if (Math.abs(cp.x - PHASE2_START * T) <= T) {
      cp.reached = true;
      cp.save = { x: p.cp.x, y: p.cp.y, energy: p.cp.energy, battery: p.cp.battery };
    }
  });
  cam = clampCam(p.x);
  state = "play";
  jumpLock = 0.25;
}

function beginEnding() {
  endingAt = time;
  state = "ending";
  msg = null;
}

function finishPhase() {
  carried.energy = p.energy;
  carried.battery = p.battery;
  if (phase === 2) delivered = Math.round(p.energy + p.battery);
  fasesConcluidas = phase;
  phaseClearT = 1.25;
  state = "phaseClear";
  msg = null;
  sfx("plim");
}

function advanceIntro() {
  introIdx++;
  if (introIdx >= LESSONS.length) openMap();
}

function start() {
  if (state === "play" || state === "caught" || state === "ending" || state === "map" || state === "phaseClear" || state === "intro") return;
  if (state === "cards") {
    cardIdx++;
    if (cardIdx >= CARDS.length) state = "done";
    return;
  }
  fasesConcluidas = 0;
  carried.energy = CFG.ENERGY_START;
  carried.battery = 0;
  openMap();
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
    syncSoundButton();
    return;
  }
  if (k === "escape") {
    if (settingsOpen) {
      closeSettings();
      return;
    }
    if (state === "opening") {
      if (openIdx < OPENING_COUNT - 1) showOpeningTitle();
      return;
    }
    if (state === "play") showOpeningTitle();
    return;
  }
  if (settingsOpen) return;
  if (state === "opening" && k === "arrowleft") {
    prevOpening();
    return;
  }
  if (state === "opening" && k === "arrowright") {
    nextOpening();
    return;
  }
  if ([" ", "z", "arrowup", "w", "enter"].includes(k)) pressAction();
});

/** Pular / começar / avançar o final — teclado e botão de toque. */
function pressAction() {
  if (settingsOpen) return;
  if (state === "opening") {
    advanceOpening();
    return;
  }
  if (state === "intro") {
    advanceIntro();
    return;
  }
  if (state === "map") {
    onMapAction();
    return;
  }
  if (state === "phaseClear") {
    openMap();
    return;
  }
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

const gearBtn = document.querySelector(".gear");
const settingsPanel = document.querySelector(".settings");
const soundBtn = document.querySelector(".settings .sound");
const settingsClose = document.querySelector(".settings-close");

function syncSoundButton() {
  if (!soundBtn) return;
  const on = !isMuted();
  soundBtn.textContent = on ? "Ligado" : "Desligado";
  soundBtn.setAttribute("aria-pressed", String(on));
  gearBtn?.classList.toggle("is-muted", !on);
}

function openSettings() {
  settingsOpen = true;
  if (settingsPanel) settingsPanel.hidden = false;
  gearBtn?.setAttribute("aria-expanded", "true");
  syncSoundButton();
}

function closeSettings() {
  settingsOpen = false;
  if (settingsPanel) settingsPanel.hidden = true;
  gearBtn?.setAttribute("aria-expanded", "false");
}

if (gearBtn && settingsPanel && soundBtn) {
  syncSoundButton();
  gearBtn.addEventListener("pointerdown", (e) => {
    initAudio();
    e.preventDefault();
    e.stopPropagation();
    if (settingsOpen) closeSettings();
    else openSettings();
  });
  settingsPanel.addEventListener("pointerdown", (e) => e.stopPropagation());
  soundBtn.addEventListener("pointerdown", (e) => {
    initAudio();
    e.preventDefault();
    e.stopPropagation();
    toggleMute();
    syncSoundButton();
  });
  settingsClose?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeSettings();
  });
}

const filmBar = document.querySelector(".film");
const filmPause = document.getElementById("film-pause");

function syncFilm() {
  if (!filmBar) return;
  const opening = state === "opening";
  const wasHidden = filmBar.hidden;
  filmBar.hidden = !opening;
  document.body.classList.toggle("is-opening", opening);
  document.body.classList.toggle("is-touch", matchMedia("(hover: none) and (pointer: coarse)").matches);
  if (!filmPause) return;
  const pauseIco = filmPause.querySelector(".film-ico");
  const pauseTxt = filmPause.querySelector(".film-txt");
  if (pauseIco) pauseIco.textContent = openPlaying ? "❚❚" : "▶";
  if (pauseTxt) pauseTxt.textContent = openPlaying ? "Pausar" : "Continuar";
  filmPause.setAttribute("aria-label", openPlaying ? "Pausar" : "Continuar");
  filmPause.setAttribute("aria-pressed", String(!openPlaying));
  if (wasHidden !== filmBar.hidden) fitIntegerScale();
}

function bindFilm(btn, fn) {
  btn?.addEventListener("pointerdown", (e) => {
    initAudio();
    e.preventDefault();
    e.stopPropagation();
    fn();
    syncFilm();
  });
}

bindFilm(document.getElementById("film-prev"), prevOpening);
bindFilm(document.getElementById("film-next"), nextOpening);
bindFilm(document.getElementById("film-restart"), restartOpening);
bindFilm(filmPause, () => {
  openPlaying = !openPlaying;
});
syncFilm();
fitIntegerScale();

addEventListener("pointerdown", () => {
  initAudio();
  if (settingsOpen) {
    closeSettings();
    return;
  }
  if (state === "opening") {
    advanceOpening();
    return;
  }
  if (state === "intro") {
    advanceIntro();
    return;
  }
  if (state === "map") {
    onMapAction();
    return;
  }
  if (state === "phaseClear") {
    openMap();
    return;
  }
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

/** Barra e bateria zeradas: o próximo agarre manda de volta ao checkpoint. */
function dryHero() {
  return p.energy <= 0 && p.battery <= 0;
}

/** Lobo encosta: tira carga e empurra. Sem energia, volta ao último ponto. */
function wolfHit(w) {
  if (dryHero()) {
    sfx("hurt");
    catchHero("Sem energia! Volta e tenta de novo.");
    return;
  }
  drainCharge(CFG.WOLF_HIT);
  p.tired = dryHero();
  sfx("hurt");
  const dir = p.x >= w.x ? 1 : -1;
  p.x += dir * 18;
  p.vx = dir * 2.2;
  p.vy = -2.4;
  w.stun = CFG.WOLF_HIT_STUN;
  w.face = -dir; // sai pra longe; só volta ao deixar a tela
  say(p.tired ? "Tô sem energia…" : "Te peguei! Assina aqui.", p.tired ? null : w, 2);
}

function update(dt) {
  if (settingsOpen) return;
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
  if (state === "phaseClear") {
    phaseClearT -= dt;
    if (phaseClearT <= 0) openMap();
    return;
  }
  if (state === "map") {
    if (!mapSkip) mapT += dt;
    return;
  }
  if (state === "opening") {
    if (openPlaying) {
      openT += dt;
      if (openT >= openingFrame(openIdx).dur) nextOpening();
    }
    return;
  }
  if (state !== "play") return;

  if (msg && (msg.t -= dt) <= 0) msg = null;
  if (slowT > 0) slowT -= dt;
  if (windSpin > 0) windSpin -= dt;

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
  if (phase === 2) {
    if (p.x < PHASE2_START * T) p.x = PHASE2_START * T;
  } else if (p.x < 0) p.x = 0;
  if (phase === 1 && p.x > TOWER_TX * T + 4) p.x = TOWER_TX * T + 4;

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
  resolveTables();

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
      if (c.type === "wind") windSpin = 1.5;
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
    if (phase === 1 && cp.x >= PHASE2_START * T) return;
    if (phase === 2 && cp.x < PHASE2_START * T) return;
    if (!cp.reached && p.x >= cp.x) saveCp(cp);
  });

  if (phase === 1 && overlap(p, { x: TOWER_TX * T, y: GROUND_Y - 48, w: 16, h: 48 })) {
    finishPhase();
    return;
  }

  if (phase === 1 && p.x > 174 * T && !said.C && !msg) {
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

  if (phase === 2 && p.x >= SUB_X && boss.defeated) {
    finishPhase();
  }
}

function resolveTables() {
  for (const tb of tables) {
    if (!overlap(p, tb)) continue;
    const prevBottom = p.prevFeet ?? p.y + p.h;
    if (p.vy >= 0 && prevBottom <= tb.y + 5) {
      p.y = tb.y - p.h;
      p.vy = 0;
      p.on = true;
    } else if (p.x + p.w / 2 < tb.x + tb.w / 2) {
      p.x = tb.x - p.w;
      p.vx = 0;
    } else {
      p.x = tb.x + tb.w;
      p.vx = 0;
    }
  }
}

function wolfHitsTable(w) {
  return tables.some((tb) => w.x < tb.x + tb.w && w.x + w.w > tb.x && w.y + w.h > tb.y + 2 && w.y < tb.y + tb.h);
}

function tontoWolf(w) {
  w.estado = "tonto";
  w.t = CFG.WOLF_STUN;
  w.vy = 0;
  w.y = w.homeY;
  sfx("boing");
  p.vy = -3.6;
}

function wolfOnGround(w, step) {
  const look = w.face >= 0 ? w.x + w.w + 2 : w.x - 2;
  const footX = Math.floor(look / T);
  if (footX >= 0 && footX < MAP_W && !solid[GROUND][footX]) {
    w.x += w.face * 2 * step;
    w.y = GROUND_Y - 28;
  } else w.y = GROUND_Y - 20;
}

function updateWolves(dt) {
  if (boss.active) return;
  const step = dt * FRAME;
  const tile = p.x / T;
  const chasers = wolves.filter((w) => w.estado === "perseguicao" && w.stun <= 0);
  const front = chasers.slice().sort((a, b) => b.x - a.x)[0];

  wolves.forEach((w) => {
    w.frame += dt * 6;

    if (w.estado === "tonto") {
      w.t -= dt;
      if (w.t <= 0) {
        w.estado = "perseguicao";
        w.face = p.x >= w.x ? -1 : 1;
        w.yelled = true;
      }
      return;
    }
    if (w.stun > 0) {
      w.stun -= dt;
      return;
    }

    if (w.estado === "negociando") {
      w.y = w.homeY - (Math.floor(time * 2 + w.homeX) % 2);
      w.talk -= dt;
      const visible = w.x - cam > -20 && w.x - cam < VW + 20;
      if (visible && w.talk <= 0 && !msg) {
        w.talk = 2;
        say(w.lines[w.linei % w.lines.length], w);
        w.linei++;
      }
      if (w.x - p.x < CFG.WOLF_ALERT && p.x < w.x + 24) {
        w.estado = "alerta";
        w.t = 0;
        w.face = -1;
        w.y = w.homeY;
        if (!msg) say("Olha o Zé Voltinho!", w, 1.2);
      }
      return;
    }

    if (w.estado === "alerta") {
      w.t += dt;
      w.y = w.homeY;
      if (w.t > 0.5) w.estado = "investida";
      return;
    }

    if (w.estado === "investida") {
      w.face = -1;
      w.x -= CFG.WOLF_CHARGE * step;
      if (w.behind && w.vy === 0 && w.y >= w.homeY - 1 && wolfHitsTable(w)) w.vy = -200 / FRAME;
      if (w.vy !== 0 || w.y < w.homeY - 0.5) {
        w.vy = Math.min(w.vy + CFG.GRAVITY * step, CFG.MAX_FALL);
        w.y += w.vy * step;
        if (w.y >= w.homeY) {
          w.y = w.homeY;
          w.vy = 0;
        }
      } else w.y = w.homeY;
      if (overlap(p, w)) {
        if (isStomp(w)) tontoWolf(w);
        else wolfHit(w);
        return;
      }
      if (p.x > w.x + 8) {
        w.estado = "perseguicao";
        w.y = w.homeY;
        w.vy = 0;
        if (!w.yelled) {
          w.yelled = true;
          say("Pega ele!", w, 1);
        }
      }
      return;
    }

    // perseguição: segue reto e só vira depois de sair da tela
    if (w.x + w.w < cam - 2) w.face = 1;
    else if (w.x > cam + VW + 2) w.face = -1;
    w.x += w.face * CFG.WOLF_SPEED * step;
    wolfOnGround(w, step);

    if (w === front && tile >= 170 && tile < 350) {
      w.paperCd -= dt;
      if (w.paperCd <= 0) {
        w.paperCd = CFG.PAPER_EVERY;
        papers.push({
          x: w.x + 10,
          y: w.y + 4,
          vx: 2.2,
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
      if (isStomp(w)) tontoWolf(w);
      else wolfHit(w);
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
      if (dryHero()) {
        sfx("hurt");
        catchHero("Sem energia! Volta e tenta de novo.");
        return;
      }
      drainCharge(CFG.WOLF_HIT);
      p.tired = dryHero();
      sfx("hurt");
      p.x = boss.x - p.w - 30;
      p.vy = -3;
      p.hurtT = CFG.HURT_INVULN;
      say(p.tired ? "Tô sem energia…" : "Assina logo, menino!", p.tired ? null : boss, 2);
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

  tables.forEach((tb) => {
    drawSprite(ctx, SPR.mesa, tb.x, tb.y, cam);
    if (tb.lamp) {
      const lx = tb.x + tb.w + 8;
      fill(lx - cam, GROUND_Y - 36, 3, 36, PAL.K);
      fill(lx - 4 - cam, GROUND_Y - 42, 11, 7, PAL.K);
      fill(lx - 3 - cam, GROUND_Y - 41, 9, 5, Math.floor(time * 6) % 2 ? PAL.Y : PAL.y);
    }
  });

  if (phase === 1) drawGoalTower();

  // placas
  signs.forEach((s) => {
    if (phase === 1 && s.x >= PHASE2_START * T) return;
    if (phase === 2 && s.x < PHASE2_START * T) return;
    fill(s.x + 6 - cam, s.y + 10, 3, 18, PAL.d);
    fill(s.x - cam, s.y, 16, 12, PAL.D);
    fill(s.x + 2 - cam, s.y + 2, 12, 8, PAL.L);
  });

  // checkpoints
  checkpoints.forEach((cp) => {
    if (phase === 1 && cp.x >= PHASE2_START * T) return;
    if (phase === 2 && cp.x < PHASE2_START * T) return;
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

  // progresso da fase atual
  const span0 = phase === 2 ? PHASE2_START * T : 0;
  const span1 = phase === 2 ? SUB_X : TOWER_TX * T;
  fill(217, 8, 94, 8, PAL.K);
  for (let x = 0; x < 92; x++) {
    const world = span0 + (x / 91) * (span1 - span0);
    let col = mixSky(world);
    if (col[0] < 40) col = [45, 52, 96];
    ctx.fillStyle = rgb(col);
    ctx.fillRect(218 + x, 9, 1, 6);
  }
  const mark = Math.min(1, Math.max(0, (p.x - span0) / (span1 - span0)));
  fill(218 + mark * 92, 6, 3, 12, PAL.W);
  fill(308, 7, 5, 4, PAL.Y);
  fill(309, 6, 1, 10, PAL.W);
}

function drawGoalTower() {
  const x = TOWER_TX * T - cam;
  const y = GROUND_Y - 48;
  fill(x + 6, y + 8, 4, 40, PAL.K);
  fill(x + 7, y + 10, 2, 36, PAL.g);
  fill(x + 4, y + 44, 8, 4, PAL.K);
  const high = Math.floor(time * 3) % 2 === 0;
  fill(x + 10, y + 6, 2, high ? 12 : 8, PAL.K);
  fill(x + 12, y + (high ? 6 : 8), 10, high ? 6 : 4, PAL.Y);
  fill(x + 12, y + (high ? 8 : 10), 10, 2, PAL.y);
}

function runPhase() {
  return Math.floor(legT * CFG.RUN_ANIM) % 2;
}

/** Corpo + haste + cata-vento. A hitbox do corpo não muda. */
function drawLampiao(wx, wy, face = 1, camX = 0, inAir = false, tiredSprite = false, opts) {
  const o = opts || {};
  const tired = o.tired ?? tiredSprite;
  const night = o.night ?? false;
  const wind = !!(o.wind && !tired);
  const moving = o.moving ?? inAir;
  let grid;
  if (inAir) grid = SPR.hero.jump;
  else if (tiredSprite) grid = SPR.hero.tired;
  else grid = runPhase() ? SPR.hero.run2 : SPR.hero.run1;

  const pinX = wx + (face < 0 ? 8 : -8);
  const pinY = wy - 8;
  const x0 = wx + (face < 0 ? 11 : 3);
  const y0 = wy + 5;
  const x1 = pinX + 5;
  const y1 = pinY + 10;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n);
    const y = Math.round(y0 + ((y1 - y0) * i) / n);
    fill(x - camX, y, 1, 1, i % 2 ? PAL.D : PAL.K);
  }

  drawSprite(ctx, grid, wx, wy, camX, face < 0);

  let rate = 0.4;
  if (tired) rate = 0;
  else if (wind) rate = 2;
  else if (night) rate = 0;
  else if (moving) rate = 1;
  const frame = rate === 0 ? 0 : Math.floor(time * 10 * rate) % SPR.pin.length;
  drawPin(ctx, frame, pinX, pinY, camX, face < 0, tired);

  if (wind) {
    const o2 = Math.floor(time * 12) % 6;
    const dir = face < 0 ? 1 : -1;
    for (let k = 0; k < 3; k++) {
      const dx = dir * (((o2 + k * 2) % 6) + 2);
      fill(pinX + 4 + dx - camX, pinY + 2 + k * 3, 4, 1, PAL.C);
    }
  }
}

function drawHero() {
  if (state === "caught" && Math.floor(time * 12) % 2) return;
  if (p.hurtT > 0 && Math.floor(time * 12) % 2) return;
  const inAir = !p.on && coy <= 0;
  const night = phase === 2 || p.x >= 255 * T;
  drawLampiao(p.x - 2, p.y, p.face, cam, inAir, p.tired && !inAir, {
    tired: p.tired,
    night,
    wind: windSpin > 0,
    moving: Math.abs(p.vx) > 0.05,
  });
  if (p.discharging && Math.floor(time * 4) % 2 === 0) {
    ctx.strokeStyle = PAL.P;
    ctx.strokeRect(Math.round(p.x - 2 - cam), Math.round(p.y), 16, 20);
  }
}

function drawWolf(w) {
  const dizzy = w.estado === "tonto" || w.stun > 0;
  const g = dizzy ? SPR.wolf.dizzy : Math.floor(w.frame) % 2 ? SPR.wolf.run2 : SPR.wolf.run1;
  drawSprite(ctx, g, w.x, w.y, cam, (w.face ?? 1) < 0);
  if (w.estado === "alerta") drawSprite(ctx, SPR.alerta, w.x + 6, w.y - 12, cam);
  if (dizzy) {
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

const INTRO_FEET = 108;

function introChip(str, x, y, size = 6) {
  ctx.font = `${size}px "Pixelify Sans","Press Start 2P",monospace`;
  const w = Math.ceil(ctx.measureText(str).width) + 8;
  const top = Math.round(y - size - 1);
  fill(Math.round(x - w / 2), top, w, size + 4, "rgba(28,34,64,0.9)");
  text(str, x, y, size, PAL.Y);
}

function introSky(night) {
  const top = night ? [0x1d, 0x26, 0x50] : [0x8f, 0xd3, 0xf4];
  const bot = night ? [0x2a, 0x24, 0x48] : [0xc5, 0xe6, 0xf4];
  for (let i = 0; i < 12; i++) {
    const k = i / 11;
    ctx.fillStyle = rgb(top.map((v, n) => Math.round(v + (bot[n] - v) * k)));
    ctx.fillRect(0, i * 15, VW, 15);
  }
  if (night) {
    for (let i = 0; i < 16; i++) {
      if ((i + Math.floor(time * 2)) % 5) fill((i * 47 + 12) % VW, 38 + (i * 23) % 52, 1, 1, PAL.W);
    }
    disc(104, 46, 7, PAL.L);
    disc(107, 44, 6, rgb(top));
  }
}

function introGround(night) {
  ctx.fillStyle = night ? "#3c3560" : "#7aa884";
  for (let x = 0; x < VW; x++) {
    const h = Math.round(7 + 4 * Math.sin(x / 24) + 2 * Math.sin(x / 9));
    ctx.fillRect(x, INTRO_FEET - h, 1, h);
  }
  for (let x = 0; x < VW; x += T) drawSprite(ctx, SPR.grass.f1, x, INTRO_FEET, 0);
}

/** Lampião no tamanho do jogo. Parado usa o sprite idle; o pulo usa o do ar. */
function introHero(x, feet, face, pose, night) {
  const y = feet - 20;
  if (pose === "idle") {
    const flip = face < 0;
    const pinX = x + (flip ? 8 : -8);
    const pinY = y - 8;
    const x0 = x + (flip ? 11 : 3);
    const y0 = y + 5;
    const x1 = pinX + 5;
    const y1 = pinY + 10;
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) {
      const px = Math.round(x0 + ((x1 - x0) * i) / n);
      const py = Math.round(y0 + ((y1 - y0) * i) / n);
      fill(px, py, 1, 1, i % 2 ? PAL.D : PAL.K);
    }
    drawSprite(ctx, SPR.hero.idle, x, y, 0, flip);
    drawPin(ctx, night ? 0 : Math.floor(time * 4) % SPR.pin.length, pinX, pinY, 0, flip);
    return;
  }
  drawLampiao(x, y, face, 0, pose === "jump", false, { night, moving: pose === "run" });
}

function introTower(x) {
  const y = INTRO_FEET - 32;
  fill(x + 4, y + 6, 3, 26, PAL.K);
  fill(x + 5, y + 8, 1, 22, PAL.g);
  fill(x + 2, y + 28, 7, 4, PAL.K);
  const high = Math.floor(time * 3) % 2 === 0;
  fill(x + 7, y + 4, 1, high ? 8 : 6, PAL.K);
  fill(x + 8, y + (high ? 4 : 6), 8, high ? 4 : 3, PAL.Y);
  fill(x + 8, y + (high ? 6 : 8), 8, 2, PAL.y);
}

function introSub(x) {
  const y = INTRO_FEET - 26;
  fill(x, y, 14, 26, PAL.K);
  fill(x + 2, y + 2, 10, 22, PAL.g);
  fill(x + 4, y + 6, 6, 5, PAL.b);
  fill(x + 4, y + 14, 6, 8, PAL.K);
  fill(x - 12, y + 10, 12, 2, PAL.b);
}

function introKey(x, y, w, h, label, on = false) {
  fill(x + 1, y + 2, w, h, "rgba(0,0,0,0.35)");
  fill(x, y, w, h, on ? PAL.y : PAL.K);
  fill(x + 2, y + 2, w - 4, h - 4, on ? PAL.Y : PAL.W);
  if (label) text(label, x + w / 2, y + h - 5, 7, PAL.K);
}

function introArrowKey(x, y, dir, on) {
  introKey(x, y, 22, 16, "", on);
  const mid = y + 8;
  const c = PAL.K;
  if (dir < 0) {
    fill(x + 9, mid - 1, 7, 2, c);
    fill(x + 7, mid - 1, 2, 2, c);
    fill(x + 8, mid - 3, 2, 2, c);
    fill(x + 8, mid + 1, 2, 2, c);
    fill(x + 9, mid - 4, 2, 1, c);
    fill(x + 9, mid + 3, 2, 1, c);
  } else {
    fill(x + 6, mid - 1, 7, 2, c);
    fill(x + 13, mid - 1, 2, 2, c);
    fill(x + 12, mid - 3, 2, 2, c);
    fill(x + 12, mid + 1, 2, 2, c);
    fill(x + 11, mid - 4, 2, 1, c);
    fill(x + 11, mid + 3, 2, 1, c);
  }
}

function introScene(scene) {
  const bob = Math.sin(time * 3) * 2;
  const sun = Math.floor(time * 4) % 2 ? SPR.sun.f2 : SPR.sun.f1;
  const wind = Math.floor(time * 4) % 2 ? SPR.wind.f2 : SPR.wind.f1;
  if (scene === "goal") {
    introHero(28, INTRO_FEET, 1, "run", false);
    drawSprite(ctx, sun, 112, 62 + bob, 0);
    drawSprite(ctx, wind, 172, 66 - bob, 0);
    drawSprite(ctx, SPR.house.on, 250, INTRO_FEET - 26, 0, false, 2);
    introChip("sol", 116, 82);
    introChip("vento", 178, 84);
    introChip("vila", 266, 74);
  } else if (scene === "energy") {
    introHero(20, INTRO_FEET, 1, "idle", false);
    text("ENERGIA", 64, 52, 7, PAL.n, "left");
    fill(118, 44, 176, 8, PAL.K);
    fill(120, 46, 172, 4, PAL.b);
    fill(120, 46, 108, 4, PAL.Y);
    text("BATERIA", 64, 72, 7, PAL.n, "left");
    for (let i = 0; i < 3; i++) {
      drawSprite(ctx, i < 2 ? SPR.battery.full : SPR.battery.empty, 122 + i * 12, 62, 0);
    }
    drawSprite(ctx, sun, 64, 86, 0);
    drawSprite(ctx, wind, 148, 88, 0);
    introChip(`+${CFG.SUN_GAIN}`, 90, 96);
    introChip(`+${CFG.WIND_GAIN}`, 176, 98);
  } else if (scene === "wolves") {
    const talkY = INTRO_FEET - 20 + (Math.floor(time * 2) % 2);
    drawSprite(ctx, SPR.wolf.run1, 40, talkY, 0, true);
    bubble("Assina aqui.", 48 + cam, talkY);
    drawSprite(ctx, SPR.paper.f1, 124, 80 + bob, 0);
    introChip("papel", 128, 100);
    introHero(186, INTRO_FEET - 12, 1, "jump", true);
    drawSprite(ctx, SPR.wolf.dizzy, 200, INTRO_FEET - 20, 0);
    text("*", 222, 80 + bob, 8, PAL.Y);
    text("*", 234, 90 - bob, 8, PAL.Y);
    introChip("tonto", 242, 100);
  } else if (scene === "boss") {
    introHero(24, INTRO_FEET - 6, 1, "jump", true);
    drawSprite(ctx, SPR.co2.f1, 78, 82 + bob, 0);
    introChip("fumaça", 86, 100);
    const bossY = INTRO_FEET - 25 + (Math.floor(time * 3) % 2);
    const bossGrid = Math.floor(time * 3) % 2 ? SPR.boss.idle2 : SPR.boss.idle;
    drawSprite(ctx, bossGrid, 148, bossY, 0);
    const blink = Math.floor(time) % 2 === 0;
    for (let i = 0; i < 3; i++) {
      const hx = 150 + i * 8;
      fill(hx, bossY - 8, 6, 5, PAL.K);
      fill(hx + 1, bossY - 7, 4, 3, i < 2 || blink ? PAL.R : PAL.b);
    }
    introSub(276);
    introChip("subestação", 283, 74);
  } else if (scene === "play") {
    const t = time % 3.4;
    let hx = 112;
    let feet = INTRO_FEET;
    let face = 1;
    let pose = "run";
    let lit = "right";
    if (t < 1.3) {
      hx = 108 + (t / 1.3) * 72;
    } else if (t < 2) {
      const k = (t - 1.3) / 0.7;
      hx = 180;
      feet = INTRO_FEET - Math.sin(k * Math.PI) * 18;
      pose = "jump";
      lit = "jump";
    } else {
      hx = 180 - ((t - 2) / 1.4) * 72;
      face = -1;
      lit = "left";
    }
    introArrowKey(22, 58, -1, lit === "left");
    introArrowKey(48, 58, 1, lit === "right");
    introKey(22, 78, 48, 16, "espaço", lit === "jump");
    introHero(Math.round(hx), Math.round(feet), face, pose, false);
    introTower(250);
    introChip("fim do dia", 260, 70);
  }
}

function drawIntro() {
  const lesson = LESSONS[introIdx] || LESSONS[0];
  const night = lesson.scene === "wolves" || lesson.scene === "boss";
  introSky(night);
  introGround(night);
  introScene(lesson.scene);

  fill(0, 0, VW, 13, "#2f3f6e");
  fill(0, 13, VW, 1, PAL.K);
  text(lesson.kicker, 8, 10, 8, PAL.Y, "left");
  text(`${introIdx + 1}/${LESSONS.length}`, VW - 8, 10, 8, PAL.G, "right");
  fill(0, 14, VW, 16, "#1b2242");
  text(lesson.title, VW / 2, 26, 11, PAL.W);
  fill(0, 30, VW, 1, PAL.K);

  fill(0, 124, VW, 40, "rgba(28,34,64,0.94)");
  let y = 138;
  lesson.lines.forEach((line) => {
    y = wrap(line, VW / 2, y, VW - 24, 8, PAL.W);
  });

  fill(0, 164, VW, 16, "#2f3f6e");
  fill(0, 163, VW, 1, PAL.K);
  if (Math.floor(time * 2) % 2 === 0) {
    const prompt = introIdx >= LESSONS.length - 1 ? "Espaço: ver o mapa" : "Espaço / toque";
    text(prompt, VW / 2, 174, 8, PAL.P);
  }
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

  drawLampiao(43, GROUND_Y - 20, 1, 0, false, false, { night: true, moving: false });

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
  return yy + size + 6;
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

const MAP_NODES = [
  { x: 40, y: 100 },
  { x: 104, y: 138 },
  { x: 192, y: 92 },
  { x: 278, y: 92 },
];
const MAP_PATHS = [
  [[40, 100], [60, 108], [80, 124], [104, 138]],
  [[104, 138], [130, 132], [150, 112], [168, 96], [192, 92]],
  [[192, 92], [214, 104], [236, 112], [256, 104], [278, 92]],
];
function samplePath(pts, step) {
  const out = [];
  for (let s = 0; s < pts.length - 1; s++) {
    const a = pts[s];
    const b = pts[s + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / step));
    for (let i = s ? 1 : 0; i <= n; i++) {
      out.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
    }
  }
  return out;
}
const MAP_DOTS = MAP_PATHS.map((p) => samplePath(p, 5));
const MAP_WALK = MAP_PATHS.map((p) => samplePath(p, 1));
const MAP_STUMPS = [
  [72, 142], [84, 156], [90, 130], [118, 156], [128, 146],
  [96, 162], [140, 160], [76, 128], [120, 124], [110, 166],
];
const MAP_TRUNKS = [
  [170, 34], [182, 28], [196, 44], [210, 32], [178, 52], [222, 44], [190, 22], [204, 56],
];
const MAP_TREES = [
  [236, 52, 4],
  [248, 118, 5], [262, 132, 6], [274, 148, 5], [252, 156, 4],
  [286, 122, 5], [300, 136, 6], [314, 124, 4],
  [294, 154, 5], [310, 150, 6], [270, 158, 4], [238, 142, 4],
];
const MAP_HOUSES = [
  [258, 62], [284, 58], [292, 104],
];
const MAP_NAMES = ["FASE 1 · DIA DE SOL E VENTO", "FASE 2 · NOITE SEM VENTO", "VILA RENOVÁVEL"];

function lerpHex(a, b, t) {
  const hex = (s) => [1, 3, 5].map((i) => parseInt(s.substr(i, 2), 16));
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
}

function drawOverworld() {
  const st = Math.min(2, fasesConcluidas);
  const t = mapSkip ? 99 : mapT;
  const t1 = MAP_DOTS[st].length * 0.06;
  const heal1 = st >= 1 ? (st > 1 ? 1 : Math.min(1, Math.max(0, (t - t1) / 1.5))) : 0;
  const heal2 = st >= 2 ? Math.min(1, Math.max(0, (t - t1) / 1.2)) : 0;
  const land = ["#8f8775", "#9c946f", "#a3a66a", "#8fb862", "#76c05a"];

  for (let x = 0; x < 320; x += 4) {
    for (let y = 0; y < 180; y += 4) {
      const tt = Math.min(1, Math.max(0, (x + 10 * Math.sin(y / 13) + 6 * Math.sin(y / 5 + x / 9) - 60) / 200));
      fill(x, y, 4, 4, land[Math.round(tt * 4)]);
    }
  }

  // pilhas de carvão e vagonete
  const coal = (x, y, w, h) => {
    for (let i = 0; i < h; i++) {
      const ww = Math.max(2, Math.round(w * (1 - i / h)));
      fill(x + Math.floor((w - ww) / 2), y - i, ww, 1, i < 2 ? "#2b2b33" : "#1a1a22");
    }
  };
  coal(6, 158, 16, 12);
  coal(20, 160, 14, 10);
  fill(34, 156, 16, 1, "#5a4a3a");
  fill(36, 150, 12, 6, "#3a3a46");
  fill(37, 151, 10, 3, "#4b4b58");
  fill(37, 155, 3, 3, PAL.K);
  fill(44, 155, 3, 3, PAL.K);
  fill(13, 45, 40, 26, PAL.K);
  fill(14, 46, 38, 24, "#7d8297");
  for (let y = 50; y < 70; y += 5) fill(14, y, 38, 1, "#5d6178");
  [[18, 56], [30, 56], [42, 56]].forEach(([x, y]) => {
    fill(x, y, 6, 5, PAL.K);
    fill(x + 1, y + 1, 4, 3, PAL.Y);
  });
  [[20, 28], [33, 24]].forEach(([x, y]) => {
    fill(x, y, 7, 46 - y, PAL.K);
    fill(x + 1, y + 1, 5, 45 - y, "#9aa0b4");
    fill(x + 1, y + 1, 5, 2, PAL.R);
  });
  if (!(st >= 2 && heal2 >= 1)) {
    const a = st >= 2 ? 1 - heal2 : 1;
    ctx.globalAlpha = a;
    const drift = Math.floor(time * 6) % 3;
    [[24, 27, 3], [18, 25, 4], [12, 24, 4], [7, 23, 3]].forEach(([x, y, r], i) => {
      disc(x - drift, y, r, i % 2 ? "#2a2a32" : "#1a1a22");
    });
    ctx.globalAlpha = 1;
  }

  // área desmatada → mudas
  const dry = lerpHex("#b08d5c", "#8fc96a", Math.round(heal1 * 3) / 3);
  [[100, 146, 22], [78, 150, 14], [128, 152, 16]].forEach(([x, y, r]) => {
    ctx.fillStyle = dry;
    for (let dy = -r; dy <= r; dy += 2) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(x - w, y + dy, w * 2, 2);
    }
  });
  MAP_STUMPS.forEach(([x, y], i) => {
    const on = heal1 >= (i + 1) / MAP_STUMPS.length;
    drawSprite(ctx, on ? SPR.muda : SPR.toco, x - 2, y - 2, 0);
  });

  // represa
  const mud = lerpHex("#8d8a7a", "#7cc25c", heal2);
  [[180, 40, 24], [205, 36, 22], [224, 46, 16]].forEach(([x, y, r]) => {
    ctx.fillStyle = mud;
    for (let dy = -r; dy <= r; dy += 2) {
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      ctx.fillRect(x - w, y + dy, w * 2, 2);
    }
  });
  [[180, 40, 20], [205, 36, 18], [224, 46, 13]].forEach(([x, y, r]) => {
    ctx.fillStyle = "#5e8fb0";
    for (let dy = -r; dy <= r; dy += 2) {
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      ctx.fillRect(x - w, y + dy, w * 2, 2);
    }
  });
  MAP_TRUNKS.forEach(([x, y]) => {
    fill(x, y, 2, 8, "#7a746a");
    fill(x - 1, y + 2, 4, 1, "#7a746a");
  });
  fill(174, 62, 46, 8, PAL.K);
  fill(175, 63, 44, 6, "#c9c9bf");

  // vila: árvores redondas, turbinas e casas
  MAP_TREES.forEach(([x, y, r]) => {
    disc(x, y + 1, r, "#2d6b30");
    disc(x, y, r, "#3f8a3a");
    disc(x - 1, y - 1, Math.max(2, r - 2), "#72c44c");
  });
  [[266, 140], [304, 146], [256, 148], [286, 132], [312, 158]].forEach(([x, y]) => {
    fill(x, y, 2, 2, "#d6ee9a");
  });
  const lit = st >= 2 && heal2 >= 1;
  MAP_HOUSES.forEach(([x, y]) => drawSprite(ctx, lit ? SPR.house.on : SPR.house.off, x, y, 0));
  [[244, 72, 34], [272, 64, 42]].forEach(([x, base, h], k) => {
    fill(x, base - h, 2, h, PAL.W);
    fill(x - 2, base - 2, 6, 2, PAL.K);
    const hx = x + 1;
    const hy = base - h;
    const ang = time * 2.2 + k * 1.4;
    for (let i = 0; i < 3; i++) {
      const a = ang + i * 2.0944;
      for (let s = 2; s <= 10; s++) {
        fill(Math.round(hx + Math.sin(a) * s) - 1, Math.round(hy - Math.cos(a) * s) - 1, 2, 2, PAL.W);
      }
    }
    disc(hx, hy, 2, PAL.K);
    fill(hx, hy, 1, 1, PAL.W);
  });

  for (let s = 0; s < 3; s++) {
    const pts = MAP_DOTS[s];
    const shown = s < st ? pts.length : s === st ? Math.min(pts.length, Math.floor(t / 0.06)) : 0;
    pts.forEach(([x, y], i) => {
      if (i < shown) {
        fill(x - 1, y, 3, 2, "#8a6400");
        fill(x - 1, y - 1, 3, 2, PAL.Y);
      } else fill(Math.round(x), Math.round(y), 2, 2, "rgba(60,52,40,0.45)");
    });
  }

  MAP_NODES.forEach(({ x, y }, i) => {
    let col = "#9aa0b0";
    if (i === 0) col = "#c3c9d6";
    else if (i <= st) col = PAL.P;
    else if (i === st + 1 && t > t1) col = PAL.Y;
    if (i === 3) {
      fill(x + 5, y - 14, 1, 14, PAL.K);
      fill(x + 6, y - 14, 7, 5, i <= st && t > t1 ? PAL.Y : "#c3c9d6");
    }
    disc(x, y, 5, PAL.K);
    disc(x, y, 4, col);
    if (i > 0 && i <= st) {
      fill(x - 2, y, 1, 1, PAL.K);
      fill(x - 1, y + 1, 1, 1, PAL.K);
      fill(x, y, 1, 1, PAL.K);
      fill(x + 1, y - 1, 1, 1, PAL.K);
      fill(x + 2, y - 2, 1, 1, PAL.K);
    }
  });

  const wk = MAP_WALK[st];
  const prog = Math.min(1, Math.max(0, (t - (t1 + 0.4)) / 1.6));
  const [hx, hy] = wk[Math.round(prog * (wk.length - 1))];
  const moving = prog > 0 && prog < 1;
  drawLampiao(Math.round(hx) - 8, Math.round(hy) - 20, 1, 0, false, false, { moving });

  text("Termelétrica a carvão", 6, 78, 5, PAL.W, "left");
  text("Fase 1", 104, 156, 6, PAL.W);
  text("Fase 2", 192, 108, 6, PAL.W);
  text("Vila", 278, 108, 6, PAL.W);

  fill(0, 0, 320, 14, "#2f3f6e");
  fill(0, 14, 320, 1, PAL.K);
  text("RUMO À VILA", 160, 11, 8, PAL.Y);

  const blinkT = t - t1;
  if (blinkT > 0 && blinkT < 1.68 && Math.floor(blinkT / 0.28) % 2 === 0) {
    text("CAMINHO LIBERADO!", 160, 28, 9, PAL.Y);
  }

  fill(0, 164, 320, 16, "#2f3f6e");
  fill(0, 163, 320, 1, PAL.K);
  if (prog >= 1) {
    text(MAP_NAMES[st], 8, 174, 6, PAL.W, "left");
    if (Math.floor(time * 2) % 2 === 0) {
      text(st === 2 ? "Espaço para continuar" : "Espaço para jogar", 312, 174, 6, PAL.Y, "right");
    }
  }

  if (st === 1) {
    fill(196, 18, 118, 22, PAL.K);
    fill(197, 19, 116, 20, "#2f3f6e");
    text("Energia guardada", 202, 27, 6, PAL.W, "left");
    text("para a noite", 202, 35, 6, PAL.W, "left");
    for (let i = 0; i < 3; i++) {
      const full = carried.battery > i * CFG.CELL_SIZE + 0.01;
      drawSprite(ctx, full ? SPR.battery.full : SPR.battery.empty, 278 + i * 10, 22, 0);
    }
  }
}

function drawPhaseBanner() {
  fill(36, 56, VW - 72, 26, "rgba(28,34,64,0.9)");
  text("FASE CONCLUÍDA!", VW / 2, 74, 11, PAL.Y);
}

function beginFrame() {
  ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function draw() {
  syncFilm();
  beginFrame();

  if (state === "map") {
    drawOverworld();
    return;
  }
  if (state === "intro") {
    drawIntro();
    return;
  }
  if (state === "opening") {
    drawOpening(ctx, openIdx, openT, openSkip, openIdx >= OPENING_COUNT - 1);
    return;
  }

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

  const inLevel = state === "play" || state === "caught" || state === "phaseClear";
  if (inLevel) wolves.forEach(drawWolf);
  drawBoss();
  if (inLevel) drawHero();

  drawHud();

  if (inLevel) drawMsg();
  if (state === "phaseClear") drawPhaseBanner();
}

// atalho de debug: ?zone=B|C|tower|D|boss|map|map1|map2|ending|cards
const zoneJump = new URLSearchParams(location.search).get("zone");
if (zoneJump) {
  if (zoneJump === "intro") {
    introIdx = 0;
    state = "intro";
  } else if (zoneJump === "map" || zoneJump === "map1" || zoneJump === "map2") {
    fasesConcluidas = zoneJump === "map2" ? 2 : zoneJump === "map1" ? 1 : 0;
    carried = { energy: 70, battery: zoneJump === "map1" ? 60 : 30 };
    if (zoneJump === "map2") delivered = 80;
    openMap();
  } else if (zoneJump === "ending" || zoneJump === "cards") {
    delivered = 90;
    endingAt = time;
    state = zoneJump === "cards" ? "cards" : "ending";
    cardIdx = 0;
  } else if (zoneJump === "D" || zoneJump === "boss" || zoneJump === "fase2") {
    carried = { energy: 80, battery: 60 };
    beginPhase(2);
    if (zoneJump === "boss") {
      p.x = 340 * T;
      p.y = GROUND_Y - 20;
      cam = clampCam(p.x);
      wolves.forEach((w, i) => {
        w.estado = "perseguicao";
        w.face = 1;
        w.x = p.x - 80 - i * 24;
        w.yelled = true;
      });
      boss.active = true;
    }
  } else {
    beginPhase(1);
    const tx = zoneJump === "tower" ? 248 : zoneJump === "C" ? 178 : zoneJump === "B" ? 84 : 2;
    p.x = tx * T;
    p.y = GROUND_Y - 20;
    p.energy = 90;
    p.battery = 45;
    cam = clampCam(p.x);
  }
}

let litHeard = 0;

/** Trilha por momento do jogo + zumbido da bateria + "plim" das janelas no final. */
function updateAudio() {
  const ending = state === "ending" || state === "cards" || state === "done";
  const inGame = state === "play" || state === "caught" || state === "phaseClear";
  const night = inGame && (phase === 2 || p.x >= 255 * T);
  const bed =
    state === "opening"
      ? openingMusic(openIdx)
      : state === "intro"
        ? "day"
        : state === "map"
          ? fasesConcluidas >= 1
            ? "night"
            : "day"
          : null;
  setMusic(ending ? "ending" : bed || (inGame ? (night ? "night" : "day") : null));
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
