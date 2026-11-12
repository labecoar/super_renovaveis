/**
 * Áudio chiptune 100% sintetizado (Web Audio API) — sem arquivos.
 * Só liga depois do primeiro toque/tecla (regra dos navegadores).
 */

let ac = null;
let master;
let musicBus;
let sfxBus;
let hum = null;
let muted = localStorage.getItem("sr-muted") === "1";

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export function initAudio() {
  if (ac) {
    if (ac.state === "suspended") ac.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ac.destination);
  musicBus = ac.createGain();
  musicBus.gain.value = 0.32;
  musicBus.connect(master);
  sfxBus = ac.createGain();
  sfxBus.gain.value = 0.7;
  sfxBus.connect(master);
  setInterval(schedule, 25);
}

export function toggleMute() {
  muted = !muted;
  localStorage.setItem("sr-muted", muted ? "1" : "0");
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.5, ac.currentTime, 0.02);
  return muted;
}

export const isMuted = () => muted;

/* ===== blocos ===== */

function tone({ type = "square", f, f2, dur = 0.1, vol = 0.3, at = 0, bus = sfxBus }) {
  if (!ac) return;
  const t = ac.currentTime + at;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

let noiseBuf = null;
function noise({ dur = 0.2, vol = 0.3, at = 0, type = "lowpass", f = 1200, f2 }) {
  if (!ac) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime + at;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const fl = ac.createBiquadFilter();
  fl.type = type;
  fl.frequency.setValueAtTime(f, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(fl).connect(g).connect(sfxBus);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/* ===== efeitos (lista do GDD) ===== */

const SFX = {
  jump: () => tone({ f: 300, f2: 620, dur: 0.12, vol: 0.18 }),
  sun: () => {
    tone({ f: 1046, dur: 0.07, vol: 0.16 });
    tone({ f: 1568, dur: 0.12, vol: 0.16, at: 0.06 });
  },
  wind: () => noise({ dur: 0.35, vol: 0.35, type: "bandpass", f: 400, f2: 2400 }),
  cell: () => [523, 659, 784, 1046].forEach((f, i) => tone({ type: "triangle", f, dur: 0.1, vol: 0.3, at: i * 0.07 })),
  cough: () => {
    noise({ dur: 0.12, vol: 0.45, f: 900 });
    noise({ dur: 0.16, vol: 0.4, f: 700, at: 0.16 });
  },
  paper: () => noise({ dur: 0.09, vol: 0.35, type: "highpass", f: 2500 }),
  boing: () => tone({ type: "triangle", f: 160, f2: 640, dur: 0.18, vol: 0.4 }),
  bossHit: () => {
    tone({ type: "triangle", f: 120, f2: 480, dur: 0.2, vol: 0.45 });
    noise({ dur: 0.1, vol: 0.25, f: 500 });
  },
  hurt: () => tone({ f: 420, f2: 110, dur: 0.3, vol: 0.2 }),
  fall: () => tone({ type: "triangle", f: 700, f2: 90, dur: 0.6, vol: 0.3 }),
  checkpoint: () => [659, 988].forEach((f, i) => tone({ type: "triangle", f, dur: 0.12, vol: 0.25, at: i * 0.09 })),
  victory: () =>
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone({ f, dur: 0.14, vol: 0.18, at: i * 0.1 })),
  plim: () => {
    tone({ type: "sine", f: 1568, dur: 0.5, vol: 0.3 });
    tone({ type: "sine", f: 2093, dur: 0.6, vol: 0.18, at: 0.05 });
  },
};

export function sfx(name) {
  if (ac && SFX[name]) SFX[name]();
}

/** Zumbido baixo enquanto a bateria descarrega. */
export function setHum(on) {
  if (!ac) return;
  if (!hum) {
    const o = ac.createOscillator();
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    const g = ac.createGain();
    o.type = "sawtooth";
    o.frequency.value = 55;
    lfo.frequency.value = 6;
    lfoGain.gain.value = 3;
    lfo.connect(lfoGain).connect(o.frequency);
    g.gain.value = 0;
    const fl = ac.createBiquadFilter();
    fl.type = "lowpass";
    fl.frequency.value = 300;
    o.connect(fl).connect(g).connect(sfxBus);
    o.start();
    lfo.start();
    hum = { g, on: false };
  }
  if (hum.on === on) return;
  hum.on = on;
  hum.g.gain.setTargetAtTime(on ? 0.06 : 0, ac.currentTime, 0.08);
}

/* ===== música ===== */

// melodia do dia (colcheias, 32 passos); null = pausa
const MEL = [
  72, null, 76, 79, 77, 76, 74, null, 72, null, 76, 79, 81, null, 79, null,
  77, null, 81, 84, 83, 81, 79, null, 77, 76, 74, 76, 72, null, null, null,
];
// baixo: uma nota a cada 4 passos
const BASS = [48, 43, 48, 43, 41, 43, 48, 48];

// final: arpejos calmos C – Am – F – G
const END_CHORDS = [
  [60, 64, 67, 72],
  [57, 60, 64, 69],
  [53, 57, 60, 65],
  [55, 59, 62, 67],
];

const TRACKS = {
  day: { bpm: 150, shift: 0, lead: "square", len: 32 },
  night: { bpm: 100, shift: -7, lead: "triangle", len: 32 },
  ending: { bpm: 76, len: 32 },
};

let track = null;
let stepI = 0;
let nextT = 0;

export function setMusic(name) {
  if (track === name) return;
  track = name || null;
  stepI = 0;
  if (ac && track) nextT = ac.currentTime + 0.08;
}

function schedule() {
  if (!ac || !track || ac.state !== "running") return;
  const tr = TRACKS[track];
  const stepDur = 60 / tr.bpm / 2;
  if (nextT < ac.currentTime) nextT = ac.currentTime + 0.02;
  while (nextT < ac.currentTime + 0.12) {
    const at = nextT - ac.currentTime;
    const s = stepI % tr.len;
    if (track === "ending") {
      const chord = END_CHORDS[Math.floor(s / 8) % 4];
      const n = chord[s % 4] + (s % 8 >= 4 ? 12 : 0);
      tone({ type: "triangle", f: midi(n), dur: stepDur * 1.8, vol: 0.22, at, bus: musicBus });
      if (s % 8 === 0) tone({ type: "sine", f: midi(chord[0] - 12), dur: stepDur * 7, vol: 0.3, at, bus: musicBus });
    } else {
      const n = MEL[s];
      if (n) tone({ type: tr.lead, f: midi(n + tr.shift), dur: stepDur * 0.9, vol: 0.14, at, bus: musicBus });
      if (s % 2 === 0) {
        const b = BASS[Math.floor(s / 4) % BASS.length];
        tone({ type: "triangle", f: midi(b + tr.shift), dur: stepDur * 1.6, vol: 0.3, at, bus: musicBus });
      }
    }
    nextT += stepDur;
    stepI++;
  }
}
