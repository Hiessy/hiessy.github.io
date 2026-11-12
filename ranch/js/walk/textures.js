/* Floor, wall and roof finishes, drawn on canvases so nothing is downloaded. */
import * as THREE from "three";

export function tiles(g, s, n, colors, grout, gw) {
  const k = s / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      g.fillStyle = typeof colors === "function" ? colors(i, j) : colors[(i + j * n) % colors.length];
      g.fillRect(i * k, j * k, k, k);
    }
  }
  g.fillStyle = grout;
  for (let i = 0; i < n; i++) { g.fillRect(i * k, 0, gw, s); g.fillRect(0, i * k, s, gw); }
}

export function speckle(g, s, colors, count, r0, r1) {
  for (let i = 0; i < count; i++) {
    g.fillStyle = colors[i % colors.length];
    g.beginPath();
    g.arc(Math.random() * s, Math.random() * s, r0 + Math.random() * (r1 - r0), 0, Math.PI * 2);
    g.fill();
  }
}

export function stripes(g, s, light, dark, n) {
  const k = s / n;
  for (let i = 0; i < n; i++) {
    const gr = g.createLinearGradient(i * k, 0, (i + 1) * k, 0);
    gr.addColorStop(0, dark); gr.addColorStop(0.5, light); gr.addColorStop(1, dark);
    g.fillStyle = gr;
    g.fillRect(i * k, 0, k, s);
  }
}

