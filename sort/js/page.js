/* Everything the Sorting Lab page does: watch, race, the table and the O lab. */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const format = (x) => x.toLocaleString('en-US');
    const INPUTS = ['Random', 'Sorted', 'Reversed', 'Nearly sorted', 'Few unique', 'Sorted runs', 'Organ pipe', 'All equal'];
    const FAMILIES = {
        Exchange: 'Exchange', Selection: 'Selection', Insertion: 'Insertion', Merge: 'Merge', Quick: 'Quicksort',
        Heap: 'Heap', Tree: 'Tree', Distribution: 'Distribution', Network: 'Sorting networks', Silly: 'Slow on purpose',
    };
    let catalog = [];

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function fillInputs(select) {
        INPUTS.forEach((name, i) => select.append(new Option(name, i)));
    }

    function fillAlgorithms(select) {
        for (const family of Object.keys(FAMILIES)) {
            const group = document.createElement('optgroup');
            group.label = FAMILIES[family];
            catalog.filter((a) => a.family === family).forEach((a) => group.append(new Option(a.name, a.id)));
            select.append(group);
        }
    }

    /* ---------------------------------------------------------------- Watch */

    const TAPE_LIMIT = 6000000;
    const tape = new Int32Array(TAPE_LIMIT);
    const FULL = new Error('tape full');
    const watch = {
        entry: null, display: null, top: 1, length: 0, position: 0, playing: false, finished: false, truncated: false,
        credit: 0, reads: 0, writes: 0, ops: 0, marks: null, done: 0, seed: 1,
    };
    const colours = {};

    function readColours() {
        const style = getComputedStyle(document.documentElement);
        for (const name of ['bar', 'read', 'write', 'done']) {
            colours[name] = style.getPropertyValue(`--${name}`).trim();
        }
    }

    function watchData(n, input) {
        const values = Sorts.generate(n, input, watch.seed);
        if (input === 0) {
            // Random input is a shuffle of 1..n, so every bar has its own height.
            const order = Array.from(values.keys()).sort((x, y) => values[x] - values[y] || x - y);
            order.forEach((position, rank) => {
                values[position] = rank + 1;
            });
        } else {
            for (let i = 0; i < n; i++) values[i] += 1;
        }
        return values;
    }

    /* Runs the real sort on an array that writes down every read and write. */
    function record(id, values) {
        let length = 0;
        let ops = 0;
        const target = values.slice();
        const log = (first, second) => {
            if (length + 2 > TAPE_LIMIT) throw FULL;
            tape[length++] = first;
            if (second !== undefined) tape[length++] = second;
            ops++;
        };
        const traced = new Proxy(target, {
            get(array, key) {
                if (typeof key === 'string') {
                    const code = key.charCodeAt(0);
                    if (code >= 48 && code <= 57) {
                        log(+key * 2);
                        return array[key];
                    }
                }
                return array[key];
            },
            set(array, key, value) {
                array[key] = value;
                log(+key * 2 + 1, array[key]);
                return true;
            },
        });
        let truncated = false;
        try {
            Sorts.sorts[id](traced);
        } catch (error) {
            if (error !== FULL) throw error;
            truncated = true;
        }
        return { length, ops, truncated };
    }

    function loadWatch() {
        const entry = catalog.find((a) => a.id === $('w-algorithm').value);
        const previous = watch.entry;
        watch.entry = entry;
        if (entry !== previous) {
            const sizeSelect = $('w-size');
            const wanted = +sizeSelect.value || entry.watch;
            sizeSelect.textContent = '';
            const sizes = [...new Set([5, 6, 7, 16, 32, 64, 96, 128, 256, 512, 1024, entry.watch, entry.watchMax])]
                .filter((n) => n <= entry.watchMax && n >= entry.watchMax / 16).sort((x, y) => x - y);
            sizes.forEach((n) => sizeSelect.append(new Option(n, n)));
            sizeSelect.value = String(previous && sizes.includes(wanted) ? wanted : entry.watch);
            showFacts(entry);
        }
        const n = +$('w-size').value;
        const values = watchData(n, +$('w-input').value);
        const { length, ops, truncated } = record(entry.id, values);
        Object.assign(watch, {
            display: values, top: Math.max(...values, 1), length, ops, truncated, position: 0, credit: 0,
            reads: 0, writes: 0, finished: false, done: 0, marks: new Uint8Array(n),
        });
        drawWatch();
        showStats();
    }

    function showFacts(entry) {
        $('w-family').textContent = FAMILIES[entry.family];
        $('w-name').textContent = entry.name;
        $('w-about').textContent = entry.about;
        $('w-best').textContent = entry.best;
        $('w-average').textContent = entry.average;
        $('w-worst').textContent = entry.worst;
        $('w-memory').textContent = entry.memory;
        $('w-stable').textContent = entry.stable ? 'Yes' : 'No';
        $('w-canvas').setAttribute('aria-label', `Bars showing ${entry.name} sorting the array`);
        showSource();
    }

    function showStats() {
        let state = watch.finished ? 'Sorted.' : '';
        if (watch.finished && watch.truncated) {
            state = 'Stopped here: the recording filled up before it finished.';
        }
        $('w-stats').textContent = `${format(watch.reads)} reads · ${format(watch.writes)} writes ${state}`;
    }

    function step() {
        const seconds = 32 / 2 ** +$('w-speed').value;
        watch.credit += watch.ops / (seconds * 60);
        let steps = Math.floor(watch.credit);
        watch.credit -= steps;
        watch.marks.fill(0);
        while (steps > 0 && watch.position < watch.length) {
            const code = tape[watch.position++];
            const index = code >> 1;
            if (code & 1) {
                watch.display[index] = tape[watch.position++];
                watch.marks[index] = 2;
                watch.writes++;
            } else {
                if (watch.marks[index] === 0) watch.marks[index] = 1;
                watch.reads++;
            }
            steps--;
        }
    }

    function drawWatch() {
        const canvas = $('w-canvas');
        const ratio = window.devicePixelRatio || 1;
        const width = Math.round(canvas.clientWidth * ratio);
        const height = Math.round(canvas.clientHeight * ratio);
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, width, height);
        const n = watch.display.length;
        const pad = 12 * ratio;
        const barWidth = (width - 2 * pad) / n;
        const gap = barWidth > 3 * ratio ? Math.min(2 * ratio, barWidth / 4) : 0;
        for (let i = 0; i < n; i++) {
            const barHeight = Math.max(1, (watch.display[i] / watch.top) * (height - 2 * pad));
            if (i < watch.done) context.fillStyle = colours.done;
            else if (watch.marks[i] === 2) context.fillStyle = colours.write;
            else if (watch.marks[i] === 1) context.fillStyle = colours.read;
            else context.fillStyle = colours.bar;
            context.fillRect(pad + i * barWidth + gap / 2, height - pad - barHeight, barWidth - gap, barHeight);
        }
    }

    function frame() {
        if (!watch.playing) return;
        if (watch.position < watch.length) {
            step();
            drawWatch();
            showStats();
        } else if (!watch.finished) {
            watch.marks.fill(0);
            watch.done = Math.min(watch.display.length, watch.done + Math.ceil(watch.display.length / 30));
            drawWatch();
            if (watch.done === watch.display.length) {
                watch.finished = true;
                watch.playing = false;
                $('w-play').textContent = 'Replay';
                showStats();
                return;
            }
        }
        requestAnimationFrame(frame);
    }

    function play() {
        if (watch.finished) loadWatch();
        watch.playing = true;
        $('w-play').textContent = 'Pause';
        requestAnimationFrame(frame);
    }

    function pause() {
        watch.playing = false;
        $('w-play').textContent = 'Play';
    }

    function restart(newData) {
        const wasPlaying = watch.playing;
        watch.playing = false;
        if (newData) watch.seed = (Math.random() * 2147483646 + 1) | 0;
        loadWatch();
        if (wasPlaying || newData) play();
        else pause();
    }

    function selectAlgorithm(id) {
        $('w-algorithm').value = id;
        restart(true);
        $('watch').scrollIntoView();
    }

    /* The code panel loads on first use, because it's the page's largest file. */
    let sources = null;
    let sourceLanguage = 'java';

    function highlight(code) {
        const target = $('w-source');
        target.textContent = '';
        const token = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|\b(static|private|final|void|int|boolean|double|return|if|else|for|while|do|break|continue|new|true|false|function|let|const)\b|\b(\d+)\b/g;
        let last = 0;
        for (const m of code.matchAll(token)) {
            target.append(code.slice(last, m.index));
            target.append(el('span', m[1] ? 'c' : m[2] ? 'k' : 'n', m[0]));
            last = m.index + m[0].length;
        }
        target.append(code.slice(last));
    }

    async function showSource() {
        if (!$('w-code').open) return;
        if (!sources) {
            sources = await fetch('js/sources.json').then((r) => r.json());
        }
        highlight(sources[watch.entry.id][sourceLanguage]);
    }

    function chooseLanguage(language) {
        sourceLanguage = language;
        $('tab-java').setAttribute('aria-selected', language === 'java');
        $('tab-js').setAttribute('aria-selected', language === 'js');
        showSource();
    }

    /* ----------------------------------------------------------------- Race */

    const WATCHDOG_MS = 20000;
    const race = { worker: null, ready: null, finish: null, running: false, stopped: false, results: [], javaMissing: false };

    function startWorker() {
        race.worker = new Worker('js/race-worker.js');
        race.ready = new Promise((resolve) => {
            race.worker.onmessage = ({ data }) => {
                if (data.type === 'java-unavailable') race.javaMissing = true;
                if (data.type === 'ready') resolve();
            };
        });
        return race.ready;
    }

    function raceOne(entry, n, input, seed) {
        return new Promise((resolve) => {
            const finish = (result) => {
                clearTimeout(timer);
                race.finish = null;
                resolve(result);
            };
            const timer = setTimeout(() => {
                race.worker.terminate();
                race.worker = null;
                finish({ id: entry.id, tooSlow: true });
            }, WATCHDOG_MS);
            race.finish = finish;
            race.worker.onmessage = ({ data }) => {
                if (data.type === 'result') finish(data);
            };
            race.worker.postMessage({ id: entry.id, index: catalog.indexOf(entry), n, pattern: input, seed });
        });
    }

    function time(ms) {
        if (ms === null || ms === undefined) return '–';
        if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
        if (ms >= 10) return `${ms.toFixed(0)} ms`;
        if (ms >= 0.1) return `${ms.toFixed(2)} ms`;
        if (ms >= 0.001) return `${(ms * 1000).toFixed(0)} µs`;
        return ms > 0 ? `${(ms * 1e6).toFixed(0)} ns` : 'under 1 ns';
    }

    function fasterCell(cell, r) {
        if (r.javaMs === null || r.javaMs === undefined) {
            cell.textContent = '–';
            return;
        }
        const jsSlower = r.jsMs > r.javaMs;
        const small = Math.max(Math.min(r.jsMs, r.javaMs), 0.01);
        const ratio = Math.max(r.jsMs, r.javaMs) / small;
        const bars = el('span', 'versus');
        bars.setAttribute('aria-hidden', 'true');
        const width = `${Math.min(100, (Math.log2(ratio) / 2) * 100)}%`;
        const js = el('i');
        const java = el('b');
        if (jsSlower) java.style.width = width;
        else js.style.width = width;
        js.style.width = js.style.width || '0';
        java.style.width = java.style.width || '0';
        bars.append(js, java);
        cell.append(bars);
        if (ratio < 1.1) cell.append(el('span', 'tie', 'Too close'));
        else cell.append(`${jsSlower ? 'Java' : 'JavaScript'} ${ratio.toFixed(ratio < 10 ? 2 : 0)}×`);
    }

    function raceRow(r) {
        const entry = catalog.find((a) => a.id === r.id);
        const row = el('tr');
        row.append(el('td', '', entry.name));
        if (r.tooSlow || r.skipped) {
            const cell = el('td', 'tie', r.tooSlow ? 'Too slow at this size: stopped after 20 s' : `Sits out: limit is ${format(entry.raceMax)} items`);
            cell.colSpan = 4;
            row.append(cell);
            return row;
        }
        row.append(el('td', 'num', time(r.jsMs)), el('td', 'num', time(r.javaMs)));
        const faster = el('td');
        fasterCell(faster, r);
        row.append(faster);
        let check = 'Yes';
        if (!r.correct) check = 'JavaScript sorted it wrong';
        else if (r.identical === false) check = 'Java sorted it wrong';
        else if (r.identical === null) check = 'JavaScript only';
        row.append(el('td', '', check));
        return row;
    }

    function showResults() {
        const rank = (r) => (r.skipped ? 2e9 : r.tooSlow ? 1e9 : r.jsMs + (r.javaMs || r.jsMs));
        const sorted = race.results.slice().sort((x, y) => rank(x) - rank(y));
        $('r-rows').replaceChildren(...sorted.map(raceRow));
        const timed = race.results.filter((r) => r.jsMs !== undefined && r.javaMs !== null && r.javaMs !== undefined);
        const clear = (r) => Math.max(r.jsMs, r.javaMs) / Math.max(Math.min(r.jsMs, r.javaMs), 0.01) >= 1.1;
        $('r-js-wins').textContent = timed.filter((r) => clear(r) && r.jsMs < r.javaMs).length;
        $('r-java-wins').textContent = timed.filter((r) => clear(r) && r.javaMs < r.jsMs).length;
        $('r-same').textContent = `${timed.filter((r) => r.identical && r.correct).length} of ${timed.length}`;
    }

    async function startRace() {
        if (race.running) return;
        race.running = true;
        race.stopped = false;
        race.results = [];
        $('r-run').disabled = true;
        $('r-stop').disabled = false;
        $('r-wrap').hidden = false;
        $('r-tiles').hidden = false;
        $('r-note').hidden = false;
        $('r-rows').textContent = '';
        const n = +$('r-size').value;
        const input = +$('r-input').value;
        const choice = $('r-algorithm').value;
        const list = choice === 'all' ? catalog : catalog.filter((a) => a.id === choice);
        const seed = (Math.random() * 2147483646 + 1) | 0;
        let finished = 0;
        for (const entry of list) {
            if (race.stopped) break;
            if (n > entry.raceMax) {
                race.results.push({ id: entry.id, skipped: true });
            } else {
                $('r-status').textContent = `Running ${entry.name} (${finished + 1} of ${list.length})…`;
                if (!race.worker) await startWorker();
                await race.ready;
                if (race.stopped) break;
                const result = await raceOne(entry, n, input, seed);
                if (!result) break;
                race.results.push(result);
            }
            finished++;
            showResults();
        }
        $('r-status').textContent = race.javaMissing
            ? 'This browser can\'t run the Java build, which needs WebAssembly GC, so only JavaScript ran.'
            : race.stopped ? 'Stopped.' : `Done: ${format(n)} items, ${INPUTS[input].toLowerCase()} input.`;
        race.running = false;
        $('r-run').disabled = false;
        $('r-stop').disabled = true;
    }

    function stopRace() {
        race.stopped = true;
        if (race.worker) {
            race.worker.terminate();
            race.worker = null;
        }
        if (race.finish) race.finish(null);
    }

    /* ---------------------------------------------------------- Algorithm table */

    function buildTable() {
        const rows = catalog.map((a) => {
            const row = el('tr');
            row.dataset.family = a.family;
            const name = el('td');
            const button = el('button', '', a.name);
            button.type = 'button';
            button.title = a.about;
            name.append(button);
            row.append(name, el('td', '', FAMILIES[a.family]), el('td', '', a.best), el('td', '', a.average),
                el('td', '', a.worst), el('td', '', a.memory), el('td', '', a.stable ? 'Yes' : 'No'));
            row.addEventListener('click', () => selectAlgorithm(a.id));
            return row;
        });
        $('a-rows').replaceChildren(...rows);

        const filters = $('a-filters');
        const pick = (family, chosen) => {
            filters.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === chosen));
            rows.forEach((r) => {
                r.hidden = family !== 'all' && r.dataset.family !== family;
            });
        };
        const addFilter = (family, label) => {
            const button = el('button', '', label);
            button.type = 'button';
            button.setAttribute('aria-pressed', family === 'all');
            button.addEventListener('click', () => pick(family, button));
            filters.append(button);
        };
        addFilter('all', `All ${catalog.length}`);
        Object.keys(FAMILIES).forEach((family) => addFilter(family, FAMILIES[family]));
    }

    /* ------------------------------------------------------------- The O lab */

    const EXAMPLES = [
        { name: 'Bubble sort (JavaScript)', input: 'array', code: `function bubble(a) {
  for (let end = a.length - 1; end > 0; end--) {
    for (let i = 0; i < end; i++) {
      if (a[i] > a[i + 1]) {
        const t = a[i];
        a[i] = a[i + 1];
        a[i + 1] = t;
      }
    }
  }
}` },
        { name: 'Sum of an array (JavaScript)', input: 'array', code: `function sum(a) {
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    total += a[i];
  }
  return total;
}` },
        { name: 'Merge sort (JavaScript)', input: 'array', code: `function merge(left, right) {
  const out = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    out.push(left[i] <= right[j] ? left[i++] : right[j++]);
  }
  while (i < left.length) out.push(left[i++]);
  while (j < right.length) out.push(right[j++]);
  return out;
}

function mergeSort(a) {
  if (a.length < 2) return a;
  const mid = a.length >> 1;
  const left = mergeSort(a.slice(0, mid));
  const right = mergeSort(a.slice(mid));
  return merge(left, right);
}` },
        { name: 'Fibonacci, recursive (JavaScript)', input: 'number', code: `function fib(n) {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}` },
        { name: 'Binary search (Python, read only)', input: 'sorted', code: `def find(items, target):
    lo, hi = 0, len(items) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if items[mid] == target:
            return mid
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1` },
        { name: 'Nested loops (Java, read only)', input: 'array', code: `static int countPairs(int[] a) {
    int pairs = 0;
    for (int i = 0; i < a.length; i++) {
        for (int j = i + 1; j < a.length; j++) {
            if (a[i] > a[j]) {
                pairs++;
            }
        }
    }
    return pairs;
}` },
        { name: 'Halving loop inside a loop (Go, read only)', input: 'number', code: `func work(n int) int {
    total := 0
    for i := 0; i < n; i++ {
        for j := n; j > 0; j /= 2 {
            total++
        }
    }
    return total
}` },
        { name: 'Permutations (Python, read only)', input: 'array', code: `def permute(items, k):
    if k == len(items):
        print(items)
        return
    for i in range(k, len(items)):
        items[k], items[i] = items[i], items[k]
        permute(items, k + 1)
        items[k], items[i] = items[i], items[k]` },
    ];

    const STEP_LIMIT_MS = 2500;
    const TOTAL_LIMIT_MS = 15000;
    const lab = { worker: null, run: 0 };

    function readCode() {
        const code = $('o-code').value;
        const result = code.trim() ? BigO.read(code) : null;
        $('o-read').textContent = result ? result.label : '–';
        const steps = result ? result.steps : [];
        $('o-steps').replaceChildren(...(steps.length ? steps : result ? ['No loops or recursion found, so the work doesn\'t grow with n.'] : [])
            .map((s) => el('li', '', s)));
    }

    function askWorker(worker, message) {
        return new Promise((resolve) => {
            const timer = setTimeout(() => resolve({ type: 'timeout' }), STEP_LIMIT_MS);
            worker.onmessage = ({ data }) => {
                clearTimeout(timer);
                resolve(data);
            };
            worker.onerror = (event) => {
                clearTimeout(timer);
                resolve({ type: 'error', message: event.message });
            };
            worker.postMessage(message);
        });
    }

    async function openWorker(code) {
        const worker = new Worker('js/measure-worker.js');
        lab.worker = worker;
        const reply = await askWorker(worker, { code });
        return reply.type === 'compiled' ? { worker } : { error: reply.message || 'It didn\'t compile.' };
    }

    function shortN(n) {
        if (n >= 1048576) return `${n / 1048576}M`;
        if (n >= 1024) return `${n / 1024}K`;
        return String(n);
    }

    function showMeasurements(points, stopped) {
        const fit = BigO.fit(points);
        $('o-measured').textContent = fit ? fit.label : '–';
        if (fit) {
            const parts = [fit.exponential ? 'The times grow faster than any power of n.' : `On a log-log chart the points have a slope of ${fit.slope.toFixed(2)}.`];
            if (fit.runnerUp) parts.push(`${fit.runnerUp} fits almost as well, so treat this as a close call.`);
            if (stopped) parts.push(stopped);
            $('o-detail').textContent = parts.join(' ');
        }
        $('o-table-wrap').hidden = points.length === 0;
        $('o-table').replaceChildren(...points.map((p, i) => {
            const row = el('tr');
            const before = points[i - 1];
            row.append(el('td', 'num', format(p.n)), el('td', 'num', time(p.ms)),
                el('td', 'num', before ? `× ${(p.ms / before.ms).toFixed(2)}` : '–'));
            return row;
        }));
        drawChart(points, fit);
    }

    /* Log-log chart: a power of n is a straight line, and its slope is the exponent. */
    function drawChart(points, fit) {
        const holder = $('o-chart');
        holder.textContent = '';
        if (points.length < 2) return;
        const NS = 'http://www.w3.org/2000/svg';
        const make = (tag, attributes, parent) => {
            const node = document.createElementNS(NS, tag);
            Object.entries(attributes).forEach(([k, v]) => node.setAttribute(k, v));
            (parent || svg).append(node);
            return node;
        };
        const width = 520;
        const height = 240;
        const left = 56;
        const right = 12;
        const top = 10;
        const bottom = 30;
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'Time against input size, both on logarithmic scales. The table below has the same numbers.');

        const xs = points.map((p) => Math.log2(p.n));
        const ys = points.map((p) => Math.log10(Math.max(p.ms, 1e-6)));
        const xMin = Math.floor(Math.min(...xs));
        const xMax = Math.ceil(Math.max(...xs));
        const yMin = Math.floor(Math.min(...ys));
        const yMax = Math.max(Math.ceil(Math.max(...ys)), yMin + 1);
        const x = (v) => left + ((v - xMin) / Math.max(1, xMax - xMin)) * (width - left - right);
        const y = (v) => top + (1 - (v - yMin) / (yMax - yMin)) * (height - top - bottom);

        for (let v = yMin; v <= yMax; v++) {
            make('line', { x1: left, x2: width - right, y1: y(v), y2: y(v), stroke: 'var(--grid)' });
            make('text', { x: left - 6, y: y(v) + 4, 'text-anchor': 'end' }).textContent = time(10 ** v);
        }
        const stride = Math.max(1, Math.ceil((xMax - xMin) / 7));
        for (let v = xMin; v <= xMax; v += stride) {
            make('text', { x: x(v), y: height - 10, 'text-anchor': 'middle' }).textContent = shortN(2 ** v);
        }
        make('line', { x1: left, x2: width - right, y1: height - bottom, y2: height - bottom, stroke: 'var(--axis)' });

        if (fit) {
            const line = [];
            const from = xs[0];
            const to = xs[xs.length - 1];
            for (let i = 0; i <= 40; i++) {
                const v = from + ((to - from) * i) / 40;
                const value = (fit.offset + fit.curve.ln(2 ** v)) / Math.LN10;
                if (value >= yMin - 0.5 && value <= yMax + 0.5) {
                    line.push(`${x(v).toFixed(1)},${y(value).toFixed(1)}`);
                }
            }
            make('polyline', { points: line.join(' '), fill: 'none', stroke: 'var(--java)', 'stroke-width': 2, 'stroke-linejoin': 'round' });
        }
        points.forEach((p, i) => {
            const dot = make('circle', { cx: x(xs[i]), cy: y(ys[i]), r: 4, fill: 'var(--js)', stroke: 'var(--surface)', 'stroke-width': 2 });
            const hit = make('circle', { cx: x(xs[i]), cy: y(ys[i]), r: 12, fill: 'transparent', tabindex: 0 });
            hit.addEventListener('pointermove', (event) => showTip(event.clientX, event.clientY, p));
            hit.addEventListener('pointerleave', hideTip);
            hit.addEventListener('focus', () => {
                const box = dot.getBoundingClientRect();
                showTip(box.left, box.top, p);
            });
            hit.addEventListener('blur', hideTip);
        });
        holder.append(svg);
    }

    function showTip(left, top, point) {
        const tip = $('tip');
        tip.replaceChildren(el('b', '', time(point.ms)), `n = ${format(point.n)}`);
        tip.hidden = false;
        tip.style.left = `${Math.min(left + 12, innerWidth - tip.offsetWidth - 8)}px`;
        tip.style.top = `${Math.max(8, top - tip.offsetHeight - 8)}px`;
    }

    function hideTip() {
        $('tip').hidden = true;
    }

    function stopMeasuring() {
        lab.run++;
        if (lab.worker) lab.worker.terminate();
        lab.worker = null;
        $('o-run').disabled = false;
        $('o-stop').disabled = true;
    }

    async function runMeasure() {
        stopMeasuring();
        const run = lab.run;
        const code = $('o-code').value;
        const kind = $('o-input').value;
        $('o-run').disabled = true;
        $('o-stop').disabled = false;
        $('o-measured').textContent = '…';
        $('o-detail').textContent = 'Timing it at growing sizes…';
        $('o-chart').textContent = '';
        $('o-table-wrap').hidden = true;

        const opened = await openWorker(code);
        if (run !== lab.run) return;
        if (opened.error) {
            $('o-measured').textContent = '–';
            $('o-detail').textContent = `This can only run JavaScript, and it couldn't run that code: ${opened.error}. The reading on the left works for any language.`;
            stopMeasuring();
            return;
        }

        const points = [];
        const started = performance.now();
        let worker = opened.worker;
        let n = kind === 'number' ? 2 : 16;
        let stopped = '';
        const measure = async (size) => {
            const reply = await askWorker(worker, { n: size, kind });
            if (run !== lab.run) return 'cancelled';
            if (reply.type === 'timeout') return 'timeout';
            if (reply.type === 'error') {
                stopped = `It threw an error at n = ${format(size)}: ${reply.message}`;
                return 'error';
            }
            points.push({ n: size, ms: reply.ms });
            showMeasurements(points, '');
            return 'ok';
        };

        let outcome = 'ok';
        while (outcome === 'ok' && n <= 1 << 22 && performance.now() - started < TOTAL_LIMIT_MS) {
            outcome = await measure(n);
            const last = points[points.length - 1];
            if (last && last.ms > 300) break;
            n *= 2;
        }
        if (outcome === 'cancelled') return;
        if (outcome === 'timeout') {
            // A doubling that takes forever is the sign of exponential growth, so walk
            // up in small steps from the last size that finished.
            worker.terminate();
            const reopened = await openWorker(code);
            if (run !== lab.run) return;
            worker = reopened.worker;
            const base = points.length ? points[points.length - 1].n : 2;
            const stride = Math.max(1, Math.ceil(base / 8));
            for (let k = 1; k <= 8 && worker && outcome !== 'stop'; k++) {
                const reply = await measure(base + k * stride);
                if (reply === 'cancelled') return;
                if (reply !== 'ok' || points[points.length - 1].ms > 800) outcome = 'stop';
            }
            stopped = 'It stopped being practical to wait for larger sizes.';
        }
        if (points.length < 3) stopped = stopped || 'It finished too few sizes to fit a curve.';
        showMeasurements(points, stopped);
        if (points.length < 3 && !BigO.fit(points)) {
            $('o-measured').textContent = '–';
            $('o-detail').textContent = stopped;
        }
        stopMeasuring();
    }

    function loadExample(index) {
        const example = EXAMPLES[index];
        $('o-code').value = example.code;
        $('o-input').value = example.input;
        readCode();
    }

    /* ------------------------------------------------------------------ Start */

    async function start() {
        catalog = await fetch('catalog.json').then((r) => r.json());
        readColours();

        fillAlgorithms($('w-algorithm'));
        fillInputs($('w-input'));
        $('w-algorithm').value = 'quickHoare';

        const allOption = new Option(`All ${catalog.length} algorithms`, 'all');
        $('r-algorithm').append(allOption);
        fillAlgorithms($('r-algorithm'));
        fillInputs($('r-input'));
        [1000, 10000, 100000, 1000000].forEach((n) => $('r-size').append(new Option(format(n), n)));
        $('r-size').value = '10000';

        buildTable();
        EXAMPLES.forEach((example, i) => $('o-example').append(new Option(example.name, i)));
        loadExample(0);

        $('w-algorithm').addEventListener('change', () => restart(true));
        $('w-size').addEventListener('change', () => restart(true));
        $('w-input').addEventListener('change', () => restart(true));
        $('w-new').addEventListener('click', () => restart(true));
        $('w-play').addEventListener('click', () => (watch.playing ? pause() : play()));
        $('w-code').addEventListener('toggle', showSource);
        $('tab-java').addEventListener('click', () => chooseLanguage('java'));
        $('tab-js').addEventListener('click', () => chooseLanguage('js'));
        $('r-run').addEventListener('click', startRace);
        $('r-stop').addEventListener('click', stopRace);
        $('o-example').addEventListener('change', (event) => loadExample(+event.target.value));
        $('o-code').addEventListener('input', readCode);
        $('o-run').addEventListener('click', runMeasure);
        $('o-stop').addEventListener('click', () => {
            stopMeasuring();
            $('o-detail').textContent = 'Stopped.';
            if ($('o-measured').textContent === '…') $('o-measured').textContent = '–';
        });

        window.addEventListener('resize', drawWatch);
        matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            readColours();
            drawWatch();
        });

        loadWatch();
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) pause();
        else play();
    }

    start();
})();
