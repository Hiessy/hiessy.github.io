// --- AUDIO ENGINE (synthesized, no sound files needed) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    // Browsers start the context suspended until the first user gesture
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }

    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const now = audioCtx.currentTime;
        let duration = 0.3;

        if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.05, now);
            duration = 0.05;
        } else if (type === 'correct') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        } else if (type === 'wrong') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.3);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
        } else if (type === 'badge') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554.37, now + 0.1);
            osc.frequency.setValueAtTime(659.25, now + 0.2);
            osc.frequency.setValueAtTime(880, now + 0.3);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            duration = 0.6;
        }

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        // stop() must be scheduled AFTER start() or the oscillator throws
        osc.start(now);
        osc.stop(now + duration);
    } catch (e) {
        console.error("Audio Error:", e);
    }
}
