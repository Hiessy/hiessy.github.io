// Checks the code reader and the curve fitter against answers worked out by hand.
//     node tools/sorting/check-big-o.js
const path = require('path');
const BigO = require(path.join(__dirname, '..', '..', 'sort', 'js', 'big-o.js'));

const cases = [
    ['constant, JS', 'O(1)', 'function first(a) { return a[0] + 1; }'],
    ['fixed loop, C', 'O(1)', 'int f(int n) { int s = 0; for (int i = 0; i < 10; i++) { s += i; } return s; }'],
    ['one loop, JS', 'O(n)', `function sum(a) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += a[i];
  }
  return s;
}`],
    ['one loop, Python', 'O(n)', `def total(items):
    s = 0
    for x in items:
        s += x
    return s
`],
    ['one loop, Go', 'O(n)', `func sum(a []int) int {
    s := 0
    for i := 0; i < len(a); i++ {
        s += a[i]
    }
    return s
}`],
    ['one loop, Rust', 'O(n)', `fn sum(v: &[i32]) -> i32 {
    let mut s = 0;
    for x in v.iter() {
        s += x;
    }
    s
}`],
    ['one loop, Ruby', 'O(n)', `def total(items)
  s = 0
  items.each do |x|
    s += x
  end
  s
end`],
    ['nested, Java', 'O(n²)', `static int pairs(int[] a) {
    int c = 0;
    for (int i = 0; i < a.length; i++) {
        for (int j = i + 1; j < a.length; j++) {
            if (a[i] > a[j]) c++;
        }
    }
    return c;
}`],
    ['countdown outer loop, JS', 'O(n²)', `function bubble(a) {
  for (let end = a.length - 1; end > 0; end--) {
    for (let i = 0; i < end; i++) {
      if (a[i] > a[i + 1]) {
        const t = a[i];
        a[i] = a[i + 1];
        a[i + 1] = t;
      }
    }
  }
}`],
    ['nested without braces, C', 'O(n²)', `int f(int n) {
    int c = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            c++;
    return c;
}`],
    ['triple, Python', 'O(n³)', `def t(n):
    c = 0
    for i in range(n):
        for j in range(n):
            for k in range(n):
                c += 1
    return c
`],
    ['halving for, C', 'O(log n)', 'int f(int n) { int c = 0; for (int i = n; i > 0; i /= 2) c++; return c; }'],
    ['doubling while, Python', 'O(log n)', `def f(n):
    i = 1
    while i < n:
        i *= 2
    return i
`],
    ['binary search, Python', 'O(log n)', `def find(a, x):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == x:
            return mid
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
`],
    ['binary search, recursive JS', 'O(log n)', `function find(a, x, lo, hi) {
  if (lo > hi) return -1;
  const mid = (lo + hi) >> 1;
  if (a[mid] === x) return mid;
  if (a[mid] < x) return find(a, x, mid + 1, hi);
  return find(a, x, lo, mid - 1);
}`],
    ['sqrt loop, JS', 'O(√n)', `function isPrime(n) {
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}`],
    ['n log n loops, Java', 'O(n log n)', `static int f(int n) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        for (int j = 1; j < n; j *= 2) {
            c++;
        }
    }
    return c;
}`],
    ['built-in sort, Python', 'O(n log n)', `def top(a):
    b = sorted(a)
    return b[0]
`],
    ['sort then loop, JS', 'O(n log n)', `function f(a) {
  a.sort((x, y) => x - y);
  let s = 0;
  for (const x of a) s += x;
  return s;
}`],
    ['merge sort, Python', 'O(n log n)', `def sort(a):
    if len(a) < 2:
        return a
    mid = len(a) // 2
    left = sort(a[:mid])
    right = sort(a[mid:])
    return merge(left, right)

def merge(x, y):
    out = []
    i = j = 0
    while i < len(x) and j < len(y):
        if x[i] <= y[j]:
            out.append(x[i])
            i += 1
        else:
            out.append(y[j])
            j += 1
    return out + x[i:] + y[j:]
`],
    ['merge sort, Java', 'O(n log n)', `static void sort(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int mid = (lo + hi) / 2;
    sort(a, lo, mid);
    sort(a, mid + 1, hi);
    merge(a, lo, mid, hi);
}`],
    ['factorial, JS', 'O(n)', `function fact(n) {
  if (n < 2) return 1;
  return n * fact(n - 1);
}`],
    ['fibonacci, Python', 'O(2ⁿ)', `def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
`],
    ['fibonacci memo, Python', 'O(n)', `def fib(n, memo):
    if n < 2:
        return n
    if n in memo:
        return memo[n]
    memo[n] = fib(n - 1, memo) + fib(n - 2, memo)
    return memo[n]
`],
    ['tree walk, JS', 'O(n)', `function count(node) {
  if (!node) return 0;
  return 1 + count(node.left) + count(node.right);
}`],
    ['permutations, Python', 'O(n!)', `def perms(items, k):
    if k == len(items):
        return
    for i in range(k, len(items)):
        items[k], items[i] = items[i], items[k]
        perms(items, k + 1)
        items[k], items[i] = items[i], items[k]
`],
    ['karatsuba shape, Java', 'O(n^1.58)', `static int mul(int[] x, int n) {
    if (n < 2) return 1;
    int a = mul(x, n / 2);
    int b = mul(x, n / 2);
    int c = mul(x, n / 2);
    for (int i = 0; i < n; i++) { a += x[i]; }
    return a + b + c;
}`],
    ['loop over a helper, JS', 'O(n²)', `function outer(a) {
  for (let i = 0; i < a.length; i++) helper(a);
}
function helper(a) {
  for (let i = 0; i < a.length; i++) a[i]++;
}`],
    ['snippet without a function, C', 'O(n²)', `for (int i = 0; i < n; i++) {
    for (int j = 0; j < i; j++) {
        total += j;
    }
}`],
    ['two loops in a row, JS', 'O(n)', `function f(a) {
  for (let i = 0; i < a.length; i++) a[i]++;
  for (let i = 0; i < a.length; i++) a[i]--;
}`],
    ['do while, Java', 'O(n)', `static int f(int n) {
    int i = 0;
    do {
        i++;
    } while (i < n);
    return i;
}`],
    ['linked list, C', 'O(n)', `int length(struct node *head) {
    int c = 0;
    while (head != NULL) {
        c++;
        head = head->next;
    }
    return c;
}`],
    ['arrow function, JS', 'O(n)', `const double = (a) => {
  return a.map((x) => x * 2);
};`],
    ['forEach with a nested loop, JS', 'O(n²)', `function f(a) {
  a.forEach((x) => {
    for (const y of a) console.log(x + y);
  });
}`],
    ['built-in sum, Python', 'O(n)', `def f(a):
    total = sum(a)
    return total
`],
    ['Kotlin loop', 'O(n)', `fun total(items: List<Int>): Int {
    var s = 0
    for (x in items) {
        s += x
    }
    return s
}`],
    ['Allman braces, C#', 'O(n²)', `int Count(int[] a)
{
    int c = 0;
    for (int i = 0; i < a.Length; i++)
    {
        foreach (var x in a)
        {
            c += x;
        }
    }
    return c;
}`],
    ['Rust range', 'O(n)', `fn f(n: usize) -> usize {
    let mut s = 0;
    for i in 0..n {
        s += i;
    }
    s
}`],
    ['comments and strings, JS', 'O(1)', `function f(a) {
  // for (let i = 0; i < a.length; i++) {}
  const s = "for (;;) { while (true) {} }";
  return s.length;
}`],
];

