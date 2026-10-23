// --- SPRITE SHEET LOADER ---
// Loads the AI-generated sprite sheets from game/assets/ and slices them into
// animation frames. If a sheet file is missing the game silently falls back
// to the built-in pixel-map sprites, so this file is always safe to load.
//
// Files:
//   assets/sheet_basketball.png — basketball poses + 3×3 ball grid
//   assets/sheet_sports.png     — soccer / hockey / tennis / handball quadrants
//
// Slicing (calibrated against the real sheets):
//   Each pose is a fractional band (y0..y1, x0..x1). Within a band, frames are
//   found by "body" segmentation: columns that are substantially filled form
//   bodies; thin stick/racket/ground-line columns don't. Frames are cut at the
//   midpoints between neighbouring bodies so sticks stay with their owner,
//   then trimmed to content. kind: 'player' | 'ball' | 'goal'.
(function () {
    window.SHEET_FRAMES = {};

    function band(y0, y1, x0, x1, kind) {
        return { y0, y1, x0, x1, kind: kind || 'player' };
    }

    const SHEETS = [
        {
            src: 'assets/sheet_basketball.png',
            sports: {
                basketball: {
                    stand:  [band(0.085, 0.29, 0.17, 0.66)],
                    prep:   [band(0.29, 0.50, 0.17, 0.66)],
                    shoot:  [band(0.50, 0.72, 0.17, 0.63)],
                    follow: [band(0.72, 0.96, 0.17, 0.66)],
                    ball:   [band(0.34, 0.44, 0.73, 0.95, 'ball'),
                             band(0.44, 0.53, 0.73, 0.95, 'ball'),
                             band(0.53, 0.62, 0.73, 0.95, 'ball')]
                }
            }
        },
        {
            src: 'assets/sheet_sports.png',
            sports: {
                soccer: {
                    stand:  [band(0.075, 0.17, 0.05, 0.32)],
                    prep:   [band(0.175, 0.27, 0.05, 0.32)],
                    shoot:  [band(0.275, 0.375, 0.05, 0.30)],
                    follow: [band(0.375, 0.48, 0.05, 0.32)],
                    ball:   [band(0.225, 0.285, 0.325, 0.3925, 'ball'),
                             band(0.285, 0.34, 0.325, 0.3925, 'ball'),
                             band(0.34, 0.395, 0.325, 0.3925, 'ball')],
                    goal:   [band(0.37, 0.48, 0.385, 0.49, 'goal')]
                },
                hockey: {
                    stand:  [band(0.075, 0.17, 0.55, 0.80)],
                    prep:   [band(0.175, 0.27, 0.55, 0.80)],
                    shoot:  [band(0.275, 0.375, 0.55, 0.80)],
                    follow: [band(0.375, 0.48, 0.55, 0.80)],
                    ball:   [band(0.23, 0.28, 0.795, 0.88, 'ball'),
                             band(0.275, 0.325, 0.795, 0.88, 'ball'),
                             band(0.32, 0.37, 0.795, 0.88, 'ball')],
                    goal:   [band(0.365, 0.48, 0.885, 0.99, 'goal')]
                },
                tennis: {
                    stand:  [band(0.575, 0.665, 0.05, 0.32)],
                    prep:   [band(0.665, 0.76, 0.05, 0.32)],
                    shoot:  [band(0.755, 0.855, 0.05, 0.32)],
                    follow: [band(0.855, 0.97, 0.05, 0.32)],
                    ball:   [band(0.74, 0.79, 0.325, 0.3925, 'ball'),
                             band(0.79, 0.835, 0.325, 0.3925, 'ball'),
                             band(0.835, 0.885, 0.325, 0.3925, 'ball')],
                    goal:   [band(0.865, 0.965, 0.385, 0.50, 'goal')]
                },
                handball: {
                    stand:  [band(0.575, 0.665, 0.55, 0.78)],
                    prep:   [band(0.665, 0.76, 0.55, 0.78)],
                    shoot:  [band(0.755, 0.855, 0.55, 0.78)],
                    follow: [band(0.855, 0.97, 0.55, 0.78)],
                    ball:   [band(0.73, 0.78, 0.79, 0.88, 'ball'),
                             band(0.775, 0.825, 0.79, 0.88, 'ball'),
                             band(0.82, 0.875, 0.79, 0.88, 'ball')],
                    goal:   [band(0.86, 0.955, 0.87, 0.995, 'goal')]
                }
            }
        }
    ];

    function segmentBand(data, W, H, bg, def) {
        const y0 = Math.floor(def.y0 * H), y1 = Math.floor(def.y1 * H);
        const x0 = Math.floor(def.x0 * W), x1 = Math.floor(def.x1 * W);
        const bandH = y1 - y0;
        const gap = Math.max(4, Math.floor(0.004 * W));

        function isContent(x, y) {
            const i = (y * W + x) * 4;
            if (data[i + 3] <= 40) return false;
            return Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 60;
        }

        const colDepth = new Array(x1 - x0).fill(0);
        for (let x = x0; x < x1; x++) {
            let d = 0;
            for (let y = y0; y < y1; y++) if (isContent(x, y)) d++;
            colDepth[x - x0] = d;
        }

        const bodyThresh = def.kind === 'player' ? Math.max(4, Math.floor(bandH * 0.18)) : 1;
        const minBodyW = def.kind === 'player' ? 6 : 4;
        let bodies = [], start = null, last = -1e9;
        for (let i = 0; i < colDepth.length; i++) {
            if (colDepth[i] >= bodyThresh) {
                if (start === null) start = i;
                last = i;
            } else if (start !== null && i - last >= gap) {
                bodies.push([start, last]);
                start = null;
            }
        }
        if (start !== null) bodies.push([start, last]);
        bodies = bodies.filter(b => b[1] - b[0] >= minBodyW);
        if (def.kind === 'player' && bodies.length) {
            const wmax = Math.max(...bodies.map(b => b[1] - b[0]));
            bodies = bodies.filter(b => (b[1] - b[0]) >= wmax * 0.35);
        }
        if (!bodies.length) return [];

        const frames = [];
        for (let ci = 0; ci < bodies.length; ci++) {
            const [a, b] = bodies[ci];
            const left = ci === 0 ? 0 : Math.floor((bodies[ci - 1][1] + a) / 2);
            const right = ci === bodies.length - 1 ? colDepth.length - 1 : Math.floor((b + bodies[ci + 1][0]) / 2);
            let minX = null, maxX = null, minY = null, maxY = null;
            for (let x = x0 + left; x <= x0 + right; x++) {
                let hit = false;
                for (let y = y0; y < y1; y++) {
                    if (isContent(x, y)) {
                        hit = true;
                        if (minY === null || y < minY) minY = y;
                        if (maxY === null || y > maxY) maxY = y;
                    }
                }
                if (hit) {
                    if (minX === null) minX = x;
                    maxX = x;
                }
            }
            if (minX !== null) frames.push({ sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 });
        }
        return frames;
    }

    // Extract one frame with the sheet background made transparent: flood-fill
    // from the frame border through background-colored pixels only, so interior
    // dark pixels (outlines, black shorts, hockey uniforms) are preserved.
    function keyFrame(data, W, bg, r) {
        const w = r.sw, h = r.sh;
        const out = new ImageData(w, h);
        const px = out.data;
        const isBg = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const si = ((r.sy + y) * W + (r.sx + x)) * 4;
                const di = (y * w + x) * 4;
                px[di] = data[si]; px[di + 1] = data[si + 1];
                px[di + 2] = data[si + 2]; px[di + 3] = data[si + 3];
                const diff = Math.abs(data[si] - bg[0]) + Math.abs(data[si + 1] - bg[1]) + Math.abs(data[si + 2] - bg[2]);
                isBg[y * w + x] = diff < 60 ? 1 : 0;
            }
        }
        const stack = [];
        for (let x = 0; x < w; x++) {
            if (isBg[x]) stack.push(x);
            if (isBg[(h - 1) * w + x]) stack.push((h - 1) * w + x);
        }
        for (let y = 0; y < h; y++) {
            if (isBg[y * w]) stack.push(y * w);
            if (isBg[y * w + w - 1]) stack.push(y * w + w - 1);
        }
        const seen = new Uint8Array(w * h);
        while (stack.length) {
            const i = stack.pop();
            if (seen[i]) continue;
            seen[i] = 1;
            px[i * 4 + 3] = 0;
            const x = i % w, y = (i / w) | 0;
            if (x > 0 && isBg[i - 1] && !seen[i - 1]) stack.push(i - 1);
            if (x < w - 1 && isBg[i + 1] && !seen[i + 1]) stack.push(i + 1);
            if (y > 0 && isBg[i - w] && !seen[i - w]) stack.push(i - w);
            if (y < h - 1 && isBg[i + w] && !seen[i + w]) stack.push(i + w);
        }
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').putImageData(out, 0, 0);
        return { img: cv, sx: 0, sy: 0, sw: w, sh: h };
    }

    function processSheet(def) {
        const img = new Image();
        img.onload = function () {
            try {
                const W = img.naturalWidth, H = img.naturalHeight;
                const off = document.createElement('canvas');
                off.width = W; off.height = H;
                const octx = off.getContext('2d');
                octx.drawImage(img, 0, 0);
                const data = octx.getImageData(0, 0, W, H).data;
                const bg = [data[(2 * W + 2) * 4], data[(2 * W + 2) * 4 + 1], data[(2 * W + 2) * 4 + 2]];

                for (const [sportName, poses] of Object.entries(def.sports)) {
                    const out = {};
                    for (const [poseName, bands] of Object.entries(poses)) {
                        out[poseName] = [];
                        for (const d of bands) {
                            for (const r of segmentBand(data, W, H, bg, d)) {
                                out[poseName].push(keyFrame(data, W, bg, r));
                            }
                        }
                    }
                    if (out.stand && out.stand.length && out.shoot && out.shoot.length) {
                        // Reference heights so every frame of a sport draws at
                        // ONE consistent scale (no size flicker between frames)
                        out._refH = Math.max(...out.stand.map(f => f.sh));
                        if (out.ball && out.ball.length) out._ballRefH = Math.max(...out.ball.map(f => f.sh));
                        window.SHEET_FRAMES[sportName] = out;
                        console.log('[sheets] loaded sport:', sportName,
                            Object.fromEntries(Object.entries(out).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [k, v.length])));
                    }
                }
            } catch (e) {
                console.warn('[sheets] slicing failed for', def.src, e);
            }
        };
        img.onerror = function () { /* sheet not present — pixel-map fallback */ };
        img.src = def.src;
    }

    // Optional scene backgrounds: assets/bg_<sport>.png (per sport) or
    // assets/bg.png (shared). Missing files = procedural background.
    window.SHEET_BGS = {};
    ['basketball', 'soccer', 'hockey', 'tennis', 'handball'].forEach(s => {
        const im = new Image();
        im.onload = () => { window.SHEET_BGS[s] = im; };
        im.onerror = () => {};
        im.src = 'assets/bg_' + s + '.png';
    });
    (function () {
        const im = new Image();
        im.onload = () => { window.SHEET_BGS.default = im; };
        im.onerror = () => {};
        im.src = 'assets/bg.png';
    })();

    window.getSheetFrame = function (sportName, pose, i) {
        const s = window.SHEET_FRAMES[sportName];
        if (!s) return null;
        const arr = s[pose];
        if (!arr || !arr.length) return null;
        return arr[((i % arr.length) + arr.length) % arr.length];
    };

    SHEETS.forEach(processSheet);
})();
