package com.hiessy.sort;

import static com.hiessy.sort.Insertion.binaryInsertRange;
import static com.hiessy.sort.Util.*;

/** Sorts that combine sorted runs into longer sorted runs. */
final class Merge {
    /** Merges the sorted a[lo..mid] and a[mid + 1..hi]. Only the left half needs copying. */
    static void merge(int[] a, int[] aux, int lo, int mid, int hi) {
        arraycopy(a, lo, aux, lo, mid - lo + 1);
        int i = lo;
        int j = mid + 1;
        int k = lo;
        while (i <= mid && j <= hi) {
            if (aux[i] <= a[j]) {
                a[k] = aux[i];
                i++;
            } else {
                a[k] = a[j];
                j++;
            }
            k++;
        }
        while (i <= mid) {
            a[k] = aux[i];
            i++;
            k++;
        }
    }

    static void mergeTopDown(int[] a) {
        topDown(a, new int[a.length], 0, a.length - 1);
    }

    private static void topDown(int[] a, int[] aux, int lo, int hi) {
        if (lo >= hi) {
            return;
        }
        int mid = (lo + hi) >>> 1;
        topDown(a, aux, lo, mid);
        topDown(a, aux, mid + 1, hi);
        merge(a, aux, lo, mid, hi);
    }

    static void mergeBottomUp(int[] a) {
        int n = a.length;
        int[] aux = new int[n];
        for (int width = 1; width < n; width *= 2) {
            for (int lo = 0; lo + width < n; lo += 2 * width) {
                merge(a, aux, lo, lo + width - 1, Math.min(lo + 2 * width - 1, n - 1));
            }
        }
    }

    static void mergeNatural(int[] a) {
        int n = a.length;
        int[] aux = new int[n];
        boolean merged = true;
        while (merged) {
            merged = false;
            int lo = 0;
            while (lo < n) {
                int mid = runEnd(a, lo);
                if (mid == n - 1) {
                    break;
                }
                int hi = runEnd(a, mid + 1);
                merge(a, aux, lo, mid, hi);
                merged = true;
                lo = hi + 1;
            }
        }
    }

    private static int runEnd(int[] a, int i) {
        while (i + 1 < a.length && a[i] <= a[i + 1]) {
            i++;
        }
        return i;
    }

    static void mergeInPlace(int[] a) {
        inPlaceRange(a, 0, a.length);
    }

    private static void inPlaceRange(int[] a, int lo, int hi) {
        if (hi - lo < 2) {
            return;
        }
        int mid = (lo + hi) >>> 1;
        inPlaceRange(a, lo, mid);
        inPlaceRange(a, mid, hi);
        inPlaceMerge(a, lo, mid, hi);
    }

    /** Splits both halves around a middle value, rotates, and merges the two smaller problems. */
    private static void inPlaceMerge(int[] a, int lo, int mid, int hi) {
        int left = mid - lo;
        int right = hi - mid;
        if (left == 0 || right == 0) {
            return;
        }
        if (left + right == 2) {
            if (a[mid] < a[lo]) {
                swap(a, lo, mid);
            }
            return;
        }
        int cutLeft;
        int cutRight;
        if (left > right) {
            cutLeft = lo + (left >> 1);
            cutRight = lowerBound(a, mid, hi, a[cutLeft]);
        } else {
            cutRight = mid + (right >> 1);
            cutLeft = upperBound(a, lo, mid, a[cutRight]);
        }
        reverse(a, cutLeft, mid - 1);
        reverse(a, mid, cutRight - 1);
        reverse(a, cutLeft, cutRight - 1);
        int newMid = cutLeft + cutRight - mid;
        inPlaceMerge(a, lo, cutLeft, newMid);
        inPlaceMerge(a, newMid, cutRight, hi);
    }

    private static int lowerBound(int[] a, int lo, int hi, int x) {
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (a[mid] < x) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        return lo;
    }

    private static int upperBound(int[] a, int lo, int hi, int x) {
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (a[mid] <= x) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        return lo;
    }

