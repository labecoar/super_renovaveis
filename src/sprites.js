/** Sprites e paleta do GDD v0.1 — As Super Renováveis */

export const PAL = {
  K: "#241a33",
  Y: "#ffd23f",
  y: "#f2a81d",
  O: "#ff9a3c",
  W: "#fff8ea",
  G: "#d8e4ea",
  g: "#9fb3c0",
  C: "#5ccbc6",
  c: "#2f8f99",
  B: "#7d8297",
  b: "#4d5166",
  N: "#2f3f6e",
  n: "#1b2242",
  R: "#e04848",
  D: "#a0683f",
  d: "#6b4129",
  E: "#72c44c",
  e: "#3f8a3a",
  P: "#5fe08a",
  L: "#fff1a8",
  S: "#4b4b58",
  s: "#80808d",
};

const H_HEAD = [
  "......Y..Y......",
  "...Y..YYYY..Y...",
  "....YYOOOOYY....",
  "..YYOOOOOOOOYY..",
  "...YOKOOOOKOY...",
  "..YYOOOOOOOOYY..",
  "...YOOOKKOOOY...",
  "....YOOKKOOY....",
  "..Y..YYYYYY..Y..",
];

export const SPR = {
  hero: {
    idle: H_HEAD.concat([
      "......KGGK......",
      "CC...KGGGGK.....",
      "CCC.KGWGGGGK....",
      "CCCCKGGyGyGK..K.",
      ".CCCKGGyGyGKKK..",
      "..CCKGGGyGGK....",
      "....KGGGGGGK....",
      ".....KgggK......",
      "......KgK.......",
      ".....K..K.......",
      "....KK..KK......",
    ]),
    run1: H_HEAD.concat([
      "......KGGK......",
      "CCCC.KGGGGK.....",
      "CCCCKGWGGGGK....",
      "cCCCKGGyGyGK....",
      "..ccKGGyGyGKK...",
      "....KGGGyGGK.K..",
      "....KGGGGGGK....",
      ".....KgggK......",
      "......KgK.......",
      "....K....K......",
      "...KK.....KK....",
    ]),
    run2: H_HEAD.concat([
      "......KGGK......",
      ".CCC.KGGGGK.....",
      "CCCCKGWGGGGK....",
      "CCcCKGGyGyGK....",
      ".cc.KGGyGyGKK...",
      "....KGGGyGGK.K..",
      "....KGGGGGGK....",
      ".....KgggK......",
      "......KgK.......",
      "......K.K.......",
      ".....KK.KK......",
    ]),
    jump: H_HEAD.concat([
      "......KGGK....K.",
      "CCC..KGGGGK..K..",
      "CCCCKGWGGGGKK...",
      "CCCCKGGyGyGK....",
      ".CC.KGGyGyGK....",
      "....KGGGyGGK....",
      "....KGGGGGGK....",
      ".....KgggK......",
      "......KgK.......",
      ".....KKKK.......",
      "................",
    ]),
  },
  wolf: {
    run1: [
      "................",
      "....K.....K.....",
      "...KBK...KBK....",
      "...KBBKKKBBK....",
      "..KBBBBBBBBBK...",
      "..KBBWKBBBWKK...",
      "..KBBBBBBBBBBBK.",
      "..KBBBBBBBWWWWK.",
      "...KBBBBBBKKKK..",
      "....KBBBBBK.....",
      "...KNNWRWNNK....",
      "..KNNNWRWNNNK...",
      "..KNNNNRNNNNKK..",
      "..KNNNNRNNNNdDDd",
      "..KNNNNNNNNKdDDd",
      "...KNNNNNNK.dddd",
      "...KNNNNNNK.....",
      "...KbbK.KbbK....",
      "...Kbb..KbbK....",
      "..KKK...KKKK....",
    ],
  },
  boss: {
    idle: [
      "..........KKKKKKKK........",
      "..........KnnnnnnK........",
      "..........KnnnnnnK........",
      "..........KRRRRRRK........",
      "........KKKKKKKKKKKK......",
      ".......KBBBBBBBBBBBBK.....",
      "......KBKKKBBBBKKKBBK.....",
      "......KBBKWBBBBKWBBBK.....",
      "....KKBBBBBBBBBBBBBBK.....",
      "...KBBBBBBBBBBBBBBBK......",
      "..KWBWBWBBBBBBBBBBK.......",
      "...KKKKKKBBBBBBBBK........",
      "........KBBBBBBK..........",
      "......KKNNWRWNNNKK...KKK..",
      ".....KNNNNWRWNNNNNK.KsssK.",
      "....KNNNNNNRNNNNNNNKsGGGsK",
      "...KNNNNNNNRNNNNNNNKsGRGsK",
      "...KNNYYYYYYNNNNNNNKsGGGsK",
      "...KNNNNNNNNNNNNNNNKsGGGsK",
      "...KNNNNNNNNNNNNNNNKsGGGsK",
      "....KNNNNNNNNNNNNNK.KsssK.",
      ".....KNNNNNNNNNNNK...KKK..",
      "......KbbbK..KbbbK........",
      "......KbbbK..KbbbK........",
      ".....KKKKKK.KKKKKK........",
    ],
  },
  sun: {
    f1: [
      "....Y....",
      ".Y..Y..Y.",
      "..YYYYY..",
      "..YLLLY..",
      "YYYLLLYYY",
      "..YLLLY..",
      "..YYYYY..",
      ".Y..Y..Y.",
      "....Y....",
    ],
    f2: [
      ".........",
      "....Y....",
      "..YYYYY..",
      "..YLLLY..",
      ".YYLLLYY.",
      "..YLLLY..",
      "..YYYYY..",
      "....Y....",
      ".........",
    ],
  },
  wind: {
    f1: [
      "......WWW...",
      ".....W...W..",
      "CCCCCCCC..W.",
      "..........W.",
      "CCCCCCCCCW..",
      "............",
      "..CCCCCCC...",
      ".........CC.",
    ],
    f2: [
      ".....WWW....",
      "....W...W...",
      ".CCCCCCC..W.",
      "..........W.",
      ".CCCCCCCCW..",
      "............",
      "...CCCCCCC..",
      "..........CC",
    ],
  },
  battery: {
    full: [
      "..KKKK..",
      ".KKKKKK.",
      ".KPPPPK.",
      ".KPPPPK.",
      ".KKKKKK.",
      ".KPPPPK.",
      ".KPPPPK.",
      ".KKKKKK.",
      ".KPPPPK.",
      ".KPPPPK.",
      ".KKKKKK.",
    ],
  },
  co2: {
    f1: [
      ".....SSSS.......",
      "...SSssssSS.SS..",
      "..SssssssssSssS.",
      ".SsKKsssKKsssssS",
      ".SsssKsKssssssS.",
      "SssssssssssssssS",
      "SssssKKKKKsssssS",
      ".SSsssssssssssS.",
      "...SSSS..SSSSS..",
    ],
  },
  paper: {
    f1: [
      "KKKKKK..",
      "KWWWWKK.",
      "KWKKWWK.",
      "KWWWWWK.",
      "KWKKKWK.",
      "KWWWWWK.",
      "KWWRRWK.",
      "KKKKKKK.",
    ],
  },
  grass: {
    f1: [
      "EEEEEEEEEEEEEEEE",
      "EEeEEEEEEeEEEEEE",
      "eEeeEEeEeeeEEeEe",
      "DeDDeDDDDDeDDDeD",
      "DDDDDDDDDDDDDDDD",
      "DDdDDDDDDDDdDDDD",
      "DDDDDDdDDDDDDDDD",
      "DDDDDDDDDDDDDDdD",
      "DdDDDDDDDDDDDDDD",
      "DDDDDDDDdDDDDDDD",
      "DDDDdDDDDDDDDDDD",
      "DDDDDDDDDDDDdDDD",
      "DDdDDDDDDDDDDDDD",
      "DDDDDDDDDDDDDDDD",
      "DDDDDDdDDDDDDDDd",
      "DDDDDDDDDDDDDDDD",
    ],
  },
  house: {
    // 16×13; no ending é desenhada em 2× para reproduzir o slide.
    off: [
      "......KKKK......",
      "....KKRRRRKK....",
      "..KKRRRRRRRRKK..",
      "KKRRRRRRRRRRRRKK",
      "KWWWWWWWWWWWWWWK",
      "KWWWWWWWWWWWWWWK",
      "KWWKKKKWWWWWWWWK",
      "KWWKbbKWWWKKKKWK",
      "KWWKbbKWWWKddKWK",
      "KWWKKKKWWWKddKWK",
      "KWWWWWWWWWKddKWK",
      "KWWWWWWWWWKddKWK",
      "KKKKKKKKKKKKKKKK",
    ],
  },
  tower: {
    f1: ["..KKKK..", ".KgggKK.", "..KKKK..", "...KK..."]
      .concat(Array(18).fill("..KWWK.."))
      .concat([".KWWWWK.", "KKKKKKKK"]),
  },
  blade: {
    f1: [".K.", "KWK", "KWK", "KWK", "KWK", "KWK", "KWK", "KWK", "KWK", "KWK", ".K.", "..."],
  },
  /** 11×11, 8 frames: meia volta fecha o ciclo (pás azul/branco). */
  pin: [
    [".....K.....", "....KWK....", "...KKWWK...", "..KCKWWWK..", ".KCCCWWKKK.", "KCCCCYCCCCK", ".KKKWWCCCK.", "..KWWWKCK..", "...KWWKK...", "....KWK....", ".....K....."],
    ["...........", ".......K...", "..KKK.KWK..", ".KCCCKWWK..", "..KCCKWWK..", "...KKYKK...", "..KWWKCCK..", "..KWWKCCCK.", "..KWK.KKK..", "...K.......", "..........."],
    ["...........", "...KK......", "..KCCK.KK..", "..KCCCKWWK.", "...KCCWWWK.", "..KWWYWWK..", ".KWWWCCK...", ".KWWKCCCK..", "..KK.KCCK..", "......KK...", "..........."],
    ["...........", "....KK.....", "...KCCK....", "...KKCCKK..", "..KWKCKKWK.", ".KWWWYWWWK.", ".KWKKCKWK..", "..KKCCKK...", "....KCCK...", ".....KK....", "..........."],
    [".....K.....", "....KCK....", "...KKCCK...", "..KWKCCCK..", ".KWWWCCKKK.", "KWWWWYWWWWK", ".KKKCCWWWK.", "..KCCCKWK..", "...KCCKK...", "....KCK....", ".....K....."],
    ["...........", ".......K...", "..KKK.KCK..", ".KWWWKCCK..", "..KWWKCCK..", "...KKYKK...", "..KCCKWWK..", "..KCCKWWWK.", "..KCK.KKK..", "...K.......", "..........."],
    ["...........", "...KK......", "..KWWK.KK..", "..KWWWKCCK.", "...KWWCCCK.", "..KCCYCCK..", ".KCCCWWK...", ".KCCKWWWK..", "..KK.KWWK..", "......KK...", "..........."],
    ["...........", "....KK.....", "...KWWK....", "...KKWWKK..", "..KCKWKKCK.", ".KCCCYCCCK.", ".KCKKWKCK..", "..KKWWKK...", "....KWWK...", ".....KK....", "..........."],
  ],
  /** 24×10 — contratos em cima; plataforma. */
  mesa: [
    "......KKKKKK..KKKKK.....",
    "......KWWWWK..KWWRK.....",
    "......KWKKWK..KWWWK.....",
    "KKKKKKKKKKKKKKKKKKKKKKKK",
    "KDDDDDDDDDDDDDDDDDDDDDDK",
    "KddddddddddddddddddddddK",
    "KKKKKKKKKKKKKKKKKKKKKKKK",
    "..KdK..............KdK..",
    "..KdK..............KdK..",
    "..KKK..............KKK..",
  ],
  alerta: [".KKK.", "KRRRK", "KRRRK", "KRRRK", ".KRK.", ".KRK.", "..K..", ".KKK.", ".KRK.", ".KKK."],
  toco: [".KKK.", "KdDdK", "KDdDK", "KdDdK", ".KKK."],
  muda: ["..K..", ".KEK.", "KEeEK", ".KeK.", "..D.."],
};

