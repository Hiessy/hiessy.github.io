/* Runs the race away from the page so timing isn't disturbed by drawing.
   Both sides sort the same numbers, built from the same seed by each language. */
importScripts('algorithms.js', '../wasm/sort.wasm-runtime.js');

let java = null;
const ready = TeaVM.wasmGC.load('../wasm/sort.wasm')
    .then((teavm) => {
        java = teavm.exports;
    })
    .catch((error) => {
        postMessage({ type: 'java-unavailable', reason: String(error) });
    });

const WARM_UP_MS = 350;
const BUDGET_MS = 250;
const MAX_RUNS = 400;

/* The clock ticks every 0.1 ms, so a median of shorter runs would only show ticks.
   The mean of many short runs still averages out to the right value. */
function typical(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    return median >= 1 ? median : values.reduce((a, b) => a + b, 0) / values.length;
}

function race({ id, index, n, pattern, seed }) {
    const master = Sorts.generate(n, pattern, seed);
    const expected = Sorts.checksum(master.slice().sort());
    const work = new Int32Array(n);
    const sort = Sorts.sorts[id];

    const runJs = () => {
        work.set(master);
        const start = performance.now();
        sort(work);
        return performance.now() - start;
    };
    const runJava = () => {
        java.reset();
        const start = performance.now();
        java.sort(index);
        return performance.now() - start;
    };
    if (java) {
        java.prepare(n, pattern, seed);
    }

    // Both compilers optimize code that keeps running, and JavaScript's takes longer
    // to get there. These runs don't count, unless a single run is already so slow
    // that it has been optimized by the time it ends.
    const jsTimes = [runJs()];
    const javaTimes = java ? [runJava()] : [];
    if (jsTimes[0] + (javaTimes[0] || 0) < 2000) {
        const warmUp = performance.now();
        while (performance.now() - warmUp < WARM_UP_MS) {
            runJs();
            if (java) {
                runJava();
            }
        }
        jsTimes.length = 0;
        javaTimes.length = 0;
        const start = performance.now();
        while (jsTimes.length < 3 || (performance.now() - start < BUDGET_MS && jsTimes.length < MAX_RUNS)) {
            jsTimes.push(runJs());
            if (java) {
                javaTimes.push(runJava());
            }
        }
    }

    const jsChecksum = Sorts.checksum(work);
    return {
        type: 'result',
        id,
        jsMs: typical(jsTimes),
        javaMs: java ? typical(javaTimes) : null,
        runs: jsTimes.length,
        correct: jsChecksum === expected,
        identical: java ? java.checksum() === jsChecksum : null,
    };
}

onmessage = async (event) => {
    await ready;
    postMessage(race(event.data));
};

ready.then(() => postMessage({ type: 'ready' }));
