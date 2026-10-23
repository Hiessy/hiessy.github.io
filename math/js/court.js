// --- PIXEL-ART STREET COURT (side view) ---
// A human-proportioned pixel player on the left shoots at a street hoop on
// the right, against an urban night scene (skyline, brick wall, graffiti,
// streetlamp). Everything is drawn from pixel maps and rects — no image files.
//
// Public API (called from game.js):
//   shootBall(made, fireTier)  – play a shot. fireTier: 0 none, 1 fireball,
//                                2 net burned off, 3 fire + lightning
//   setCourtSport(sport)       – 'basketball' | 'soccer' (applied when idle)
//   courtExplosion()           – queue a hoop explosion (perfect level-up)
(function () {
    const canvas = document.getElementById('court-canvas');
    const ctx = canvas.getContext('2d');
    const courtEl = document.getElementById('court');

    let P = 2;    // screen px per pixel unit
    let GW = 340; // grid width  (computed from court size)
    let GH = 74;  // grid height (computed from court size)

    const COLORS = {
        o: '#1a1424',   // outline
        H: '#5a3416',   // brown hair (soccer player)
        N: '#16161e',   // black shorts / boots (soccer)
        M: '#3a3a46',   // black hair (basketball player)
        S: '#f2b083',   // light skin
        s: '#c9855c',   // light skin shadow
        D: '#8d5524',   // dark skin (basketball player)
        d: '#6b3e1a',   // dark skin shadow
        w: '#ffffff',   // white: eyes, stripes, socks, number
        E: '#d92b2b',   // red jersey/shorts (basketball kit)
        e: '#a31515',   // red kit shadow
        A: '#9ad6f5',   // sky-blue stripe (soccer kit)
        R: '#e23b3b',   // red sneaker
        k: '#8f96a3',   // sole / dark ball patch
        B: '#ff8c1a',   // basketball
        b: '#c25e00',   // basketball seam
        L: '#ffbe73',   // basketball highlight
        W: 'rgba(255,255,255,0.85)', // backboard / posts
        O: '#ff6d00',   // rim
        F: '#ffdd00',   // flame bright
        f: '#ff4400'    // flame dark
    };
    const FIRE_JERSEY = { E: '#ff7a1a', e: '#cc5500', A: '#ffb35c' };

    // ---- SPRITES (24 wide, facing right, '.' = transparent) ----
    // Basketball player: dark skin, black hair, red kit with chest number
    const B_IDLE = [
        ".........oMMMMo.........",
        ".........oMMMMMo........",
        ".........oMDDDwDo.......",
        ".........oMDDDDDDo......",
        "..........oDDDDDo.......",
        "..........odDDDo........",
        "...........oDDo.........",
        ".......oEEEEEEEEEo......",
        "......oEEEEEEEEEEEo.....",
        "......oEeEEEEEEEoDDo....",
        "......oEeEEEEEEEoDDo....",
        "......oEeEEEEEEEoDDo....",
        "......oEeEEEEEEEoDDDo...",
        "......oEeEEEEEEEo.oDDo..",
        "......oEEEEEEEEEo..oDo..",
        "......oEEwwEEEEEo.......",
        "......oEEwwEEEEEo.......",
        ".......oEEEEEEEo........",
        ".......oEEEEEEEo........",
        ".......oEEEEEEEo........",
        ".......owwwwwwwwo.......",
        ".......oEeEEEEEEo.......",
        ".......oEeEEEEEEEo......",
        ".......oEEEo.oEEEo......",
        ".......oEEEo.oEEEo......",
        ".......owEEo.owEEo......",
        ".......oDDDo.oDDDo......",
        ".......oDDDo.oDDDo......",
        ".......oDDo...oDDo......",
        ".......oDDo...oDDo......",
        ".......oDDDo..oDDDo.....",
        ".......oDDDo..oDDDo.....",
        ".......oDDo...oDDo......",
        ".......oDDo...oDDo......",
        ".......oDDo...oDDo......",
        "........oDo....oDo......",
        "........owo....owo......",
        "........owo....owo......",
        ".......oRRRo..oRRRRo....",
        ".......oRwRo..oRwRRo....",
        ".......okkko..okkkko...."
    ];
    const B_PREP = [
        ".........oMMMMo.........",
        ".........oMMMMMo........",
        ".........oMDDDwDo.......",
        ".........oMDDDDDDo......",
        "..........oDDDDDo.......",
        "..........odDDDo........",
        "...........oDDo.........",
        ".......oEEEEEEEEEo......",
        "......oEEEEEEEEEEEo.....",
        "......oEeEEEEEEEoDDDo...",
        "......oEeEEEEEEEo.oDDDo.",
        "......oEEwwEEEEEo.oDDo..",
        "......oEEwwEEEEEo.......",
        ".......oEEEEEEEo........",
        ".......oEEEEEEEo........",
        ".......owwwwwwwwo.......",
        ".......oEeEEEEEEo.......",
        ".......oEeEEEEEEEo......",
        ".......oEEEo.oEEEo......",
        ".......oEEEo.oEEEo......",
        ".......owEEo.owEEo......",
        ".......oDDDo.oDDDo......",
        ".......oDDo...oDDo......",
        ".......oDDDo..oDDDo.....",
        ".......oDDo...oDDo......",
        "........oDo....oDo......",
        "........owo....owo......",
        ".......oRRRo..oRRRRo....",
        ".......oRwRo..oRwRRo....",
        ".......okkko..okkkko...."
    ];
    const B_SHOOT = [
        "...............oDDo.....",
        "...............oDDo.....",
        "..............oDDo......",
        "..............oDDo......",
        ".........oMMMMoDDo......",
        ".........oMMMMMoDDo.....",
        ".........oMDDDwDoDo.....",
        ".........oMDDDDDDoo.....",
        "..........oDDDDDo.......",
        "..........odDDDo........",
        "...........oDDo.........",
        ".......oEEEEEEEEEo......",
        "......oEEEEEEEEEEEo.....",
        "......oEeEEEEEEEo.......",
        "......oEeEEEEEEEo.......",
        "......oEEwwEEEEEo.......",
        "......oEEwwEEEEEo.......",
        ".......oEEEEEEEo........",
        ".......oEEEEEEEo........",
        ".......oEEEEEEEo........",
        ".......owwwwwwwwo.......",
        ".......oEeEEEEEEo.......",
        ".......oEeEEEEEEEo......",
        ".......oEEEo.oEEEo......",
        ".......oEEEo.oEEEo......",
        ".......owEEo.owEEo......",
        ".......oDDDo.oDDDo......",
        ".......oDDDo.oDDDo......",
        ".......oDDo...oDDo......",
        ".......oDDo...oDDo......",
        ".......oDDDo..oDDDo.....",
        ".......oDDDo..oDDDo.....",
        ".......oDDo...oDDo......",
        ".......oDDo...oDDo......",
        ".......oDDo...oDDo......",
        "........oDo....oDo......",
        "........owo....owo......",
        "........owo....owo......",
        ".......oRRRo..oRRRRo....",
        ".......oRwRo..oRwRRo....",
        ".......okkko..okkkko...."
    ];
    // Soccer player: light skin, brown hair, Argentina-style striped shirt,
    // black shorts, long white socks, black boots
    const S_IDLE = [
        ".........oHHHHo.........",
        ".........oHHHHHo........",
        ".........oHSSSwSo.......",
        ".........oHSSSSSSo......",
        "..........oSSSSSo.......",
        "..........osSSSo........",
        "...........oSSo.........",
        ".......oAwAwAwAwAo......",
        "......oAwAwAwAwAwAo.....",
        "......oAwAwAwAwAoSSo....",
        "......oAwAwAwAwAoSSo....",
        "......oAwAwAwAwAoSSo....",
        "......oAwAwAwAwAoSSSo...",
        "......oAwAwAwAwAo.oSSo..",
        "......oAwAwAwAwAo..oSo..",
        "......oAwAwAwAwAo.......",
        "......oAwAwAwAwAo.......",
        ".......oAwAwAwAo........",
        ".......oAwAwAwAo........",
        ".......oAwAwAwAo........",
        ".......oNNNNNNNNo.......",
        ".......oNNNNNNNNo.......",
        ".......oNNNNNNNNNo......",
        ".......oNNNo.oNNNo......",
        ".......oNNNo.oNNNo......",
        ".......owNNo.owNNo......",
        ".......oSSSo.oSSSo......",
        ".......oSSSo.oSSSo......",
        ".......oSSo...oSSo......",
        ".......oSSo...oSSo......",
        ".......owwwo..owwwo.....",
        ".......owwwo..owwwo.....",
        ".......owwo...owwo......",
        ".......owwo...owwo......",
        ".......owwo...owwo......",
        "........owo....owo......",
        "........owo....owo......",
        "........owo....owo......",
        ".......oNNNo..oNNNNo....",
        ".......oNNNo..oNNNNo....",
        ".......okkko..okkkko...."
    ];
    const S_PREP = [
        ".........oHHHHo.........",
        ".........oHHHHHo........",
        ".........oHSSSwSo.......",
        ".........oHSSSSSSo......",
        "..........oSSSSSo.......",
        "..........osSSSo........",
        "...........oSSo.........",
        ".......oAwAwAwAwAo......",
        "......oAwAwAwAwAwAo.....",
        "......oAwAwAwAwAoSSo....",
        "......oAwAwAwAwAoSSo....",
        "......oAwAwAwAwAoSSo....",
        "......oAwAwAwAwAoSSSo...",
        "......oAwAwAwAwAo.oSSo..",
        "......oAwAwAwAwAo..oSo..",
        "......oAwAwAwAwAo.......",
        "......oAwAwAwAwAo.......",
        ".......oAwAwAwAo........",
        ".......oAwAwAwAo........",
        ".......oAwAwAwAo........",
        ".......oNNNNNNNNo.......",
        ".......oNNNNNNNNo.......",
        ".......oNNNNNNNNNo......",
        ".......oNNNo.oNNNo......",
        "......oNNNo..oNNNo......",
        ".....owNNo...owNNo......",
        "....oSSSo....oSSSo......",
        "...oSSSo.....oSSSo......",
        "...oSSo.......oSSo......",
        "..oSSo........oSSo......",
        "..owwo........owwo......",
        ".owwo.........owwo......",
        ".owwo.........owwo......",
        "owwo..........owwo......",
        "oNNNo.........owwo......",
        "oNNNo..........owo......",
        "okkko..........owo......",
        "...............owo......",
        "..............oNNNNo....",
        "..............oNNNNo....",
        "..............okkkko...."
    ];
    const S_KICK = [
        ".........oHHHHo.........",
        ".........oHHHHHo........",
        ".........oHSSSwSo.......",
        ".........oHSSSSSSo......",
        "..........oSSSSSo.......",
        "..........osSSSo........",
        "...........oSSo.........",
        ".......oAwAwAwAwAo......",
        "......oAwAwAwAwAwAo.....",
        "......oAwAwAwAwAoSSo....",
        "......oAwAwAwAwAoSSo....",
        "......oAwAwAwAwAoSSo....",
        "......oAwAwAwAwAoSSSo...",
        "......oAwAwAwAwAo.oSSo..",
        "......oAwAwAwAwAo..oSo..",
        "......oAwAwAwAwAo.......",
        "......oAwAwAwAwAo.......",
        ".......oAwAwAwAo........",
        ".......oAwAwAwAo........",
        ".......oAwAwAwAo........",
        ".......oNNNNNNNNo.......",
        ".......oNNNNNNNNo.......",
        ".......oNNNNNNNNNo......",
        ".......oNNNo.oNNNNo.....",
        ".......oNNNo...oSSSSo...",
        ".......owNNo.....owwwo..",
        ".......oSSSo.....oNNNNo.",
        ".......oSSSo......okkko.",
        ".......oSSo.............",
        ".......oSSo.............",
        ".......owwwo............",
        ".......owwwo............",
        ".......owwo.............",
        ".......owwo.............",
        ".......owwo.............",
        "........owo.............",
        "........owo.............",
        "........owo.............",
        ".......oNNNo............",
        ".......oNNNo............",
        ".......okkko............"
    ];

    // Balls (6 wide, two frames for spin)
    const BBALL_A = [".oooo.", "oLLBbo", "oLBBbo", "oBBbbo", ".oooo."];
    const BBALL_B = [".oooo.", "oBbLLo", "obBBLo", "obbBBo", ".oooo."];
    const SBALL_A = [".oooo.", "owwkwo", "okwwko", "owkwwo", ".oooo."];
    const SBALL_B = [".oooo.", "owkwwo", "owwkwo", "okwwko", ".oooo."];

    const SPORTS = {
        basketball: { idle: B_IDLE, prep: B_PREP, action: B_SHOOT, celebrate: B_SHOOT, balls: [BBALL_A, BBALL_B] },
        soccer:     { idle: S_IDLE, prep: S_PREP, action: S_KICK,  celebrate: S_IDLE,  balls: [SBALL_A, SBALL_B] }
    };

    const PLAYER_X = 6;

    // ---- STATE ----
    let sport = 'basketball';
    let pendingSport = null;
    let state = 'idle';        // idle → prep → fly → (net → celebrate | bounce) → idle
    let stateT0 = performance.now();
    let shotMade = true;
    let fireTier = 0;
    let particles = [];
    let pendingExplosion = false;

    window.shootBall = function (made, tier) {
        state = 'prep';
        stateT0 = performance.now();
        shotMade = made;
        fireTier = tier || 0;
    };
    function sheetHas(s) {
        const f = window.SHEET_FRAMES && window.SHEET_FRAMES[s];
        return !!(f && f.stand && f.stand.length);
    }
    window.setCourtSport = function (s) {
        if ((!SPORTS[s] && !sheetHas(s)) || s === sport) return;
        if (state === 'idle') sport = s;
        else pendingSport = s;
    };
    window.courtExplosion = function () {
        pendingExplosion = true;
    };
    // Sports available for the rank rotation: pixel-map sports always, plus
    // any sport whose sprite-sheet frames loaded (hockey, tennis, handball…)
    window.courtSports = function () {
        const list = Object.keys(SPORTS);
        if (window.SHEET_FRAMES) {
            for (const s of Object.keys(window.SHEET_FRAMES)) {
                if (sheetHas(s) && !list.includes(s)) list.push(s);
            }
        }
        return list;
    };

    // ---- BONUS ROUND (level-up mini-game) ----
    // A marker sweeps across a power bar; tapping in the green zone sinks the
    // shot. Three balls, then onDone(madeCount) fires.
    let bonus = null; // { shotsLeft, made, onDone }

    window.startBonusRound = function (onDone) {
        bonus = { shotsLeft: 3, made: 0, onDone };
        state = 'idle';
        stateT0 = performance.now();
    };

    function markerPos(now) {
        const t = (now % 1400) / 1400;
        return t < 0.5 ? t * 2 : 2 - t * 2;
    }

    function tapBonus() {
        if (!bonus || state !== 'idle' || bonus.shotsLeft <= 0) return;
        const made = Math.abs(markerPos(performance.now()) - 0.5) <= 0.14;
        bonus.shotsLeft--;
        if (made) bonus.made++;
        window.shootBall(made, made && bonus.made >= 2 ? 1 : 0);
    }
    window.bonusTap = tapBonus; // keyboard path (space/enter in game.js)
    canvas.addEventListener('pointerdown', tapBonus);

    function checkBonusDone() {
        if (bonus && bonus.shotsLeft === 0) {
            const b = bonus;
            bonus = null;
            if (b.onDone) setTimeout(() => b.onDone(b.made), 0);
        }
    }

    function drawBonusBar(now) {
        const x0 = GW * 0.22, w = GW * 0.56, y = 3;
        px(x0, y, w, 3.5, '#742828');
        px(x0 + w * 0.20, y, w * 0.60, 3.5, '#8a6a1e');
        px(x0 + w * 0.36, y, w * 0.28, 3.5, '#2e8b3a');
        if (state === 'idle') {
            px(x0 + w * markerPos(now) - 0.7, y - 1.2, 1.4, 6, '#ffffff');
        }
        for (let i = 0; i < bonus.shotsLeft; i++) {
            px(x0 - 6 - i * 5, y, 3.2, 3.2, COLORS.B);
        }
    }

    function px(x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x * P), Math.round(y * P), Math.ceil(w * P), Math.ceil(h * P));
    }

    function resizeIfNeeded() {
        const w = courtEl.clientWidth;
        const h = courtEl.clientHeight;
        if (w === 0 || h === 0) return false;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            P = Math.max(2, Math.floor(h / 75));
            GW = Math.floor(w / P);
            GH = Math.floor(h / P);
        }
        return true;
    }

    // ---- URBAN BACKGROUND ----
    const STARS = [[12, 4], [40, 8], [70, 3], [110, 7], [150, 4], [190, 9], [230, 3], [270, 6], [305, 4], [330, 8]];
    const GRAFFITI = [
        { fx: 0.16, colors: ['#ff4fd8', '#7df9ff', '#ffd84f'] },
        { fx: 0.36, colors: ['#7df9ff', '#ffd84f', '#ff4fd8'] },
        { fx: 0.60, colors: ['#9dff4f', '#ff8c1a', '#7df9ff'] }
    ];

    function drawBackground(tick) {
        // AI-generated background image if one exists in assets/ (bg_<sport>.png
        // or shared bg.png), cover-fit and bottom-anchored; else procedural
        const bgImg = window.SHEET_BGS && (window.SHEET_BGS[sport] || window.SHEET_BGS.default);
        if (bgImg) {
            const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(bgImg, 0, canvas.height - bgImg.height * scale,
                bgImg.width * scale, bgImg.height * scale);
            return;
        }
        // Night sky bands
        px(0, 0, GW, GH * 0.30, '#161031');
        px(0, GH * 0.30, GW, GH * 0.16, '#241546');
        px(0, GH * 0.46, GW, GH * 0.12, '#3a1e56');
        px(0, GH * 0.58, GW, GH * 0.08, '#57284f');
        for (const [sx, sy] of STARS) {
            if (sx < GW - 8) px(sx % GW, sy, 0.8, 0.8, (sx + tick) % 7 ? '#cfd4ff' : '#8b90c0');
        }
        // Building silhouettes with lit windows
        const skyline = [
            { x: 0.02, w: 0.13, top: 0.14 }, { x: 0.17, w: 0.10, top: 0.28 },
            { x: 0.30, w: 0.14, top: 0.08 }, { x: 0.47, w: 0.09, top: 0.32 },
            { x: 0.58, w: 0.12, top: 0.18 }, { x: 0.73, w: 0.11, top: 0.26 },
            { x: 0.86, w: 0.12, top: 0.12 }
        ];
        const wallTop = GH - 24;
        for (const bld of skyline) {
            const bx = Math.floor(bld.x * GW), bw = Math.floor(bld.w * GW), by = Math.floor(bld.top * GH);
            px(bx, by, bw, wallTop - by, '#131024');
            for (let wy = by + 2; wy < wallTop - 2; wy += 4) {
                for (let wx = bx + 2; wx < bx + bw - 2; wx += 4) {
                    if ((wx * 7 + wy * 13) % 5 < 2) px(wx, wy, 1.2, 1.4, '#ffd866');
                }
            }
        }
        // Brick wall
        px(0, wallTop, GW, GH - 2 - wallTop, '#3a2028');
        for (let by = wallTop; by < GH - 2; by += 3) {
            px(0, by, GW, 0.4, '#2a161c');
            const off = ((by - wallTop) / 3) % 2 ? 0 : 4;
            for (let bx = off; bx < GW; bx += 8) px(bx, by, 0.4, 3, '#2a161c');
        }
        // Graffiti tags
        for (const tag of GRAFFITI) {
            const gx = Math.floor(tag.fx * GW), gy = wallTop + 4;
            px(gx, gy, 7, 4, tag.colors[0]);
            px(gx + 3, gy + 2, 7, 4, tag.colors[1]);
            px(gx + 9, gy, 4, 3, tag.colors[2]);
        }
        // Sidewalk + curb
        px(0, GH - 2, GW, 2, '#4a4a55');
        px(0, GH - 2, GW, 0.5, '#6a6a78');
        for (let cx = 8; cx < GW; cx += 16) px(cx, GH - 1.5, 0.5, 1.5, '#3a3a44');
        // Streetlamp
        const lx = Math.floor(GW * 0.46);
        px(lx, GH * 0.28, 1.4, GH - 2 - GH * 0.28, '#20182e');
        px(lx, GH * 0.28, 7, 1.4, '#20182e');
        px(lx + 6, GH * 0.28 + 1.4, 2.2, 1.6, '#ffd866');
        // Fire hydrant
        const hx = Math.floor(GW * 0.30);
        px(hx, GH - 7, 4, 5, '#c22a2a');
        px(hx + 1, GH - 8.4, 2, 1.6, '#c22a2a');
        px(hx - 1, GH - 5.6, 6, 1.4, '#a02020');
    }

    // ---- GOALS ----
    function rimGeom() {
        return {
            poleX: GW - 6, boardX: GW - 10,
            rimY: Math.max(8, GH - 58),
            rimX0: GW - 18, rimX1: GW - 10, targetX: GW - 17
        };
    }
    function goalGeom() {
        return {
            postX: GW - 22, backX: GW - 4,
            barY: Math.max(6, GH - 50), targetX: GW - 15
        };
    }

    function drawBasketballHoop(tick) {
        const g = rimGeom();
        px(g.poleX, g.rimY - 6, 2, GH - 2 - (g.rimY - 6), '#565664');
        px(g.boardX, g.rimY - 8, 2, 12, COLORS.W);
        px(g.boardX + 2, g.rimY - 4, 4, 2, '#565664'); // mount arm
        px(g.rimX0, g.rimY, g.rimX1 - g.rimX0, 1, COLORS.O);
        if (fireTierActive() >= 2) {
            px(g.rimX0 + (tick % 3), g.rimY + 1.4, 1, 1, COLORS.f);
            px(g.rimX1 - 2 - (tick % 2), g.rimY + 1.2, 1, 1, COLORS.F);
            px(g.rimX0 + 3, g.rimY + 2.2 - (tick % 2), 0.8, 0.8, COLORS.F);
        } else {
            px(g.rimX0 + 0.6, g.rimY + 1, 0.5, 3.4, COLORS.W);
            px(g.rimX1 - 1.1, g.rimY + 1, 0.5, 3.4, COLORS.W);
            px(g.rimX0 + 2.2, g.rimY + 3.6, 0.5, 2.6, COLORS.W);
            px(g.rimX1 - 2.7, g.rimY + 3.6, 0.5, 2.6, COLORS.W);
            px(g.rimX0 + 3.4, g.rimY + 6, 2.4, 0.5, COLORS.W);
        }
    }

    function drawSoccerGoal(tick) {
        const g = goalGeom();
        px(g.postX, g.barY, 1.4, GH - 2 - g.barY, COLORS.W);
        px(g.backX, g.barY, 1.4, GH - 2 - g.barY, COLORS.W);
        px(g.postX, g.barY, g.backX - g.postX + 1.4, 1.4, COLORS.W);
        if (fireTierActive() >= 2) {
            px(g.postX + 4 + (tick % 3), g.barY + 4, 1, 1, COLORS.f);
            px(g.backX - 4 - (tick % 2), g.barY + 7, 1, 1, COLORS.F);
        } else {
            for (let ny = g.barY + 3; ny < GH - 3; ny += 3.5) {
                for (let nx = g.postX + 3; nx < g.backX; nx += 3.5) {
                    px(nx, ny, 0.45, 0.45, 'rgba(255,255,255,0.45)');
                }
            }
        }
    }

    function fireTierActive() {
        return (state !== 'idle') ? fireTier : (courtEl.classList.contains('on-fire') ? Math.max(1, fireTier) : 0);
    }

    // ---- DRAW HELPERS ----
    function drawSprite(frame, ox, oy, onFire) {
        for (let r = 0; r < frame.length; r++) {
            const row = frame[r];
            for (let c = 0; c < row.length; c++) {
                const ch = row[c];
                if (ch === '.') continue;
                let color = COLORS[ch];
                if (onFire && FIRE_JERSEY[ch]) color = FIRE_JERSEY[ch];
                if (color) px(ox + c, oy + r, 1, 1, color);
            }
        }
    }

    function drawBall(bx, by, fire, tick) {
        const map = SPORTS[sport].balls[tick % 2];
        for (let r = 0; r < map.length; r++) {
            for (let c = 0; c < map[r].length; c++) {
                const ch = map[r][c];
                if (ch !== '.') px(bx + c, by + r, 1, 1, COLORS[ch]);
            }
        }
        if (fire) drawFlames(bx, by, tick);
    }

    function drawFlames(bx, by, tick) {
        px(bx + 2 + (tick % 2), by - 1.4, 1.2, 1.2, COLORS.F);
        px(bx - 1 + (tick % 2), by + 1, 1, 1, COLORS.f);
        px(bx + 3 - (tick % 2), by - 2.6, 1, 1, COLORS.f);
    }

    function drawLightning(tx, ty, tick) {
        for (let bolt = 0; bolt < 2; bolt++) {
            let x = tx + (bolt ? 9 : -11) + (tick % 3);
            let y = 0;
            while (y < ty - 3) {
                const seg = 4 + ((x + y + tick) % 4);
                const nx = x + (((y * 7 + tick * 3 + bolt * 5) % 7) - 3);
                px(Math.min(x, nx), y, Math.abs(nx - x) + 0.8, seg, (tick + bolt) % 2 ? '#ffffff' : '#ffe97a');
                x = nx;
                y += seg;
            }
        }
    }

    function explodeAt(x, y) {
        const cols = [COLORS.F, COLORS.f, COLORS.O, '#ffffff'];
        for (let i = 0; i < 48; i++) {
            const a = (i / 48) * Math.PI * 2;
            const sp = 8 + (i % 5) * 4;
            particles.push({
                x, y,
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5,
                color: cols[i % 4], born: performance.now()
            });
        }
    }

    function drawParticles(now) {
        particles = particles.filter(p => now - p.born < 900);
        for (const p of particles) {
            const t = (now - p.born) / 1000;
            const x = p.x + p.vx * t;
            const y = p.y + p.vy * t + 30 * t * t;
            if (x > 0 && x < GW && y < GH - 1) px(x, y, 1.2, 1.2, p.color);
        }
    }

    function arcPoint(t, x0, y0, cx, cy, x1, y1) {
        const u = 1 - t;
        return {
            x: u * u * x0 + 2 * u * t * cx + t * t * x1,
            y: u * u * y0 + 2 * u * t * cy + t * t * y1
        };
    }

    // ---- MAIN LOOP ----
    function draw(now) {
        if (!resizeIfNeeded()) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const tick = Math.floor(now / 130);
        const onFireMode = courtEl.classList.contains('on-fire');
        const elapsed = now - stateT0;
        const S = SPORTS[sport] || SPORTS.soccer; // pixel-map fallback body
        const isBB = sport === 'basketball';

        drawBackground(tick);
        if (isBB) drawBasketballHoop(tick);
        else if (sport === 'soccer' || !drawSheetGoal()) drawSoccerGoal(tick);

        const feetY = GH - 2;
        const target = isBB ? rimGeom() : goalGeom();
        const targetY = isBB ? target.rimY - 4 : feetY - 12;
        const missX = isBB ? target.rimX0 - 4 : target.postX - 3;
        let frame = S.idle;
        let pose = 'stand', poseIdx = tick; // sheet-mode pose selection (loops wrap in getSheetFrame)
        let ball = null;
        let hop = 0;

        if (state === 'idle') {
            frame = S.idle;
            if (pendingSport) { sport = pendingSport; pendingSport = null; frame = (SPORTS[sport] || SPORTS.soccer).idle; }
            if (pendingExplosion) { pendingExplosion = false; explodeAt(isBB ? target.targetX + 3 : target.targetX, isBB ? target.rimY : feetY - 16); }
            if (isBB) {
                const phase = Math.abs(Math.sin(now * 0.006));
                ball = { x: PLAYER_X + 19, y: (feetY - 18) + phase * 12 };
            } else {
                ball = { x: PLAYER_X + 20, y: feetY - 5 }; // resting at his feet
            }
        } else if (state === 'prep') {
            frame = S.prep;
            pose = 'prep'; poseIdx = seqIdx('prep', elapsed, 110);
            ball = isBB ? { x: PLAYER_X + 18, y: feetY - 19 }
                        : { x: PLAYER_X + 20, y: feetY - 5 };
            if (elapsed > 420) { state = 'fly'; stateT0 = now; }
        } else if (state === 'fly') {
            frame = S.action;
            const t = Math.min(1, elapsed / 650);
            pose = 'shoot'; poseIdx = seqIdx('shoot', elapsed, 110);
            const x0 = isBB ? PLAYER_X + 16 : PLAYER_X + 20;
            const y0 = isBB ? feetY - frame.length - 2 : feetY - 7;
            const tx = shotMade ? target.targetX : missX;
            const cy = isBB ? Math.max(2, target.rimY - 16) : Math.max(8, feetY - 34);
            const p = arcPoint(t, x0, y0, (x0 + tx) / 2, cy, tx, targetY);
            ball = { x: p.x, y: p.y };
            if (fireTier >= 3) drawLightning(p.x + 3, p.y, tick);
            if (t >= 1) { state = shotMade ? 'net' : 'bounce'; stateT0 = now; }
        } else if (state === 'net') {
            frame = S.action;
            pose = 'follow'; poseIdx = seqIdx('follow', elapsed, 110);
            ball = isBB ? { x: target.targetX, y: target.rimY - 2 + t7(elapsed) }
                        : { x: target.targetX + Math.min(1, elapsed / 250) * 5, y: targetY + Math.min(1, elapsed / 250) * 5 };
            if (elapsed >= 250) {
                state = 'celebrate'; stateT0 = now;
                if (pendingExplosion) {
                    pendingExplosion = false;
                    explodeAt(isBB ? target.targetX + 3 : target.targetX + 4, isBB ? target.rimY : feetY - 16);
                }
            }
        } else if (state === 'celebrate') {
            frame = S.celebrate;
            // Hold the final follow-through pose while hopping (no restart)
            pose = 'follow'; poseIdx = seqIdx('follow', 99999, 110);
            hop = Math.abs(Math.sin(elapsed * 0.015)) * 2;
            if (elapsed > 550) { state = 'idle'; stateT0 = now; checkBonusDone(); }
        } else if (state === 'bounce') {
            frame = S.idle;
            // He just shot and missed — hold the follow-through, not the stand
            pose = 'follow'; poseIdx = seqIdx('follow', 99999, 110);
            const t = elapsed / 600;
            ball = {
                x: missX - t * 22,
                y: Math.min(feetY - 4, targetY - 5 * t + 34 * t * t)
            };
            if (elapsed > 600) { state = 'idle'; stateT0 = now; checkBonusDone(); }
        }

        // Player: sprite-sheet frame if one is loaded for this sport,
        // otherwise the built-in pixel map
        if (state === 'idle') poseIdx = Math.floor(now / 300); // calm idle cadence (wraps per frame count)
        const sf = window.getSheetFrame ? window.getSheetFrame(sport, pose, poseIdx) : null;
        // Sheet stand frames already show the ball in the player's hands; the
        // soccer prep (run-up) needs the waiting ball drawn on the ground
        if (sf && (state === 'idle' || (state === 'prep' && sport !== 'soccer'))) ball = null;
        if (sf) {
            // One scale for the whole sport (from the tallest stand frame) so
            // frames of slightly different trim sizes don't pulse in size
            const refH = (window.SHEET_FRAMES[sport] && window.SHEET_FRAMES[sport]._refH) || sf.sh;
            const scale = (46 * P) / refH;
            const w = sf.sw * scale, h = sf.sh * scale;
            const cx = (PLAYER_X + 12) * P; // fixed center-bottom anchor
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(sf.img, sf.sx, sf.sy, sf.sw, sf.sh,
                Math.round(cx - w / 2), Math.round((feetY - hop) * P - h),
                Math.round(w), Math.round(h));
        } else {
            drawSprite(frame, PLAYER_X, feetY - frame.length - hop, onFireMode || fireTierActive() >= 1);
        }

        if (ball) {
            const bf = window.getSheetFrame ? window.getSheetFrame(sport, 'ball', tick) : null;
            if (bf) {
                const ballRefH = (window.SHEET_FRAMES[sport] && window.SHEET_FRAMES[sport]._ballRefH) || bf.sh;
                const bh = 6 * P * (bf.sh / ballRefH); // uniform spin-frame scale
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(bf.img, bf.sx, bf.sy, bf.sw, bf.sh,
                    Math.round(ball.x * P), Math.round(ball.y * P),
                    Math.round(bf.sw * (bh / bf.sh)), Math.round(bh));
                if (fireTierActive() >= 1 && state !== 'bounce') drawFlames(ball.x, ball.y, tick);
            } else {
                drawBall(ball.x, ball.y, fireTierActive() >= 1 && state !== 'bounce', tick);
            }
        }
        if (bonus) drawBonusBar(now);
        drawParticles(now);
    }

    function t7(elapsed) { return Math.min(1, elapsed / 250) * 7; }

    // Sequential (non-looping) pose index: advances one frame per `per` ms and
    // HOLDS the last frame — never wraps back to the start, whatever the
    // sport's actual frame count (hockey/handball rows have 3, others 4).
    function seqIdx(poseName, ms, per) {
        const s = window.SHEET_FRAMES && window.SHEET_FRAMES[sport];
        const len = (s && s[poseName] && s[poseName].length) || 4;
        return Math.min(len - 1, Math.floor(ms / per));
    }

    // Goal image from a sprite sheet (hockey/tennis/handball); returns false
    // when no sheet goal exists so the caller can draw the fallback
    function drawSheetGoal() {
        const fr = window.getSheetFrame ? window.getSheetFrame(sport, 'goal', 0) : null;
        if (!fr) return false;
        const gh = 26 * P;
        const gw = fr.sw * (gh / fr.sh);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(fr.img, fr.sx, fr.sy, fr.sw, fr.sh,
            Math.round((GW - 24) * P), Math.round((GH - 2) * P - gh),
            Math.round(gw), Math.round(gh));
        return true;
    }

    // Hybrid loop: 60fps via rAF when visible, ~10fps setTimeout fallback when
    // the browser throttles rAF, so animations always run to completion.
    let rafId = null, toId = null;
    function loop(now) {
        if (rafId !== null) cancelAnimationFrame(rafId);
        if (toId !== null) clearTimeout(toId);
        draw(typeof now === 'number' ? now : performance.now());
        rafId = requestAnimationFrame(loop);
        toId = setTimeout(loop, 100);
    }
    loop();
})();