export const PIN_GRAY = { C: "#8a93a8", W: "#c3c9d6", Y: "#9aa0b0", c: "#6f788c" };

// derivados
SPR.hero.tired = SPR.hero.idle.map((r) =>
  r.replace(/[OYCG]/g, "g").replace(/[Cc]/g, "b").replace(/y/g, "b"),
);
SPR.wolf.run2 = SPR.wolf.run1
  .slice(0, 17)
  .concat(["....KbbbbK......", ".....KbbK.......", "....KKKKK......."]);
SPR.wolf.dizzy = SPR.wolf.run1.map((r, i) => (i === 5 ? "..KBBKKBBBKKK..." : r));
SPR.boss.idle2 = SPR.boss.idle.map((r, i) =>
  i === 10 ? "..KWBWBWBBBBBBBBBBK......." : i === 11 ? "...KWWWKKBBBBBBBBK........" : r,
);
SPR.battery.empty = SPR.battery.full.map((r) => r.replace(/P/g, "b"));
SPR.grass.dirt = SPR.grass.f1.slice(4).concat(SPR.grass.f1.slice(4, 8));
SPR.house.on = SPR.house.off.map((r) => r.replace(/b/g, "L"));

export function gridSize(grid) {
  return { w: Math.max(...grid.map((r) => r.length)), h: grid.length };
}

