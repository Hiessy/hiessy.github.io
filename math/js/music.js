// --- BACKGROUND MUSIC (synthesized loop, no audio files) ---
// A gentle space arpeggio: triangle-wave melody over a soft sine bass.
let musicEnabled = true;
const musicState = { timer: null, step: 0 };

// A-minor pentatonic pattern (Hz)
const MUSIC_MELODY = [
    220.00, 261.63, 329.63, 440.00, 392.00, 329.63, 261.63, 329.63,
    196.00, 246.94, 329.63, 392.00, 440.00, 392.00, 329.63, 246.94
];
const MUSIC_BASS = [110.00, 98.00, 87.31, 98.00];
const MUSIC_STEP_MS = 320;

function musicNote(freq, type, volume, duration) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
}

function musicTick() {
    if (!musicEnabled) { musicState.timer = null; return; }
    if (audioCtx.state === 'running') {
        musicNote(MUSIC_MELODY[musicState.step % MUSIC_MELODY.length], 'triangle', 0.03, 0.35);
        if (musicState.step % 4 === 0) {
            musicNote(MUSIC_BASS[Math.floor(musicState.step / 4) % MUSIC_BASS.length], 'sine', 0.05, 1.1);
        }
        musicState.step++;
    }
    musicState.timer = setTimeout(musicTick, MUSIC_STEP_MS);
}

function startMusic() {
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    if (musicEnabled && !musicState.timer) musicTick();
}

function toggleMusic() {
    musicEnabled = !musicEnabled;
    document.getElementById('music-btn').innerText = musicEnabled ? '🎵' : '🔇';
    if (musicEnabled) startMusic();
}