let failed = 0;
for (const [name, expected, code] of cases) {
    const result = BigO.read(code);
    const got = result ? result.label : 'nothing';
    if (got !== expected) {
        failed++;
        console.log(`FAIL ${name}: expected ${expected}, got ${got}`);
        if (result) result.steps.forEach((s) => console.log(`     ${s}`));
    }
}
console.log(`read: ${cases.length - failed} of ${cases.length} right`);

const curves = [
    ['O(1)', (n) => 5],
    ['O(log n)', (n) => 3 * Math.log(n)],
    ['O(n)', (n) => 2 * n],
    ['O(n log n)', (n) => n * Math.log2(n)],
    ['O(n²)', (n) => n * n],
    ['O(n³)', (n) => n * n * n],
];
let wrongFits = 0;
for (const [expected, f] of curves) {
    const points = [];
    for (let n = 16; n <= 1 << 16; n *= 2) {
        const noise = 1 + 0.02 * Math.sin(n);
        points.push({ n, ms: f(n) * noise });
    }
    const found = BigO.fit(points);
    if (found.label !== expected) {
        wrongFits++;
        console.log(`FAIL fit: expected ${expected}, got ${found.label}, slope ${found.slope.toFixed(2)}`);
    }
}
const exponential = BigO.fit([10, 12, 14, 16, 18, 20].map((n) => ({ n, ms: 1.618 ** n })));
if (!/^O\(1\.6\d*ⁿ\)$/.test(exponential.label)) {
    wrongFits++;
    console.log(`FAIL fit: expected about 1.62ⁿ, got ${exponential.label}`);
}
console.log(`fit: ${curves.length + 1 - wrongFits} of ${curves.length + 1} right`);
process.exitCode = failed || wrongFits ? 1 : 0;
