// The JavaScript half of check.py. Prints the same lines as Check.java.
const fs = require('fs');
const path = require('path');

const sort = path.join(__dirname, '..', '..', 'sort');
const Sorts = require(path.join(sort, 'js', 'algorithms.js'));
const catalog = JSON.parse(fs.readFileSync(path.join(sort, 'catalog.json'), 'utf8'));

const SIZES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 15, 16, 17, 31, 32, 33, 40, 63, 64, 65,
    127, 128, 129, 255, 256, 257, 500, 1000, 1024, 1500, 2000];

const lines = [];
let failures = 0;
for (const entry of catalog) {
    for (const n of SIZES) {
        if (n > Math.min(entry.raceMax, 2000)) {
            continue;
        }
        for (let pattern = 0; pattern < 8; pattern++) {
            for (let seed = 1; seed <= 2; seed++) {
                const a = Sorts.generate(n, pattern, seed);
                const expected = a.slice().sort();
                Sorts.sorts[entry.id](a);
                const ok = Sorts.checksum(a) === Sorts.checksum(expected);
                if (!ok) {
                    failures++;
                }
                lines.push(`${entry.id} ${n} ${pattern} ${seed} ${Sorts.checksum(a)}${ok ? '' : ' WRONG'}`);
            }
        }
    }
}
process.stdout.write(lines.join('\n') + '\n');
if (failures > 0) {
    process.stderr.write(`${failures} wrong results\n`);
    process.exitCode = 1;
}