/* m: how many meters one copy of the picture covers. */
export const TEX = {
  // black and white terrazzo laid on the diagonal: one copy is a white tile
  // with a black diamond, which repeats into a checkerboard at 45 degrees
  checker: { m: 0.36, draw(g, s) {
    g.fillStyle = "#e8e6de"; g.fillRect(0, 0, s, s);
    g.fillStyle = "#222221";
    g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s, s / 2); g.lineTo(s / 2, s); g.lineTo(0, s / 2); g.closePath(); g.fill();
    speckle(g, s, ["rgba(255,255,255,0.55)", "rgba(0,0,0,0.30)", "rgba(160,158,148,0.45)"], 1700, 0.5, 1.5);
  } },
  white: { m: 0.4, draw(g, s) {
    tiles(g, s, 1, ["#efede8"], "#d3cdc1", 3);
    speckle(g, s, ["rgba(0,0,0,0.035)"], 300, 1, 3);
  } },
  cream: { m: 0.45, draw(g, s) {
    tiles(g, s, 1, ["#ece4d6"], "#cbbfa9", 3);
    speckle(g, s, ["rgba(120,90,50,0.05)"], 300, 1, 3);
  } },
  // glazed orange tiles, each pressed into four squares
  terracotta: { m: 0.6, draw(g, s) {
    tiles(g, s, 2, ["#b9643a", "#b05c34", "#b56037", "#bd693f"], "#7d4428", 4);
    g.strokeStyle = "rgba(90,40,18,0.35)"; g.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x = i * s / 2, y = j * s / 2, k = s / 2;
      g.strokeRect(x + k * 0.08, y + k * 0.08, k * 0.39, k * 0.39); g.strokeRect(x + k * 0.53, y + k * 0.08, k * 0.39, k * 0.39);
      g.strokeRect(x + k * 0.08, y + k * 0.53, k * 0.39, k * 0.39); g.strokeRect(x + k * 0.53, y + k * 0.53, k * 0.39, k * 0.39);
    }
    speckle(g, s, ["rgba(0,0,0,0.06)", "rgba(255,220,180,0.08)"], 500, 1, 2.5);
  } },
  // the middle bedrooms' tiles: cream bars turning round a brown square
  calcareo: { m: 0.3, draw(g, s) {
    const u = s / 3, cream = "#e6d9a8", pale = "#efe6c2", brown = "#7b5a36", line = "#8f7a4c";
    g.fillStyle = cream; g.fillRect(0, 0, s, s);
    const rect = (x, y, w, h, c) => {
      for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) {
        g.fillStyle = c; g.fillRect(x + dx, y + dy, w, h);
        g.strokeStyle = line; g.lineWidth = 2; g.strokeRect(x + dx, y + dy, w, h);
      }
    };
    rect(0, 0, 2 * u, u, pale); rect(2 * u, 0, u, 2 * u, cream); rect(u, 2 * u, 2 * u, u, pale); rect(0, u, u, 2 * u, cream);
    rect(u, u, u, u, brown);
    speckle(g, s, ["rgba(90,60,20,0.05)"], 300, 1, 2.5);
  } },
  parquet: { m: 1.2, draw(g, s) {
    const rows = 12, h = s / rows, tones = ["#a8754a", "#9a6a40", "#b07d50", "#94653d"];
    for (let r = 0; r < rows; r++) {
      let x = -Math.random() * s * 0.4;
      while (x < s) {
        const len = s * (0.28 + Math.random() * 0.22);
        g.fillStyle = tones[Math.floor(Math.random() * tones.length)];
        g.fillRect(x, r * h, len, h);
        g.fillStyle = "rgba(60,35,15,0.55)";
        g.fillRect(x, r * h, 1.5, h);
        x += len;
      }
      g.fillStyle = "rgba(60,35,15,0.5)";
      g.fillRect(0, r * h, s, 1.2);
    }
  } },
  bathtile: { m: 0.3, draw(g, s) { tiles(g, s, 2, ["#f4f4f1", "#efefec"], "#c7c7c1", 3); } },
  kitchen: { m: 0.6, draw(g, s) { tiles(g, s, 2, ["#d9d1c0", "#d3cab7"], "#b1a891", 3); } },
  terrace: { m: 0.8, draw(g, s) { tiles(g, s, 2, ["#d7cebe", "#d1c7b5"], "#b5aa95", 3); } },
  concrete: { m: 2, draw(g, s) {
    g.fillStyle = "#bdb8ae"; g.fillRect(0, 0, s, s);
    speckle(g, s, ["#b2ada3", "#c8c3b9", "#aaa59b"], 1500, 0.6, 2);
  } },
  roofing: { m: 1, draw(g, s) {
    g.fillStyle = "#a19d94"; g.fillRect(0, 0, s, s);
    speckle(g, s, ["#96928a", "#aca89f"], 1200, 0.6, 1.8);
  } },
  pavers: { m: 0.8, draw(g, s) {
    const b = s / 4, tones = ["#9d978d", "#a7a197", "#938d83", "#a39d92"];
    g.fillStyle = "#7f796f"; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const x = i * b, y = j * b;
        for (let k = 0; k < 2; k++) {
          g.fillStyle = tones[Math.floor(Math.random() * tones.length)];
          if ((i + j) % 2 === 0) g.fillRect(x + 2, y + k * b / 2 + 2, b - 4, b / 2 - 4);
          else g.fillRect(x + k * b / 2 + 2, y + 2, b / 2 - 4, b - 4);
        }
      }
    }
  } },
  gravel: { m: 1.2, draw(g, s) {
    g.fillStyle = "#cfc5ae"; g.fillRect(0, 0, s, s);
    speckle(g, s, ["#b9ae96", "#ddd3bd", "#a99f88", "#e8e0cc", "#c4b9a0"], 2600, 0.8, 2.6);
  } },
  grass: { m: 3, draw(g, s) {
    g.fillStyle = "#7fa65a"; g.fillRect(0, 0, s, s);
    speckle(g, s, ["#6f9a4c", "#8db866", "#78a052", "#93bd6c", "#6a9147"], 3500, 0.6, 2.2);
  } },
  asphalt: { m: 2.5, draw(g, s) {
    g.fillStyle = "#5c5e60"; g.fillRect(0, 0, s, s);
    speckle(g, s, ["#4f5153", "#6a6c6e", "#57595b", "#636567"], 3000, 0.5, 1.6);
  } },
  sidewalk: { m: 0.8, draw(g, s) {
    tiles(g, s, 2, ["#d1ccc2", "#cdc8be"], "#aaa49a", 3);
    g.fillStyle = "rgba(0,0,0,0.08)";
    for (let i = 1; i < 8; i += 2) { g.fillRect(i * s / 8, 0, 1.5, s); g.fillRect(0, i * s / 8, s, 1.5); }
  } },
  stone: { m: 0.9, draw(g, s) {
    g.fillStyle = "#5f5548"; g.fillRect(0, 0, s, s);
    const tones = ["#a08f78", "#8a7b66", "#b09c82", "#7d6f5c", "#9c8a70"];
    for (let i = 0; i < 26; i++) {
      const w = s * (0.18 + Math.random() * 0.22), h = s * (0.12 + Math.random() * 0.16);
      const x = Math.random() * s, y = Math.random() * s;
      g.fillStyle = tones[i % tones.length];
      for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) {
        g.beginPath();
        g.moveTo(x + dx, y + dy); g.lineTo(x + dx + w, y + dy + h * 0.2); g.lineTo(x + dx + w * 0.9, y + dy + h);
        g.lineTo(x + dx - w * 0.1, y + dy + h * 0.85); g.closePath(); g.fill();
      }
    }
  } },
  metal: { m: 0.6, draw(g, s) { stripes(g, s, "#d7dadc", "#aeb3b7", 8); } },
  metalblue: { m: 0.6, draw(g, s) { stripes(g, s, "#9db2c4", "#6f8799", 8); } },
  tiles: { m: 0.3, draw(g, s) { tiles(g, s, 2, ["#efe3a8", "#e9dc9c"], "#cbbd7d", 3); } },
  zebra: { m: 1, draw(g, s) {
    g.fillStyle = "#f4f4f2"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "#151515"; g.lineCap = "round";
    for (let k = 0; k < 9; k++) {
      g.lineWidth = 6 + Math.random() * 9;
      g.beginPath();
      for (let x = 0; x <= s; x += 8) {
        const y = k * s / 9 + Math.sin(x / 22 + k) * 10 + Math.sin(x / 9) * 3;
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
  } },
  deco: { m: 1, alpha: true, w: 256, h: 128, draw(g, w, h) {
    g.strokeStyle = "#7a4528"; g.lineWidth = 9; g.lineJoin = "miter";
    g.strokeRect(4, 6, w - 8, h - 12);
    g.beginPath(); g.moveTo(w / 2, 6); g.lineTo(w / 2, h - 6); g.stroke();
    [[w / 4, h / 2], [3 * w / 4, h / 2]].forEach((c) => {
      g.strokeRect(c[0] - 34, c[1] - 30, 68, 60);
      g.beginPath();
      g.moveTo(c[0] - 34, c[1]); g.lineTo(c[0] - 14, c[1]); g.lineTo(c[0] - 14, c[1] - 14); g.lineTo(c[0] + 14, c[1] - 14);
      g.lineTo(c[0] + 14, c[1] + 14); g.lineTo(c[0] + 34, c[1] + 14);
      g.stroke();
    });
  } },
  balusters: { m: 0.8, alpha: true, w: 256, h: 128, draw(g, w, h) {
    g.fillStyle = "#6b4423";
    g.fillRect(0, 0, w, 14); g.fillRect(0, h - 12, w, 12);
    for (let x = 12; x < w; x += 32) {
      g.fillRect(x, 10, 9, h - 20);
      g.fillRect(x - 3, h / 2 - 8, 15, 16);
    }
  } },
  bars: { m: 0.6, alpha: true, w: 128, h: 256, draw(g, w, h) {
    g.fillStyle = "#f4f4f1";
    g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10); g.fillRect(0, h * 0.52, w, 7);
    for (let x = 4; x < w; x += 21) g.fillRect(x, 0, 6, h);
  } }
};
/* Finishes the photos show, added to the ones above. */
Object.assign(TEX, {
  // the entrance hall: rosy-brown tiles clouded with cream
  marble: { m: 0.66, draw(g, s) {
    tiles(g, s, 2, ["#b39584", "#ad8f7e", "#b89a89", "#a98a79"], "#d9cbbd", 3);
    speckle(g, s, ["rgba(238,226,212,0.30)", "rgba(240,230,218,0.22)", "rgba(140,104,88,0.20)"], 420, 3, 13);
    g.fillStyle = "#d9cbbd";
    for (let i = 0; i < 2; i++) { g.fillRect(i * s / 2, 0, 3, s); g.fillRect(0, i * s / 2, s, 3); }
  } },
  redtile: { m: 0.6, draw(g, s) {
    tiles(g, s, 2, ["#8c4a30", "#84452c", "#914e33", "#7f4129"], "#5f3222", 3);
    speckle(g, s, ["rgba(0,0,0,0.08)", "rgba(255,210,170,0.05)"], 500, 1, 2.5);
  } },
  white40: { m: 0.8, draw(g, s) {
    tiles(g, s, 2, ["#f1f0ec", "#eeede8"], "#b9b7b0", 3);
    speckle(g, s, ["rgba(0,0,0,0.03)"], 300, 1, 3);
  } },
  boards: { m: 1.2, draw(g, s) { stripes(g, s, "#6a4326", "#553419", 6); speckle(g, s, ["rgba(0,0,0,0.10)"], 300, 1, 3); } },
  pine: { m: 0.9, draw(g, s) { stripes(g, s, "#c58f52", "#b17c43", 6); speckle(g, s, ["rgba(90,50,20,0.25)"], 60, 2, 5); } },
  redsheet: { m: 0.6, draw(g, s) { stripes(g, s, "#9a4f38", "#7d3d2a", 8); } },
  louvre: { m: 0.5, draw(g, s) {
    g.fillStyle = "#e9dfc4"; g.fillRect(0, 0, s, s);
    g.fillStyle = "#c9bb97";
    for (let y = 0; y < s; y += s / 16) g.fillRect(0, y, s, s / 40);
  } },
  blocks: { m: 0.4, draw(g, s) {
    tiles(g, s, 2, ["#cfe3ea", "#c4dbe4"], "#f2f2ee", 6);
    speckle(g, s, ["rgba(255,255,255,0.35)"], 120, 3, 8);
  } }
});
/* More finishes read off the photos: the corridor's pale tiles with dark
   joints, the kitchen's terrazzo, the baths' floors, the brick patio. */