    /** Timsort without galloping: real runs, a real merge stack, Peters's balance rules. */
    static void timsort(int[] a) {
        int n = a.length;
        if (n < 2) {
            return;
        }
        int[] aux = new int[n];
        int[] base = new int[48];
        int[] size = new int[48];
        int stack = 0;
        int minRun = minRunFor(n);
        int lo = 0;
        while (lo < n) {
            int run = countRun(a, lo);
            if (run < minRun) {
                int forced = Math.min(minRun, n - lo);
                binaryInsertRange(a, lo, lo + forced, lo + run);
                run = forced;
            }
            base[stack] = lo;
            size[stack] = run;
            stack++;
            lo += run;
            stack = collapseRuns(a, aux, base, size, stack);
        }
        while (stack > 1) {
            int i = stack - 2;
            if (i > 0 && size[i - 1] < size[i + 1]) {
                i--;
            }
            mergeRuns(a, aux, base, size, i, stack);
            stack--;
        }
    }

    private static int minRunFor(int n) {
        int remainder = 0;
        while (n >= 32) {
            remainder |= n & 1;
            n >>= 1;
        }
        return n + remainder;
    }

    /** Length of the run starting at lo, reversing it first if it descends. */
    private static int countRun(int[] a, int lo) {
        int n = a.length;
        int hi = lo + 1;
        if (hi == n) {
            return 1;
        }
        if (a[hi] < a[lo]) {
            hi++;
            while (hi < n && a[hi] < a[hi - 1]) {
                hi++;
            }
            reverse(a, lo, hi - 1);
        } else {
            hi++;
            while (hi < n && a[hi] >= a[hi - 1]) {
                hi++;
            }
        }
        return hi - lo;
    }

    private static int collapseRuns(int[] a, int[] aux, int[] base, int[] size, int stack) {
        while (stack > 1) {
            int i = stack - 2;
            if ((i > 0 && size[i - 1] <= size[i] + size[i + 1])
                    || (i > 1 && size[i - 2] <= size[i - 1] + size[i])) {
                if (size[i - 1] < size[i + 1]) {
                    i--;
                }
            } else if (size[i] > size[i + 1]) {
                break;
            }
            mergeRuns(a, aux, base, size, i, stack);
            stack--;
        }
        return stack;
    }

    private static void mergeRuns(int[] a, int[] aux, int[] base, int[] size, int i, int stack) {
        int lo = base[i];
        int mid = lo + size[i] - 1;
        merge(a, aux, lo, mid, mid + size[i + 1]);
        size[i] += size[i + 1];
        if (i == stack - 3) {
            base[i + 1] = base[i + 2];
            size[i + 1] = size[i + 2];
        }
    }

    /** Merges runs in the order of a nearly optimal tree, as Python has done since 3.11. */
    static void powersort(int[] a) {
        int n = a.length;
        if (n < 2) {
            return;
        }
        int[] aux = new int[n];
        int[] base = new int[48];
        int[] size = new int[48];
        int[] power = new int[48];
        int stack = 0;
        int lo = 0;
        int run = extendRun(a, lo);
        while (lo + run < n) {
            int next = extendRun(a, lo + run);
            int p = nodePower(n, lo, run, next);
            while (stack > 0 && power[stack - 1] > p) {
                stack--;
                merge(a, aux, base[stack], lo - 1, lo + run - 1);
                lo = base[stack];
                run += size[stack];
            }
            base[stack] = lo;
            size[stack] = run;
            power[stack] = p;
            stack++;
            lo += run;
            run = next;
        }
        while (stack > 0) {
            stack--;
            merge(a, aux, base[stack], lo - 1, lo + run - 1);
            lo = base[stack];
            run += size[stack];
        }
    }

    private static int extendRun(int[] a, int lo) {
        int run = countRun(a, lo);
        int forced = Math.min(16, a.length - lo);
        if (run < forced) {
            binaryInsertRange(a, lo, lo + forced, lo + run);
            return forced;
        }
        return run;
    }

