// --- LOCALIZATION ---
const translations = {
    en: {
        title: "SPACE<br>ACADEMY",
        mission: "Choose your mission:",
        btnABCMain: "🅰️ ABC Astronaut",
        btnABCDesc: "Learn letters & sequences",
        btn1Main: "🚀 Math Cadet",
        btn1Desc: "Numbers up to 10 (Adding)",
        btn2Main: "🪐 Galaxy Ranger",
        btn2Desc: "Up to 20 (Add & Subtract)",
        btn3Main: "👑 Universe Master",
        btn3Desc: "Advanced (+ - × ÷)",
        scoreLabel: "Score:",
        exitBtn: "← Exit",
        onFire: "🔥 ON FIRE! 🔥",
        bonusTitle: "🎯 BONUS ROUND!",
        bonusHint: "Tap the court when the bar is green — 3 shots!",
        badges: ["🌱 Cadet", "🚀 Pilot", "⭐ Captain", "🦸 Hero", "🧙‍♂️ Wizard", "👑 Legend"]
    },
    es: {
        title: "ACADEMIA<br>ESPACIAL",
        mission: "Elige tu misión:",
        btnABCMain: "🅰️ Astronauta ABC",
        btnABCDesc: "Aprende letras y secuencias",
        btn1Main: "🚀 Cadete Matemático",
        btn1Desc: "Números hasta 10 (Sumar)",
        btn2Main: "🪐 Guardián Galáctico",
        btn2Desc: "Hasta 20 (Sumar y Restar)",
        btn3Main: "👑 Maestro del Universo",
        btn3Desc: "Avanzado (+ - × ÷)",
        scoreLabel: "Puntaje:",
        exitBtn: "← Salir",
        onFire: "🔥 ¡EN LLAMAS! 🔥",
        bonusTitle: "🎯 ¡RONDA EXTRA!",
        bonusHint: "¡Toca la cancha cuando la barra esté en verde — 3 tiros!",
        badges: ["🌱 Cadete", "🚀 Piloto", "⭐ Capitán", "🦸 Héroe", "🧙‍♂️ Mago", "👑 Leyenda"]
    }
};

let currentLang = 'en';

function toggleLanguage() {
    currentLang = (currentLang === 'en') ? 'es' : 'en';
    document.documentElement.lang = currentLang;
    updateLanguage();
}

function updateLanguage() {
    const t = translations[currentLang];
    document.getElementById('title-text').innerHTML = t.title;
    document.getElementById('mission-text').innerText = t.mission;
    document.getElementById('btn-abc').innerHTML = `${t.btnABCMain} <span class="level-desc">${t.btnABCDesc}</span>`;
    document.getElementById('btn-lvl-1').innerHTML = `${t.btn1Main} <span class="level-desc">${t.btn1Desc}</span>`;
    document.getElementById('btn-lvl-2').innerHTML = `${t.btn2Main} <span class="level-desc">${t.btn2Desc}</span>`;
    document.getElementById('btn-lvl-3').innerHTML = `${t.btn3Main} <span class="level-desc">${t.btn3Desc}</span>`;
    document.getElementById('label-score').innerText = t.scoreLabel;
    document.getElementById('btn-exit').innerText = t.exitBtn;
    updateStats(true); // force update to translate current badge
}