Object.assign(TEX, {
  whitegrid: { m: 0.4, draw(g, s) {
    tiles(g, s, 1, ["#e3e1da"], "#4f4d49", 5);
    speckle(g, s, ["rgba(0,0,0,0.04)", "rgba(255,255,255,0.10)"], 400, 1, 3);
  } },
  terrazzo: { m: 1.0, draw(g, s) {
    g.fillStyle = "#ddd3bd"; g.fillRect(0, 0, s, s);
    speckle(g, s, ["#2a2622", "#5b4632", "#8a6d4c", "#f3ede0", "#3b342d", "#b79f7c"], 2600, 0.7, 2.4);
  } },
  bathdark: { m: 0.4, draw(g, s) { tiles(g, s, 2, ["#33373a", "#2e3235"], "#1f2224", 3); } },
  bathbeige: { m: 0.6, draw(g, s) {
    tiles(g, s, 2, ["#d7bfa3", "#d2b99c", "#dbc4a9", "#cfb597"], "#b39a7d", 3);
    speckle(g, s, ["rgba(120,84,48,0.07)", "rgba(255,244,224,0.10)"], 500, 2, 6);
  } },
  bathcream: { m: 0.6, draw(g, s) { tiles(g, s, 2, ["#ecdfc8", "#e8dac1"], "#c9b99b", 3); } },
  brickpave: { m: 0.8, draw(g, s) {
    const b = s / 4, tones = ["#a8674a", "#9f5f43", "#b06f51", "#98583e"];
    g.fillStyle = "#7a5a48"; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 2; k++) {
      g.fillStyle = tones[(i * 3 + j * 5 + k) % 4];
      if ((i + j) % 2 === 0) g.fillRect(i * b + 2, j * b + k * b / 2 + 2, b - 4, b / 2 - 4);
      else g.fillRect(i * b + k * b / 2 + 2, j * b + 2, b / 2 - 4, b - 4);
    }
  } },
  // the galeria: salmon tiles with a darker pressed pattern
  galeria: { m: 0.6, draw(g, s) {
    tiles(g, s, 2, ["#c48a6c", "#bd8365", "#c99073", "#b97e60"], "#8d5e48", 3);
    speckle(g, s, ["rgba(110,60,40,0.16)", "rgba(240,210,190,0.14)"], 300, 3, 9);
  } },
  flagstone: { m: 1, draw(g, s) {
    g.fillStyle = "#c9bca6"; g.fillRect(0, 0, s, s);
    speckle(g, s, ["#bfb199", "#d5c9b4", "#b5a78f"], 900, 1, 4);
  } }
});