/** Desenha grade (1 letra = 1 px) na posição world; cam desloca X. scale = pixels por célula. */
export function drawSprite(ctx, grid, x, y, cam = 0, flipX = false, scale = 1, colorMap = null) {
  if (!grid) return;
  const { w } = gridSize(grid);
  const s = scale | 0 || 1;
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      const hex = (colorMap && colorMap[ch]) || PAL[ch];
      if (!hex) continue;
      const col = flipX ? w - 1 - c : c;
      const px = x + col * s - cam;
      ctx.fillStyle = hex;
      ctx.fillRect(Math.round(px), Math.round(y + r * s), s, s);
    }
  }
}

export function drawPin(ctx, frame, x, y, cam = 0, flipX = false, gray = false) {
  const g = SPR.pin[Math.abs(frame | 0) % SPR.pin.length];
  drawSprite(ctx, g, x, y, cam, flipX, 1, gray ? PIN_GRAY : null);
}

export function drawTurbine(ctx, x, y, angle, cam) {
  drawSprite(ctx, SPR.tower.f1, x, y, cam);
  for (let i = 0; i < 3; i++) {
    const a = angle + i * ((Math.PI * 2) / 3);
    ctx.save();
    ctx.translate(Math.round(x + 4 - cam), Math.round(y + 1.5));
    ctx.rotate(a);
    drawSprite(ctx, SPR.blade.f1, -1.5, -11, 0);
    ctx.restore();
  }
  ctx.fillStyle = PAL.K;
  ctx.fillRect(Math.round(x + 3 - cam), Math.round(y), 2, 2);
}
