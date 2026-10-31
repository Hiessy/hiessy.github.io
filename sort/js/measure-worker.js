/* Times a pasted JavaScript function at one input size at a time. It lives in a
   worker so the page can stop it if the function never returns. */
let fn = null;
let sink = 0;

/* Accepts a declaration, a function expression, or an arrow function. */
function compile(code) {
    const trimmed = code.trim().replace(/;\s*$/, '');
    const declared = trimmed.match(/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/);
    const assigned = trimmed.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/);
    const names = [...code.matchAll(/(?:^|\n)\s*function\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
    if (declared || assigned) {
        // With several functions, the last one defined is the one that calls the others.
        const last = names.length ? names[names.length - 1] : (declared || assigned)[1];
        return new Function(`${code}\n;return ${last};`)();
    }
    return new Function(`return (${trimmed});`)();
}

function randomInts(n) {
    const a = new Array(n);
    for (let i = 0; i < n; i++) {
        a[i] = Math.floor(Math.random() * 1e9);
    }
    return a;
}

function makeInput(kind, n) {
    if (kind === 'number') return n;
    if (kind === 'string') return 'abcdefghij'.repeat(Math.ceil(n / 10)).slice(0, n);
    if (kind === 'sorted') return randomInts(n).sort((a, b) => a - b);
    return randomInts(n);
}

function copyOf(input) {
    return Array.isArray(input) ? input.slice() : input;
}

/* The clock only ticks every 0.1 ms, so fast calls are timed in batches. */
function timeOnce(input, batch) {
    const copies = new Array(batch);
    for (let i = 0; i < batch; i++) {
        copies[i] = copyOf(input);
    }
    const start = performance.now();
    for (let i = 0; i < batch; i++) {
        const result = fn(copies[i]);
        sink ^= typeof result === 'number' ? result : 1;
    }
    return performance.now() - start;
}

function measure(kind, n) {
    const input = makeInput(kind, n);
    let batch = 1;
    let elapsed = timeOnce(input, batch);
    while (elapsed < 4 && batch < 1 << 16) {
        batch *= 2;
        elapsed = timeOnce(input, batch);
    }
    // The fastest of three runs has the least interference from everything else.
    let best = elapsed;
    if (elapsed < 200) {
        best = Math.min(best, timeOnce(input, batch), timeOnce(input, batch));
    }
    return best / batch;
}

onmessage = ({ data }) => {
    try {
        if (data.code !== undefined) {
            fn = compile(data.code);
            if (typeof fn !== 'function') {
                throw new Error('That code doesn\'t define a function.');
            }
            postMessage({ type: 'compiled' });
        } else {
            postMessage({ type: 'point', n: data.n, ms: measure(data.kind, data.n) });
        }
    } catch (error) {
        postMessage({ type: 'error', message: error.message });
    }
};