/* Fabrics: bedspreads, cushions and shower curtains. */
function plaid(base, dark, light) {
  return { m: 0.3, draw(g, s) {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    g.fillStyle = dark;
    for (let i = 0; i < 4; i++) { g.fillRect(i * s / 4, 0, s / 10, s); g.fillRect(0, i * s / 4, s, s / 10); }
    g.fillStyle = light;
    for (let i = 0; i < 4; i++) { g.fillRect(i * s / 4 + s / 7, 0, 2, s); g.fillRect(0, i * s / 4 + s / 7, s, 2); }
  } };
}
function motif(bg, n, draw) {
  return { m: 0.5, draw(g, s) {
    g.fillStyle = bg; g.fillRect(0, 0, s, s);
    const k = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) draw(g, (i + 0.5 + (j % 2 ? 0.25 : -0.25)) * k, (j + 0.5) * k, k, i + j);
  } };
}
Object.assign(TEX, {
  "plaid-green": plaid("#1f5c46", "#143f30", "#3f8a6c"),
  "plaid-teal": plaid("#1d7a68", "#12564a", "#49a892"),
  // room 3's lime bedspreads, woven in zigzag bands
  lime: { m: 0.4, draw(g, s) {
    g.fillStyle = "#57a23c"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "#2f7a2a"; g.lineWidth = s / 14;
    for (let k = -1; k < 5; k++) {
      g.beginPath();
      for (let i = 0; i <= 8; i++) { const x = i * s / 8, y = k * s / 4 + (i % 2 ? s / 10 : 0); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke();
    }
  } },
  // the rattan set's flowered cushions
  floral: { m: 0.5, draw(g, s) {
    g.fillStyle = "#b9a184"; g.fillRect(0, 0, s, s);
    const tones = ["#d98a5c", "#e7c9a0", "#8f6a4c", "#c96a52", "#6f7f5a", "#f0dcc0"];
    for (let i = 0; i < 60; i++) {
      const x = (i * 97) % s, y = (i * 61 + 17) % s, r = 9 + (i % 5) * 3;
      g.fillStyle = tones[i % tones.length];
      for (let k = 0; k < 5; k++) { const a = k * 1.2566 + i; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.5, 0, 7); g.fill(); }
      g.fillStyle = "#f3e6c8"; g.beginPath(); g.arc(x, y, r * 0.28, 0, 7); g.fill();
    }
  } },
  stripes: { m: 0.3, draw(g, s) {
    g.fillStyle = "#e8e2d2"; g.fillRect(0, 0, s, s);
    g.fillStyle = "#4a4d50";
    for (let i = 0; i < 8; i++) g.fillRect(i * s / 8, 0, s / 16, s);
  } },
  tufted: { m: 0.4, draw(g, s) {
    g.fillStyle = "#d8c7a6"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "rgba(120,96,60,0.45)"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s, s / 2); g.lineTo(s / 2, s); g.lineTo(0, s / 2); g.closePath(); g.stroke();
    g.fillStyle = "#8a6f48";
    [[s / 2, 0], [s, s / 2], [s / 2, s], [0, s / 2]].forEach((c) => { g.beginPath(); g.arc(c[0], c[1], 6, 0, 7); g.fill(); });
  } },
  // shower curtains: blue fish, green trees, small brown rings
  "curtain-fish": motif("#f4f6f7", 4, (g, x, y, k, i) => {
    g.fillStyle = i % 3 ? "#2f66c4" : "#5b8fe0";
    g.beginPath(); g.ellipse(x, y, k * 0.26, k * 0.15, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(x + k * 0.22, y); g.lineTo(x + k * 0.38, y - k * 0.12); g.lineTo(x + k * 0.38, y + k * 0.12); g.closePath(); g.fill();
    g.fillStyle = "#f4f6f7"; g.beginPath(); g.arc(x - k * 0.14, y - k * 0.03, k * 0.03, 0, 7); g.fill();
  }),
  "curtain-trees": motif("#f5f7f4", 3, (g, x, y, k) => {
    g.fillStyle = "#6fb56f"; g.fillRect(x - 1.5, y, 3, k * 0.42);
    for (let a = 0; a < 9; a++) { g.beginPath(); g.ellipse(x + Math.cos(a * 0.7) * k * 0.16, y - k * 0.1 + Math.sin(a * 0.7) * k * 0.2, k * 0.07, k * 0.04, a, 0, 7); g.fill(); }
  }),
  "curtain-dots": motif("#f2ece6", 6, (g, x, y, k, i) => {
    g.fillStyle = i % 2 ? "#8a5a4a" : "#b98a76"; g.beginPath(); g.arc(x, y, k * 0.16, 0, 7); g.fill();
    g.fillStyle = "#f2ece6"; g.beginPath(); g.arc(x, y, k * 0.07, 0, 7); g.fill();
  }),
  "curtain-plain": { m: 0.5, draw(g, s) { stripes(g, s, "#f6f6f2", "#e2e2dc", 6); } },
  // a tile border for the baths that have one
  frieze: { m: 0.2, draw(g, s) {
    g.fillStyle = "#e9dcc6"; g.fillRect(0, 0, s, s);
    g.fillStyle = "#7d6a55";
    g.fillRect(0, 0, s, s * 0.08); g.fillRect(0, s * 0.92, s, s * 0.08);
    for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo((i + 0.5) * s / 2, s * 0.2); g.lineTo((i + 0.85) * s / 2, s / 2); g.lineTo((i + 0.5) * s / 2, s * 0.8); g.lineTo((i + 0.15) * s / 2, s / 2); g.closePath(); g.fill(); }
  } }
});

