/* Two ways of estimating the O of a function, as the page explains.

   read(code) looks at the shape of the code, in most languages: loops multiply,
   sequences add, recursion becomes a recurrence.
   fit(points) takes measured times and finds the curve they follow.

   Both are estimates on purpose. No program can get this right for every
   function, because that would solve the halting problem. */
const BigO = (function () {
    'use strict';

    /* A cost is n^power × (log n)^logs, or base^n, or n!. */
    const ONE = { power: 0, logs: 0, base: 0, factorial: false };
    const cost = (power, logs) => ({ power, logs: logs || 0, base: 0, factorial: false });
    const N = cost(1);
    const LOG = cost(0, 1);
    const SQRT = cost(0.5);
    const EXPONENTIAL = (base) => ({ power: 0, logs: 0, base, factorial: false });
    const FACTORIAL = { power: 0, logs: 0, base: 0, factorial: true };

    function compare(x, y) {
        return (x.factorial - y.factorial) || (x.base - y.base) || (x.power - y.power) || (x.logs - y.logs);
    }

    function add(x, y) {
        return compare(x, y) >= 0 ? x : y;
    }

    function multiply(x, y) {
        if (x.factorial || y.factorial) return FACTORIAL;
        if (x.base || y.base) return EXPONENTIAL(Math.max(x.base, y.base));
        return cost(x.power + y.power, x.logs + y.logs);
    }

    const SUPERSCRIPT = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶' };

    function show(c) {
        if (c.factorial) return 'n!';
        if (c.base) return `${c.base}ⁿ`;
        const parts = [];
        const p = Math.round(c.power * 100) / 100;
        if (p === 0.5) parts.push('√n');
        else if (p === 1) parts.push('n');
        else if (p === 1.5) parts.push('n√n');
        else if (SUPERSCRIPT[p]) parts.push(`n${SUPERSCRIPT[p]}`);
        else if (p > 0) parts.push(`n^${p}`);
        if (c.logs === 1) parts.push('log n');
        else if (c.logs > 1) parts.push(`log${SUPERSCRIPT[c.logs] || `^${c.logs}`} n`);
        return parts.join(' ') || '1';
    }

    /* Removes comments and the contents of strings, keeping every line number. */
    function strip(code) {
        const pythonish = /^\s*def\s+\w+|^\s*(?:for|while|if)\b.*:\s*$/m.test(code);
        const luaish = /\bend\s*$/m.test(code) && !/[{}]/.test(code);
        let out = '';
        let i = 0;
        while (i < code.length) {
            const c = code[i];
            const next = code[i + 1];
            const lineStart = out.lastIndexOf('\n') + 1;
            const atLineStart = !out.slice(lineStart).trim();
            if ((c === '/' && next === '/' && !pythonish) || (c === '#' && (pythonish || atLineStart))
                    || (luaish && c === '-' && next === '-')) {
                while (i < code.length && code[i] !== '\n') i++;
            } else if (c === '/' && next === '*') {
                const end = code.indexOf('*/', i + 2);
                const stop = end < 0 ? code.length : end + 2;
                out += code.slice(i, stop).replace(/[^\n]/g, '');
                i = stop;
            } else if (code.startsWith('"""', i) || code.startsWith("'''", i)) {
                const end = code.indexOf(code.slice(i, i + 3), i + 3);
                const stop = end < 0 ? code.length : end + 3;
                out += `""${code.slice(i, stop).replace(/[^\n]/g, '')}`;
                i = stop;
            } else if (c === '"' || c === '`' || c === "'") {
                let j = i + 1;
                while (j < code.length && code[j] !== c && (c === '`' || code[j] !== '\n')) {
                    j += code[j] === '\\' ? 2 : 1;
                }
                if (code[j] === c) {
                    out += `""${code.slice(i, j + 1).replace(/[^\n]/g, '')}`;
                    i = j + 1;
                } else {
                    out += c;
                    i++;
                }
            } else {
                out += c;
                i++;
            }
        }
        return out;
    }

    /* Splits braced code into statements, each with its nesting depth. */
    function bracedLines(text) {
        const lines = [];
        const saved = [];
        let buffer = '';
        let depth = 0;
        let parens = 0;
        let line = 1;
        let start = 1;
        const flush = (opens) => {
            const trimmed = buffer.trim();
            if (trimmed || opens) lines.push({ text: trimmed, depth, line: start, opens: !!opens });
            buffer = '';
        };
        for (const c of text) {
            if (c === '\n') {
                line++;
                if (parens === 0) flush();
                else buffer += ' ';
                continue;
            }
            if (c === '{') {
                flush(true);
                depth++;
                saved.push(parens);
                parens = 0;
                continue;
            }
            if (c === '}') {
                flush();
                depth = Math.max(0, depth - 1);
                parens = saved.pop() || 0;
                continue;
            }
            // Go has `for i := 0; i < n; i++` without parentheses.
            if (c === ';' && parens === 0 && !/^\s*for\b/.test(buffer)) {
                flush();
                continue;
            }
            if (c === '(' || c === '[') parens++;
            if (c === ')' || c === ']') parens = Math.max(0, parens - 1);
            if (!buffer.trim()) start = line;
            buffer += c;
        }
        flush();
        // With the brace on its own line, the block belongs to the line above.
        const kept = [];
        for (const l of lines) {
            const previous = kept[kept.length - 1];
            if (!l.text && l.opens && previous && !previous.opens && previous.depth === l.depth) {
                previous.opens = true;
            } else if (l.text) {
                kept.push(l);
            }
        }
        return kept;
    }

    /* The same for code that nests by indentation: Python, Ruby, Lua. */
    function indentedLines(text) {
        const lines = [];
        const widths = [0];
        text.split('\n').forEach((raw, index) => {
            const body = raw.trim();
            if (!body || /^(end|end\)|\}|fi|done)\b;?$/.test(body)) return;
            const width = raw.length - raw.trimStart().length;
            while (width < widths[widths.length - 1]) widths.pop();
            if (width > widths[widths.length - 1]) widths.push(width);
            lines.push({ text: body.replace(/:$/, ''), depth: widths.length - 1, line: index + 1, opens: false });
        });
        return lines;
    }

    const LOOP = /^(?:\w+:\s*)?(for|foreach|for_each|while|until|loop|repeat|do)\b/;
    const COLLECTION_LOOP = /\.(forEach|each|map|filter|reduce|flatMap|each_with_index|times|every|some|find|flat_map|collect|select)\b/;
    const BRANCH = /^(?:\}?\s*)(if|else|elif|elsif|elseif|switch|case|when|match|unless|default)\b/;
    const KEYWORDS = /^(if|else|for|foreach|while|until|do|switch|case|catch|return|try|new|throw|when|unless|loop|match|elif|elsif)$/;
    const FUNCTIONS = [
        /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\*?\s+(\w+)\s*\(([^)]*)\)/,
        /^(?:local\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
        /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:function\b[^(]*)?\(([^)]*)\)/,
        /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(\w+)\s*=>/,
        /^def\s+(?:self\.)?(\w+[?!]?)\s*(?:\(([^)]*)\))?/,
        /^(?:pub\s+)?(?:async\s+)?(?:fn|func|fun)\s+(?:\([^)]*\)\s*)?(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)/,
        /^(?:[\w<>[\],:*&?]+\s+)+\*?(\w+)\s*\(([^)]*)\)\s*(?:const\s*)?(?:throws\s+[\w, .]+)?$/,
        /^(\w+)\s*\(([^)]*)\)$/,
    ];

    function kindOf(text) {
        if (LOOP.test(text)) return 'loop';
        if (BRANCH.test(text)) return 'branch';
        return 'statement';
    }

    function functionName(text) {
        if (LOOP.test(text) || BRANCH.test(text) || /^return\b/.test(text)) return null;
        for (const pattern of FUNCTIONS) {
            const m = text.match(pattern);
            if (m && !KEYWORDS.test(m[1])) return m[1];
        }
        return null;
    }

    /* Where a one-line body starts: after `for (...)`, or after `for x in y:`. */
    function inlineBody(text) {
        const open = text.indexOf('(');
        if (open >= 0 && /^\W*\w+\s*$/.test(text.slice(0, open))) {
            let depth = 0;
            for (let i = open; i < text.length; i++) {
                if (text[i] === '(') depth++;
                if (text[i] === ')' && --depth === 0) {
                    const rest = text.slice(i + 1).trim();
                    return rest ? [text.slice(0, i + 1), rest] : null;
                }
            }
        }
        return null;
    }

    function parseStatement(lines, i) {
        const line = lines[i];
        const node = { text: line.text, line: line.line, kind: kindOf(line.text), children: [] };
        let next = i + 1;
        const nested = next < lines.length && lines[next].depth > line.depth;
        const name = line.opens || nested ? functionName(line.text) : null;
        if (name) Object.assign(node, { kind: 'function', name });
        if ((line.opens || nested) && node.kind === 'statement' && COLLECTION_LOOP.test(line.text)) node.kind = 'loop';
        if (nested) {
            [node.children, next] = parseBlock(lines, next, line.depth + 1);
        } else if (node.kind === 'loop' || node.kind === 'branch') {
            const split = inlineBody(line.text);
            if (split && !/^do$/.test(line.text)) {
                node.text = split[0];
                node.children = [{ text: split[1], line: line.line, kind: kindOf(split[1]), children: [] }];
            } else if (!line.opens && /[)]$/.test(line.text) && next < lines.length
                    && lines[next].depth === line.depth && !/^[{}]/.test(lines[next].text)) {
                let child;
                [child, next] = parseStatement(lines, next);
                node.children = [child];
            }
        }
        return [node, next];
    }

    function parseBlock(lines, start, depth) {
        const nodes = [];
        let i = start;
        while (i < lines.length && lines[i].depth >= depth) {
            const previous = nodes[nodes.length - 1];
            if (previous && previous.text === 'do' && /^while\b/.test(lines[i].text)) {
                previous.text = lines[i].text;
                i++;
                continue;
            }
            let node;
            [node, i] = parseStatement(lines, i);
            nodes.push(node);
        }
        return [nodes, i];
    }

    function allText(nodes) {
        return nodes.map((n) => `${n.text}\n${allText(n.children)}`).join('\n');
    }

    const TYPE_WORDS = /^(let|var|const|auto|int|long|short|size_t|usize|unsigned|signed|uint|int32_t|int64_t|float|double)$/;
    const LINEAR_CALLS = /\.(indexOf|lastIndexOf|includes|contains|slice|concat|join|reverse|split|copy|clone|fill|substring|toArray|map|filter|reduce|forEach|find|some|every|flatMap)\(|\b(sum|min|max|len_of|list|sum_of|memcpy|memset|strlen|Arrays\.fill)\(|\.(pop|remove|insert)\(0|\.shift\(\)/;
    const SORT_CALLS = /\.sort\(|\bsorted\(|\bArrays\.sort\(|\bCollections\.sort\(|\bsort\.\w+\(|\bqsort\(|\bstd::sort\(|\bsort\(/;
    const GUESSED_LINEAR = /\b(merge|partition|combine|heapify)\s*\(/;

    /* How many times a loop runs, and why. Returns [cost, reason]. */
    function loopGrowth(node, scope) {
        const header = node.text;
        if (COLLECTION_LOOP.test(header) && !LOOP.test(header)) {
            return [N, 'the loop runs once per item, so n times'];
        }
        const three = header.replace(/^(?:\w+:\s*)?for\s*\(?/, '').replace(/\)\s*$/, '').split(';');
        if (/^(?:\w+:\s*)?for\b/.test(header) && three.length === 3) {
            return countedLoop(three, scope);
        }
        if (/^(?:\w+:\s*)?(for|foreach|for_each)\b/.test(header)) {
            return collectionLoop(header, scope);
        }
        return conditionLoop(node, scope);
    }

    function identifiers(text) {
        return (text.match(/[A-Za-z_]\w*/g) || []).filter((w) => !/^(true|false|None|null|nil|len|int|size|length|Math|math|abs)$/.test(w));
    }

    function countedLoop([init, condition, step], scope) {
        const variable = (init.match(/(\w+)\s*:?=/) || [])[1] || '';
        const v = variable.replace(/\W/g, '') || 'i';
        const geometric = new RegExp(`\\b${v}\\s*(\\*=|/=|//=|<<=|>>=|>>>=)|\\b${v}\\s*=\\s*${v}\\s*(\\*|/|<<|>>)|\\b${v}\\s*\\+=\\s*${v}\\b`);
        if (geometric.test(step)) {
            return [LOG, `${v} is multiplied or divided each time, so the loop runs about log n times`];
        }
        if (new RegExp(`\\b${v}\\s*\\*\\s*${v}\\b`).test(condition) || /\bsqrt\b/.test(condition)) {
            return [SQRT, `${v} stops at the square root of n, so the loop runs √n times`];
        }
        // A countdown has its size in the start value, not in the stop condition.
        const others = identifiers(`${init} ${condition}`).filter((w) => w !== v && !TYPE_WORDS.test(w));
        if (others.length === 0) {
            return [ONE, 'the loop runs a fixed number of times, so it doesn\'t grow with n'];
        }
        return [N, others.some((w) => scope.outer.includes(w))
            ? `${v} depends on an outer loop, which adds up to about n²/2 in total: still a factor of n`
            : 'the loop runs once per item, so n times'];
    }

    function collectionLoop(header, scope) {
        const range = header.match(/\brange\((.*)\)/);
        if (range) {
            const words = identifiers(range[1]);
            if (/\bsqrt\b/.test(range[1])) return [SQRT, 'the loop stops at the square root of n, so it runs √n times'];
            if (words.length === 0) return [ONE, 'the loop runs a fixed number of times, so it doesn\'t grow with n'];
            return [N, 'the loop runs once per item, so n times'];
        }
        const span = header.match(/\bin\s+\(?(\w+)\.\.=?\.?(\w+)\)?/);
        if (span) {
            return /^\d+$/.test(span[1]) && /^\d+$/.test(span[2])
                ? [ONE, 'the loop runs a fixed number of times, so it doesn\'t grow with n']
                : [N, 'the loop runs once per item, so n times'];
        }
        if (/\b(children|neighbors|neighbours|adj|edges)\b/.test(header)) {
            scope.visitsEach = true;
        }
        return [N, 'the loop runs once per item, so n times'];
    }

    function conditionLoop(node, scope) {
        const condition = node.text.replace(/^(?:\w+:\s*)?(while|until|for|loop|repeat)\b/, '').replace(/^\s*\(|\)\s*$/g, '').trim();
        const body = allText(node.children);
        const variables = identifiers(condition);
        if (/\b(mid|middle|m)\b\s*:?=.*(\/\s*2|\/\/\s*2|>>>?\s*1)/.test(body)
                && /\b\w+\s*:?=\s*\(?\s*(mid|middle|m)\b/.test(body)) {
            return [LOG, 'the search range halves each time, so the loop runs about log n times'];
        }
        for (const v of variables) {
            const op = new RegExp(`\\b${v}\\s*(\\*=|/=|//=|<<=|>>=|>>>=|%=)|\\b${v}\\s*:?=\\s*(?:\\w+\\.\\w+\\()?\\(?\\s*${v}\\s*(\\*|/|//|<<|>>)`);
            if (op.test(body)) {
                return [LOG, `${v} is multiplied or divided each time, so the loop runs about log n times`];
            }
            if (new RegExp(`\\b${v}\\s*\\*\\s*${v}\\b`).test(condition)) {
                return [SQRT, `${v} stops at the square root of n, so the loop runs √n times`];
            }
        }
        if (variables.length === 0 || /^(true|1)$/.test(condition)) {
            return [N, 'the loop has no visible limit, so this assumes n times, which is a guess'];
        }
        for (const v of variables) {
            const step = new RegExp(`\\b${v}\\s*(\\+\\+|--|\\+=|-=)|(\\+\\+|--)\\s*${v}\\b|\\b${v}\\s*:?=\\s*${v}\\s*[-+]|\\b${v}\\s*=\\s*${v}(\\.|->)\\w+`);
            if (step.test(body)) return [N, `${v} moves a fixed step at a time, so the loop runs n times`];
        }
        if (/\.(pop|shift|dequeue|poll|popleft|remove)\(/.test(body)) {
            return [N, 'the loop takes one item off each time, so it runs n times'];
        }
        return [N, 'nothing shows how fast the loop ends, so this assumes n times, which is a guess'];
    }

    /* Finds the arguments of each call to `name` in a line. */
    function callArguments(text, name) {
        const found = [];
        const pattern = new RegExp(`(?<![\\w.])${name}\\s*\\(`, 'g');
        let m;
        while ((m = pattern.exec(text))) {
            let depth = 1;
            let i = m.index + m[0].length;
            const start = i;
            while (i < text.length && depth > 0) {
                if (text[i] === '(') depth++;
                if (text[i] === ')') depth--;
                i++;
            }
            found.push(text.slice(start, i - 1));
        }
        return found;
    }

    /* Counts the recursive calls on one path through the function. */
    function selfCalls(nodes, name, inLoop) {
        const calls = [];
        let longestReturned = [];
        let i = 0;
        while (i < nodes.length) {
            const node = nodes[i];
            if (node.kind !== 'branch') {
                calls.push(...callsInNode(node, name, inLoop));
                i++;
                continue;
            }
            // One arm of an if/else runs, so only the busiest arm counts. An arm that
            // returns ends the function, so it's an alternative to everything after it.
            let busiest = [];
            do {
                const path = callsInNode(nodes[i], name, inLoop);
                if (/\breturn\b/.test(`${nodes[i].text}\n${allText(nodes[i].children)}`)) {
                    const whole = calls.concat(path);
                    if (whole.length > longestReturned.length) longestReturned = whole;
                } else if (path.length > busiest.length) {
                    busiest = path;
                }
                i++;
            } while (i < nodes.length && /^\}?\s*(else|elif|elsif|elseif|case|when|default)\b/.test(nodes[i].text));
            calls.push(...busiest);
        }
        return calls.length >= longestReturned.length ? calls : longestReturned;
    }

    function callsInNode(node, name, inLoop) {
        const insideLoop = inLoop || node.kind === 'loop';
        let found = callArguments(node.text, name).map((args) => ({ args, inLoop: insideLoop, line: node.line, text: node.text }));
        if (/\?.*:/.test(node.text) && found.length === 2) found = found.slice(0, 1);
        return found.concat(selfCalls(node.children, name, insideLoop));
    }

    /* How much smaller the input is on a recursive call. */
    function shrinkOf(call, halves) {
        const { args } = call;
        const divided = args.match(/\/\/?\s*(\d+)|>>>?\s*(\d+)/);
        if (divided) return { divide: divided[1] ? +divided[1] : 2 ** +divided[2] };
        if (identifiers(args).some((w) => halves.has(w)) || /:\s*\w*\s*(mid|half)|\b(mid|half)\w*\s*:/.test(args)) return { divide: 2 };
        if (/(\.|->)(left|right|lchild|rchild|children)\b|\b(left|right|child)\b/.test(args)) return { tree: true };
        return { subtract: true, guessed: !/[-+]\s*\d|\[\s*1\s*:|\.slice\(1\)|(\.|->)next\b|\brest\b|\btail\b/.test(args) };
    }

    function solveRecurrence(fn, calls, work, scope) {
        const { steps } = scope;
        const text = allText(fn.body);
        const lines = (call) => `Line ${call.line}`;
        if (calls.some((c) => c.inLoop) && !fn.visitsEach) {
            steps.push(`${lines(calls[0])}: it calls itself inside a loop, so every level multiplies the work by n, giving n!.`);
            return FACTORIAL;
        }
        const halves = new Set();
        for (const m of text.matchAll(/(\w+)\s*:?=\s*[^\n]*?(?:\/\/?\s*2\b|>>>?\s*1\b)/g)) halves.add(m[1]);
        for (const m of text.matchAll(/(\w+)\s*:?=\s*[^\n]*/g)) {
            if (identifiers(m[0].split(/:?=/).slice(1).join('=')).some((w) => halves.has(w))) halves.add(m[1]);
        }
        const shrinks = calls.map((c) => shrinkOf(c, halves));
        const a = calls.length;
        if (/\b(memo|cache|dp|lru_cache|memoize|cached)\b/i.test(scope.code)) {
            steps.push(`It remembers past results, so each n is solved once: n × ${show(work)}.`);
            return multiply(N, work);
        }
        if (fn.visitsEach || shrinks.every((s) => s.tree)) {
            steps.push(`Lines ${calls.map((c) => c.line).join(', ')}: it recurses over a tree or graph, reaching each node once, so n × ${show(work)}.`);
            return multiply(N, work);
        }
        if (shrinks.every((s) => s.divide)) {
            const b = Math.max(...shrinks.map((s) => s.divide));
            const critical = Math.round((Math.log(a) / Math.log(b)) * 100) / 100;
            const equation = `T(n) = ${a === 1 ? '' : a}T(n/${b}) + ${show(work)}`;
            steps.push(`${lines(calls[0])}: ${a === 1 ? 'one recursive call' : `${a} recursive calls`} on 1/${b} of the input, so ${equation}.`);
            let result;
            if (critical > work.power) result = cost(critical);
            else if (critical === work.power) result = cost(work.power, work.logs + 1);
            else result = work;
            steps.push(`Master theorem: log${b === 2 ? '₂' : `_${b}`} ${a} = ${critical}, ${critical > work.power ? 'more than' : critical === work.power ? 'the same as' : 'less than'} the ${show(work)} of extra work, so ${show(result)}.`);
            return result;
        }
        const guessed = shrinks.some((s) => s.guessed);
        if (a === 1) {
            steps.push(`${lines(calls[0])}: one recursive call that shrinks the input by a step${guessed ? ' (a guess)' : ''}, so n levels × ${show(work)}.`);
            return multiply(N, work);
        }
        steps.push(`${lines(calls[0])}: ${a} recursive calls that each shrink the input by a step, so every level multiplies the calls by ${a}: ${a}ⁿ.`);
        return EXPONENTIAL(a);
    }

    function statementCost(node, scope) {
        let total = ONE;
        const text = node.text;
        for (const [name, fn] of scope.functions) {
            if (name !== scope.current && callArguments(text, name).length) {
                const called = functionCost(fn, scope);
                scope.steps.push(`Line ${node.line}: calls ${name}, which costs ${show(called)}.`);
                total = add(total, called);
            }
        }
        const known = (n) => scope.functions.has(n);
        if (SORT_CALLS.test(text) && !known('sort')) {
            scope.steps.push(`Line ${node.line}: a built-in sort costs n log n.`);
            total = add(total, cost(1, 1));
        } else if (LINEAR_CALLS.test(text)) {
            scope.steps.push(`Line ${node.line}: that built-in call walks the whole collection, so n.`);
            total = add(total, N);
        } else {
            const guess = text.match(GUESSED_LINEAR);
            if (guess && !known(guess[1])) {
                scope.steps.push(`Line ${node.line}: ${guess[1]}() isn't shown, so this assumes the usual n.`);
                total = add(total, N);
            }
        }
        return total;
    }

    function blockCost(nodes, scope) {
        let total = ONE;
        for (const node of nodes) {
            let here;
            if (node.kind === 'function') {
                continue;
            } else if (node.kind === 'loop') {
                const [growth, reason] = loopGrowth(node, scope);
                scope.steps.push(`Line ${node.line}: ${reason}.`);
                const variable = (node.text.match(/\bfor\s+(\w+)\s+in\b|(\w+)\s*:?=/) || []).slice(1).find(Boolean);
                if (variable) scope.outer.push(variable);
                const inner = blockCost(node.children, scope);
                if (variable) scope.outer.pop();
                const header = COLLECTION_LOOP.test(node.text) ? ONE : statementCost(node, scope);
                here = multiply(growth, add(inner, header));
                if (compare(inner, ONE) > 0 && compare(growth, ONE) > 0) {
                    scope.steps.push(`Line ${node.line}: nested, so multiply: ${show(growth)} × ${show(inner)} = ${show(here)}.`);
                }
            } else {
                here = add(blockCost(node.children, scope), statementCost(node, scope));
            }
            total = add(total, here);
        }
        return total;
    }

    function functionCost(fn, scope) {
        if (fn.result) return fn.result;
        if (fn.busy) return ONE;
        fn.busy = true;
        const outerCurrent = scope.current;
        scope.current = fn.name;
        const work = blockCost(fn.body, scope);
        fn.visitsEach = scope.visitsEach;
        scope.visitsEach = false;
        const calls = selfCalls(fn.body, fn.name, false);
        const result = calls.length ? solveRecurrence(fn, calls, work, scope) : work;
        scope.current = outerCurrent;
        fn.busy = false;
        fn.result = result;
        return result;
    }

    function findFunctions(nodes, found) {
        for (const node of nodes) {
            if (node.kind === 'function') {
                found.set(node.name, { name: node.name, body: node.children });
            }
            findFunctions(node.children, found);
        }
        return found;
    }

    function read(code) {
        const text = strip(code);
        if (!text.trim()) return null;
        const braced = /[{}]/.test(text) && !/^\s*def\s/m.test(text) && !/^\s*(for|while|if)\b.*:\s*$/m.test(text);
        const lines = braced ? bracedLines(text) : indentedLines(text);
        const [tree] = parseBlock(lines, 0, 0);
        const functions = findFunctions(tree, new Map());
        const scope = { code: text, functions, steps: [], outer: [], current: '', visitsEach: false };

        let result;
        let entry = null;
        if (functions.size) {
            const called = new Set();
            for (const fn of functions.values()) {
                for (const other of functions.keys()) {
                    if (other !== fn.name && callArguments(allText(fn.body), other).length) called.add(other);
                }
            }
            const roots = [...functions.values()].filter((fn) => !called.has(fn.name));
            entry = roots[roots.length - 1] || [...functions.values()].pop();
            result = functionCost(entry, scope);
        } else {
            result = blockCost(tree, scope);
        }
        return { label: `O(${show(result)})`, entry: entry && entry.name, steps: [...new Set(scope.steps)] };
    }

    /* The curves the measurements are compared against, as ln g(n). */
    const CURVES = [
        { label: 'O(1)', ln: () => 0 },
        { label: 'O(log n)', ln: (n) => Math.log(Math.log(n)) },
        { label: 'O(√n)', ln: (n) => 0.5 * Math.log(n) },
        { label: 'O(n)', ln: (n) => Math.log(n) },
        { label: 'O(n log n)', ln: (n) => Math.log(n) + Math.log(Math.log(n)) },
        { label: 'O(n²)', ln: (n) => 2 * Math.log(n) },
        { label: 'O(n² log n)', ln: (n) => 2 * Math.log(n) + Math.log(Math.log(n)) },
        { label: 'O(n³)', ln: (n) => 3 * Math.log(n) },
    ];

    /* Least squares on log time. points is [{ n, ms }], smallest first. */
    function fit(points) {
        const usable = points.filter((p) => p.ms > 0 && p.n > 2);
        if (usable.length < 3) return null;
        // Small sizes are mostly noise and start-up cost, so only the larger half counts.
        const used = usable.slice(-Math.max(4, Math.ceil(usable.length / 2)));
        const times = used.map((p) => Math.log(p.ms));
        const scored = CURVES.map((curve) => {
            const gaps = used.map((p, i) => times[i] - curve.ln(p.n));
            const offset = gaps.reduce((x, y) => x + y, 0) / gaps.length;
            const error = gaps.reduce((sum, gap) => sum + (gap - offset) ** 2, 0) / gaps.length;
            return { label: curve.label, error, offset, curve };
        });

        const slope = line(used.map((p) => Math.log(p.n)), times).slope;
        const exponential = line(used.map((p) => p.n), times);
        const base = Math.exp(exponential.slope);
        if (slope > 3.5) {
            const shown = Math.round(base * 100) / 100;
            const label = shown >= 1.05 ? `O(${shown}ⁿ)` : 'Faster than any power of n';
            return { label, slope, runnerUp: null, curve: { ln: (n) => n * exponential.slope }, offset: exponential.intercept, exponential: true };
        }
        scored.sort((x, y) => x.error - y.error);
        const [best, second] = scored;
        const close = second.error < best.error * 2 + 0.002;
        return { label: best.label, slope, runnerUp: close ? second.label : null, curve: best.curve, offset: best.offset };
    }

    function line(xs, ys) {
        const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
        const my = ys.reduce((a, b) => a + b, 0) / ys.length;
        let top = 0;
        let bottom = 0;
        xs.forEach((x, i) => {
            top += (x - mx) * (ys[i] - my);
            bottom += (x - mx) ** 2;
        });
        const slope = bottom ? top / bottom : 0;
        return { slope, intercept: my - slope * mx };
    }

    return { read, fit };
})();

if (typeof module !== 'undefined') {
    module.exports = BigO;
}
