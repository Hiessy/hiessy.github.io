// --- GAME STATE ---
let gameMode = 'math'; // 'math' or 'abc'
let currentLevel = 1;
let score = 0;
let streak = 0;
// Math specific state
let mathAnswer;
let userInput = "";
// ABC specific state
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
let correctLetterStr = "";
// Story state
let lastStoryStep = -1;
// Rank tracking for the court (perfect-level explosion + sport switching)
let lastRankIdx = 0;
let missesThisRank = 0;
// Level-up bonus mini-game
let pendingBonus = false;
let bonusActive = false;

const BADGE_THRESHOLDS = [0, 15, 30, 60, 100, 150];

// Current rank index (0-5) and % progress toward the next rank.
// The progress bar is derived from this, so it resets on every rank-up.
function rankProgress() {
    let idx = 0;
    for (let i = 0; i < BADGE_THRESHOLDS.length; i++) {
        if (score >= BADGE_THRESHOLDS[i]) idx = i;
    }
    const cur = BADGE_THRESHOLDS[idx];
    const next = BADGE_THRESHOLDS[idx + 1];
    const pct = next === undefined ? 100 : Math.min(100, ((score - cur) / (next - cur)) * 100);
    return { idx, pct };
}

// Random integer in [min, max] inclusive
function ri(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function showStartScreen() {
    document.getElementById('start-screen').classList.add('active');
    const gameScreen = document.getElementById('game-screen');
    gameScreen.classList.remove('active', 'mode-math', 'mode-abc');
}

function startGame(mode, lvl) {
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    startMusic();
    gameMode = mode;
    currentLevel = lvl;
    score = 0;
    streak = 0;
    lastStoryStep = -1;
    lastRankIdx = 0;
    missesThisRank = 0;
    pendingBonus = false;
    bonusActive = false;
    document.getElementById('game-screen').classList.remove('bonus-mode');

    const gameScreen = document.getElementById('game-screen');
    gameScreen.classList.remove('mode-math', 'mode-abc');
    gameScreen.classList.add('mode-' + mode);

    updateStats(true);
    document.getElementById('start-screen').classList.remove('active');
    gameScreen.classList.add('active');

    nextQuestion();
}

function nextQuestion() {
    // A rank-up queues the bonus mini-game; it runs before the next question
    if (pendingBonus && typeof startBonusRound === 'function') {
        pendingBonus = false;
        enterBonusRound();
        return;
    }
    userInput = "";
    updateInputDisplay();
    document.getElementById('question-el').classList.remove('pop');

    if (gameMode === 'math') {
        generateMathQuestion();
    } else {
        generateABCQuestion();
    }
}

// --- BONUS ROUND (level-up reward) ---
// Questions pause; the kid taps the court when the sweeping bar is green to
// take 3 shots in the new rank's sport. Each make is worth 2 points.
function enterBonusRound() {
    bonusActive = true;
    const t = translations[currentLang];
    document.getElementById('game-screen').classList.add('bonus-mode');
    document.getElementById('question-el').innerText = t.bonusTitle;
    document.getElementById('story-caption').innerText = t.bonusHint;
    playSound('badge');
    startBonusRound(made => {
        bonusActive = false;
        document.getElementById('game-screen').classList.remove('bonus-mode');
        score += made * 2;
        playSound(made > 0 ? 'badge' : 'wrong');
        updateStats();
        nextQuestion();
    });
}

// --- MATH LOGIC ---
// Difficulty scales with the player's rank: the mission (currentLevel) picks
// WHICH operations appear; the rank tier grows HOW BIG the numbers get.
const TIER_MAX = [9, 12, 20, 30, 50, 99]; // biggest number per rank tier

function generateMathQuestion() {
    const tier = rankProgress().idx;
    const maxN = TIER_MAX[tier];
    let num1, num2, operator;

    if (currentLevel === 1) { // Mission 1: addition only
        const cap = Math.max(5, Math.floor(maxN / 2));
        num1 = ri(Math.floor(cap / 3), cap); // min grows with rank too
        num2 = ri(1, cap);
        operator = "+";
        mathAnswer = num1 + num2;
    } else if (currentLevel === 2) { // Mission 2: add & subtract
        if (Math.random() > 0.5) {
            operator = "+";
            num1 = ri(Math.max(3, Math.floor(maxN / 3)), maxN); // min grows with rank too
            num2 = ri(1, Math.max(2, Math.floor(maxN / 2)));
            mathAnswer = num1 + num2;
        } else {
            operator = "-";
            num1 = ri(Math.floor(maxN / 2), maxN);
            num2 = ri(0, num1 - 1); // never negative
            mathAnswer = num1 - num2;
        }
    } else { // Mission 3: + - × ÷
        const factorMax = Math.min(12, 4 + tier * 2);
        let opRoll = Math.random();
        if (opRoll < 0.25) {
            operator = "×";
            num1 = ri(1, factorMax);
            num2 = ri(1, factorMax);
            mathAnswer = num1 * num2;
        } else if (opRoll < 0.5) {
            operator = "÷"; // build from the answer so it always divides evenly
            num2 = ri(2, factorMax);
            mathAnswer = ri(1, factorMax);
            num1 = num2 * mathAnswer;
        } else if (opRoll < 0.75) {
            operator = "+";
            num1 = ri(10, 20 + maxN);
            num2 = ri(5, 10 + maxN);
            mathAnswer = num1 + num2;
        } else {
            operator = "-";
            num1 = ri(20, 20 + maxN);
            num2 = ri(5, num1 - 1);
            mathAnswer = num1 - num2;
        }
    }
    document.getElementById('question-el').innerText = `${num1} ${operator} ${num2}`;
}

function typeNum(n) {
    if (gameMode !== 'math' || bonusActive) return;
    if (userInput.length < 3) {
        userInput += n;
        updateInputDisplay();
        playSound('click');
    }
}

function clearInput() {
    userInput = "";
    updateInputDisplay();
    playSound('click');
}

function updateInputDisplay() {
    if (gameMode === 'math') {
        document.getElementById('answer-el').innerText = userInput;
    }
}

function submitMathAnswer() {
    if (userInput === "" || bonusActive) return;
    handleResult(parseInt(userInput) === mathAnswer, document.getElementById('answer-el'));
}

// --- ABC LOGIC ---
function generateABCQuestion() {
    // Reset choice button styles
    const choiceBtns = document.querySelectorAll('#choice-container .choice-btn');
    choiceBtns.forEach(btn => {
        btn.style.backgroundColor = "";
        btn.style.color = "var(--neon-yellow)";
        btn.style.borderColor = "var(--neon-yellow)";
        btn.disabled = false;
    });

    // Simple sequence: What comes next?
    let startIndex = Math.floor(Math.random() * (alphabet.length - 3));
    let qStr = `${alphabet[startIndex]}, ${alphabet[startIndex + 1]}, ?`;
    correctLetterStr = alphabet[startIndex + 2];

    document.getElementById('question-el').innerText = qStr;

    // Generate 3 unique choices including the correct one
    let choices = [correctLetterStr];
    while (choices.length < 3) {
        let randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
        if (!choices.includes(randomLetter)) choices.push(randomLetter);
    }
    // Fisher-Yates shuffle
    for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    document.getElementById('choice-1').innerText = choices[0];
    document.getElementById('choice-2').innerText = choices[1];
    document.getElementById('choice-3').innerText = choices[2];
}

function checkLetterAnswer(btnElement) {
    if (bonusActive) return;
    // Lock buttons so a double-tap can't answer twice
    document.querySelectorAll('#choice-container .choice-btn').forEach(btn => btn.disabled = true);
    handleResult(btnElement.innerText === correctLetterStr, btnElement);
}

// --- SHARED RESULT HANDLER ---
function handleResult(isCorrect, targetElement) {
    if (isCorrect) {
        score += (1 + Math.floor(streak / 5)); // streak bonus
        streak++;
        playSound('correct');
        shootBall(true, currentFireTier());
        if (gameMode === 'math') {
            targetElement.style.borderColor = "var(--neon-green)";
        } else {
            targetElement.style.backgroundColor = "var(--neon-green)";
            targetElement.style.color = "var(--dark-bg)";
        }
        document.getElementById('question-el').classList.add('pop');
        setTimeout(() => {
            if (gameMode === 'math') targetElement.style.borderColor = "var(--neon-pink)";
            nextQuestion();
        }, 600);
    } else {
        streak = 0;
        missesThisRank++;
        playSound('wrong');
        shootBall(false, 0);
        document.getElementById('main-container').classList.add('shake');
        if (gameMode === 'math') {
            targetElement.style.borderColor = "red";
        } else {
            targetElement.style.backgroundColor = "red";
            targetElement.style.color = "white";
            // Highlight the correct answer briefly
            document.querySelectorAll('#choice-container .choice-btn').forEach(btn => {
                if (btn.innerText === correctLetterStr) {
                    btn.style.backgroundColor = "var(--neon-green)";
                    btn.style.color = "var(--dark-bg)";
                }
            });
        }
        setTimeout(() => {
            document.getElementById('main-container').classList.remove('shake');
            if (gameMode === 'math') {
                targetElement.style.borderColor = "var(--neon-pink)";
                clearInput();
                // Past the first rank, a miss keeps the same question for retry
                if (rankProgress().idx >= 1) return;
            }
            nextQuestion();
        }, 1000);
    }
    updateStats();
}

// --- STREET COURT ---
// The pixel-art court lives in js/court.js. Fire effects escalate with the
// streak: 3 = fireball, 5 = the net burns off, 7 = fire + lightning; a
// perfect level (zero misses between rank-ups) triggers an explosion.
const ON_FIRE_STREAK = 3;

function currentFireTier() {
    if (streak >= 7) return 3;
    if (streak >= 5) return 2;
    if (streak >= ON_FIRE_STREAK) return 1;
    return 0;
}

// The sport rotates on every rank-up. With sprite sheets loaded the rotation
// grows to basketball → soccer → hockey → tennis → handball automatically.
function sportForRank(idx) {
    const rotation = (typeof courtSports === 'function') ? courtSports() : ['basketball', 'soccer'];
    return rotation[idx % rotation.length];
}

// --- STORY ---
function updateStory() {
    const steps = ACTIVE_STORY.steps;
    const stepIdx = Math.min(Math.floor(score / ACTIVE_STORY.pointsPerStep), steps.length - 1);
    document.getElementById('story-icon').innerText = steps[stepIdx].icon;
    document.getElementById('story-caption').innerText = steps[stepIdx][currentLang];

    if (stepIdx !== lastStoryStep && lastStoryStep !== -1 && score > 0) {
        const panel = document.getElementById('story-panel');
        panel.classList.remove('pop');
        void panel.offsetWidth; // restart the animation
        panel.classList.add('pop');
    }
    lastStoryStep = stepIdx;
}

// --- STATS / HUD ---
function updateStats(force = false) {
    document.getElementById('score-el').innerText = score;
    document.getElementById('streak-el').innerText = streak > 1 ? `🔥${streak}` : '';

    const badgeEl = document.getElementById('badge-el');
    const currentBadgeText = badgeEl.innerText;
    const { idx, pct } = rankProgress();
    const newBadgeName = translations[currentLang].badges[idx];

    // Rank-up: perfect level (no misses) earns an explosion, and the sport
    // alternates between basketball and soccer
    if (idx > lastRankIdx) {
        if (missesThisRank === 0 && typeof courtExplosion === 'function') courtExplosion();
        missesThisRank = 0;
        lastRankIdx = idx;
        pendingBonus = true; // reward: sport mini-game before the next question
    }
    if (typeof setCourtSport === 'function') setCourtSport(sportForRank(idx));

    if (currentBadgeText !== newBadgeName || force) {
        badgeEl.innerText = newBadgeName;
        if (!force && score > 0) {
            playSound('badge');
            badgeEl.classList.remove('level-up-flash');
            void badgeEl.offsetWidth; // restart the animation
            badgeEl.classList.add('level-up-flash');
            setTimeout(() => badgeEl.classList.remove('level-up-flash'), 1000);
        }
    }

    // Progress toward the NEXT rank — resets automatically on rank-up
    document.getElementById('progress-bar').style.width = `${pct}%`;

    // On fire! (3+ correct in a row)
    document.getElementById('court').classList.toggle('on-fire', streak >= ON_FIRE_STREAK);
    document.getElementById('fire-msg').innerText = translations[currentLang].onFire;

    updateStory();
}

// --- KEYBOARD SUPPORT ---
document.addEventListener('keydown', (e) => {
    if (!document.getElementById('game-screen').classList.contains('active')) return;
    if (bonusActive) {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (typeof bonusTap === 'function') bonusTap();
        }
        return;
    }
    if (gameMode !== 'math') return;
    if (e.key >= '0' && e.key <= '9') typeNum(parseInt(e.key));
    if (e.key === 'Enter') submitMathAnswer();
    if (e.key === 'Backspace') {
        e.preventDefault();
        userInput = userInput.slice(0, -1);
        updateInputDisplay();
    }
});