/* The pictures on the walls, painted loosely: what hangs where is in
   assets/model/house/furniture.js. One copy fills the frame. */
function art(draw) { return { m: 1, art: true, draw }; }
Object.assign(TEX, {
  "art-landscape": art((g, s) => {
    const sky = g.createLinearGradient(0, 0, 0, s * 0.6); sky.addColorStop(0, "#8fb4d6"); sky.addColorStop(1, "#dfe7df");
    g.fillStyle = sky; g.fillRect(0, 0, s, s);
    g.fillStyle = "#6f8f9c"; g.beginPath(); g.moveTo(0, s * 0.55); g.lineTo(s * 0.3, s * 0.3); g.lineTo(s * 0.55, s * 0.5); g.lineTo(s * 0.8, s * 0.28); g.lineTo(s, s * 0.5); g.lineTo(s, s); g.lineTo(0, s); g.fill();
    g.fillStyle = "#4f86a8"; g.fillRect(0, s * 0.58, s, s * 0.2);
    g.fillStyle = "#4f7a3a"; g.fillRect(0, s * 0.75, s, s * 0.25);
    g.fillStyle = "#2f5a2a"; [[0.15, 0.7, 0.13], [0.82, 0.66, 0.17], [0.92, 0.74, 0.1]].forEach((c) => { g.beginPath(); g.arc(c[0] * s, c[1] * s, c[2] * s, 0, 7); g.fill(); });
    g.fillStyle = "#e9dcc0"; g.fillRect(s * 0.42, s * 0.5, s * 0.07, s * 0.14);
    g.fillStyle = "#a5553a"; g.beginPath(); g.moveTo(s * 0.41, s * 0.5); g.lineTo(s * 0.455, s * 0.42); g.lineTo(s * 0.5, s * 0.5); g.fill();
  }),
  "art-portrait": art((g, s) => {
    g.fillStyle = "#d9d5cb"; g.fillRect(0, 0, s, s);
    g.fillStyle = "#8f8a80"; g.beginPath(); g.ellipse(s / 2, s * 0.4, s * 0.2, s * 0.26, 0, 0, 7); g.fill();
    g.fillStyle = "#b9b3a6"; g.beginPath(); g.ellipse(s * 0.52, s * 0.42, s * 0.12, s * 0.17, 0, 0, 7); g.fill();
    g.fillStyle = "#77736b"; g.beginPath(); g.moveTo(s * 0.15, s); g.quadraticCurveTo(s / 2, s * 0.5, s * 0.85, s); g.fill();
  }),
  "art-flowers": art((g, s) => {
    g.fillStyle = "#6f6a3c"; g.fillRect(0, 0, s, s);
    g.fillStyle = "#4b4a2a"; g.fillRect(s * 0.38, s * 0.6, s * 0.24, s * 0.3);
    const tones = ["#f1e6c8", "#e9d7a8", "#f6efe0", "#d9c08a"];
    for (let i = 0; i < 12; i++) { g.fillStyle = tones[i % 4]; g.beginPath(); g.arc(s * (0.28 + ((i * 37) % 45) / 100), s * (0.22 + ((i * 53) % 40) / 100), s * 0.075, 0, 7); g.fill(); }
  }),
  "art-figure": art((g, s) => {
    g.fillStyle = "#d8c9a4"; g.fillRect(0, 0, s, s);
    g.fillStyle = "#3f5f8a"; g.fillRect(s * 0.1, s * 0.1, s * 0.35, s * 0.8);
    g.fillStyle = "#b5533c"; g.beginPath(); g.ellipse(s * 0.6, s * 0.55, s * 0.18, s * 0.32, 0.2, 0, 7); g.fill();
    g.fillStyle = "#e8cfa8"; g.beginPath(); g.arc(s * 0.6, s * 0.24, s * 0.1, 0, 7); g.fill();
  }),
  "art-print": art((g, s) => {
    g.fillStyle = "#f3f1ea"; g.fillRect(0, 0, s, s);
    g.fillStyle = "#b9c7d6"; g.fillRect(s * 0.15, s * 0.15, s * 0.7, s * 0.4);
    g.fillStyle = "#6f8296"; for (let i = 0; i < 5; i++) g.fillRect(s * (0.2 + i * 0.13), s * (0.3 - (i % 3) * 0.05), s * 0.09, s * (0.25 + (i % 3) * 0.05));
    g.fillStyle = "#8a8a84"; g.fillRect(s * 0.15, s * 0.55, s * 0.7, s * 0.25);
  }),
  "art-sunset": art((g, s) => {
    const sky = g.createLinearGradient(0, 0, 0, s); sky.addColorStop(0, "#5b5f8a"); sky.addColorStop(0.55, "#e08a5c"); sky.addColorStop(1, "#3a2f3f");
    g.fillStyle = sky; g.fillRect(0, 0, s, s);
    g.fillStyle = "#f6d28a"; g.beginPath(); g.arc(s * 0.6, s * 0.55, s * 0.09, 0, 7); g.fill();
    g.fillStyle = "#2a2230"; g.fillRect(0, s * 0.7, s, s * 0.3);
  })
});

