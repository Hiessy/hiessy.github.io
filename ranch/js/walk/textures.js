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
  checker: { m: 0.8, draw(g, s) {
    tiles(g, s, 2, (i, j) => ((i + j) % 2 ? "#ecebe6" : "#222220"), "#c9c4b8", 2);
    speckle(g, s, ["rgba(255,255,255,0.22)", "rgba(0,0,0,0.10)"], 1400, 0.5, 1.3);
  } },
  white: { m: 0.4, draw(g, s) {
    tiles(g, s, 1, ["#efede8"], "#d3cdc1", 3);
    speckle(g, s, ["rgba(0,0,0,0.035)"], 300, 1, 3);
  } },
  cream: { m: 0.45, draw(g, s) {
    tiles(g, s, 1, ["#ece4d6"], "#cbbfa9", 3);
    speckle(g, s, ["rgba(120,90,50,0.05)"], 300, 1, 3);
  } },
  terracotta: { m: 0.6, draw(g, s) {
    tiles(g, s, 2, ["#b4643c", "#a95b36", "#ad5e38", "#bb6b42"], "#86492c", 4);
    speckle(g, s, ["rgba(0,0,0,0.07)", "rgba(255,220,180,0.06)"], 600, 1, 2.5);
  } },
  calcareo: { m: 0.4, draw(g, s) {
    tiles(g, s, 1, ["#e3d6bd"], "#bfae8c", 3);
    g.fillStyle = "#8f6240";
    g.beginPath(); g.moveTo(s / 2, s * 0.2); g.lineTo(s * 0.8, s / 2); g.lineTo(s / 2, s * 0.8); g.lineTo(s * 0.2, s / 2); g.closePath(); g.fill();
    g.fillStyle = "#e3d6bd";
    g.beginPath(); g.moveTo(s / 2, s * 0.32); g.lineTo(s * 0.68, s / 2); g.lineTo(s / 2, s * 0.68); g.lineTo(s * 0.32, s / 2); g.closePath(); g.fill();
    g.fillStyle = "#6f8a5e";
    [[0, 0], [s, 0], [0, s], [s, s]].forEach((c) => { g.beginPath(); g.arc(c[0], c[1], s * 0.15, 0, Math.PI * 2); g.fill(); });
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
  marble: { m: 0.8, draw(g, s) {
    tiles(g, s, 2, ["#d9c7ab", "#d2bea0", "#dccbb0", "#cfb999"], "#b7a283", 3);
    speckle(g, s, ["rgba(120,84,48,0.10)", "rgba(255,244,224,0.12)"], 900, 2, 9);
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
