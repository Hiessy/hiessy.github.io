# Sorting Lab

59 sorting algorithms, written once in Java, running in the browser two ways. Lives at
<https://hiessy.github.io/sort/>.

- **Watch** animates any algorithm on any input.
- **Race** runs the same numbers through JavaScript and through Java compiled to
  WebAssembly, and checks that both give the right answer.
- **Algorithms** lists every one with its complexity.
- **Big O** explains how the O of a function is worked out, and estimates it for code
  you paste in.

## How it fits together

```
sort/catalog.json          names, complexity, descriptions and size limits
sort/java/.../*.java       the sorts, by family
        │
        │  tools/sorting/build.py
        ├─ Dispatch.java   a switch from catalog position to sort
        ├─ js/algorithms.js the same code translated to JavaScript
        ├─ js/sources.json  the code of each sort, for the page's code panel
        │
        │  TeaVM, through Maven
        └─ wasm/sort.wasm   the Java as WebAssembly, loaded by sort.wasm-runtime.js

js/page.js                 the page
js/race-worker.js          runs the race on a background thread
js/measure-worker.js       times pasted functions on a background thread
js/big-o.js                reads code and fits curves to timings
```

The JavaScript is generated, so the race compares two runtimes running the same logic.
Don't edit `algorithms.js`, `sources.json` or `Dispatch.java` by hand.

## Building

Needs Java 17 and Maven. The first build downloads TeaVM from Maven Central.

```bash
python tools/sorting/build.py --wasm
python tools/sorting/check.py
node tools/sorting/check-big-o.js
```

`check.py` runs every algorithm on 31 sizes and 8 input shapes in real Java and in Node,
checks each result against the language's built-in sort, and compares the two languages
line by line. `check-big-o.js` checks the code reader against answers worked out by hand.

The page needs a server, because browsers won't load workers or WebAssembly from a file:

```bash
python -m http.server 8123
```

Then open <http://localhost:8123/sort/>.

## Adding an algorithm

1. Write it as a `static void name(int[] a)` method in the family's Java file.
2. Add it to `catalog.json`. `raceMax` is the largest size it can race at.
3. Run the commands above.

The translator only understands a plain subset of Java: `int`, `double` and `boolean`,
arrays of those, and static methods with unique names. Declarations start a line, integer
division goes through `Util.div`, and `long` is out because JavaScript has no equivalent.
The values are non-negative and below 2³⁰.

## What the race shows

On Chromium, Java compiled to WebAssembly won all 54 algorithms that ran at 10,000 random
items, usually by 1.3× to 3×. That's real: bubble sort written directly in JavaScript took
the same time as the generated version, about twice as long as WebAssembly. Tight integer
loops suit WebAssembly, but it isn't universal: Lomuto quicksort on 100,000 sorted items,
its worst case, went to JavaScript at 8.9 s against 10.3 s. Other browsers may differ.