    /** Depth of the boundary between two runs in a perfectly balanced tree over the array. */
    private static int nodePower(int n, int lo, int run, int next) {
        double x = (lo + run / 2.0) / n;
        double y = (lo + run + next / 2.0) / n;
        for (int power = 1; ; power++) {
            x *= 2;
            y *= 2;
            if ((int) x != (int) y) {
                return power;
            }
            if (x >= 1) {
                x -= 1;
                y -= 1;
            }
        }
    }

    static void strand(int[] a) {
        int n = a.length;
        int[] rest = copy(a);
        int[] pulled = new int[n];
        int[] sorted = new int[n];
        int restCount = n;
        int sortedCount = 0;
        while (restCount > 0) {
            // Pull out one increasing strand, keeping everything else in order.
            int count = 1;
            int kept = 0;
            pulled[0] = rest[0];
            for (int i = 1; i < restCount; i++) {
                if (rest[i] >= pulled[count - 1]) {
                    pulled[count] = rest[i];
                    count++;
                } else {
                    rest[kept] = rest[i];
                    kept++;
                }
            }
            restCount = kept;
            arraycopy(a, 0, sorted, 0, sortedCount);
            int i = 0;
            int j = 0;
            int k = 0;
            while (i < sortedCount || j < count) {
                if (j == count || (i < sortedCount && sorted[i] <= pulled[j])) {
                    a[k] = sorted[i];
                    i++;
                } else {
                    a[k] = pulled[j];
                    j++;
                }
                k++;
            }
            sortedCount = k;
        }
    }

    static void patience(int[] a) {
        int n = a.length;
        int[] card = copy(a);
        int[] below = new int[n];
        int[] top = new int[n];
        int piles = 0;
        for (int i = 0; i < n; i++) {
            // Deal onto the leftmost pile whose top card is not smaller.
            int lo = 0;
            int hi = piles;
            while (lo < hi) {
                int mid = (lo + hi) >>> 1;
                if (card[top[mid]] >= card[i]) {
                    hi = mid;
                } else {
                    lo = mid + 1;
                }
            }
            below[i] = lo < piles ? top[lo] : -1;
            top[lo] = i;
            if (lo == piles) {
                piles++;
            }
        }
        // The pile tops rise from left to right, so they're already a valid heap.
        for (int k = 0; k < n; k++) {
            int next = top[0];
            a[k] = card[next];
            if (below[next] >= 0) {
                top[0] = below[next];
            } else {
                piles--;
                top[0] = top[piles];
            }
            int i = 0;
            while (true) {
                int child = 2 * i + 1;
                if (child >= piles) {
                    break;
                }
                if (child + 1 < piles && card[top[child + 1]] < card[top[child]]) {
                    child++;
                }
                if (card[top[child]] >= card[top[i]]) {
                    break;
                }
                swap(top, i, child);
                i = child;
            }
        }
    }

    static void tournament(int[] a) {
        int n = a.length;
        if (n < 2) {
            return;
        }
        int leaves = 1;
        while (leaves < n) {
            leaves *= 2;
        }
        int[] player = copy(a);
        int[] tree = new int[2 * leaves];
        for (int i = 0; i < leaves; i++) {
            tree[leaves + i] = i < n ? i : -1;
        }
        for (int i = leaves - 1; i >= 1; i--) {
            tree[i] = winner(player, tree[2 * i], tree[2 * i + 1]);
        }
        for (int k = 0; k < n; k++) {
            int champion = tree[1];
            a[k] = player[champion];
            int node = leaves + champion;
            tree[node] = -1;
            node >>= 1;
            while (node >= 1) {
                tree[node] = winner(player, tree[2 * node], tree[2 * node + 1]);
                node >>= 1;
            }
        }
    }

    private static int winner(int[] player, int x, int y) {
        if (x < 0) {
            return y;
        }
        if (y < 0) {
            return x;
        }
        return player[y] < player[x] ? y : x;
    }
}