/* Wall tiles of the baths and the kitchen, by colour. */
[["white", "#f3f3ef", "#c9c9c3"], ["turquoise", "#7fcfc0", "#5aa99b"], ["pink", "#f1d9d6", "#d0aaa6"], ["beige", "#dccbb0", "#b9a585"],
 ["cream", "#efe6d2", "#cdbf9f"], ["yellow", "#efe3a8", "#cbbd7d"]].forEach((c) => {
  TEX["tile-" + c[0]] = { m: 0.3, draw(g, s) { tiles(g, s, 2, [c[1]], c[2], 3); } };
});

export const texCache = new Map();

export function tex(name) {
  if (texCache.has(name)) return texCache.get(name);
  const spec = TEX[name];
  const c = document.createElement("canvas");
  c.width = spec.w || 256; c.height = spec.h || 256;
  const g = c.getContext("2d");
  if (spec.w) spec.draw(g, c.width, c.height); else spec.draw(g, c.width);
  const tx = new THREE.CanvasTexture(c);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 8;
  tx.repeat.set(1 / spec.m, 1 / spec.m);
  if (spec.art) tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping;
  texCache.set(name, tx);
  return tx;
}

/* A copy of a texture for a box face, stretched to its size in meters. */
export function texFor(name, w, h) {
  const tx = tex(name).clone();
  const m = TEX[name].m;
  tx.repeat.set(w / m, h / m);
  tx.needsUpdate = true;
  return tx;
}
