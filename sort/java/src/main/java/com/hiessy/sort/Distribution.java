package com.hiessy.sort;

import static com.hiessy.sort.Insertion.insertionRange;
import static com.hiessy.sort.Util.*;

/**
 * Sorts that use the value of each item instead of comparing pairs, which is how
 * they get past the n log n limit on comparison sorts.
 */
final class Distribution {
    static void counting(int[] a) {
        if (a.length < 2) {
            return;
        }
        int min = minOf(a);
        int[] count = new int[maxOf(a) - min + 1];
        for (int i = 0; i < a.length; i++) {
            count[a[i] - min]++;
        }
        int k = 0;
        for (int v = 0; v < count.length; v++) {
            for (int c = count[v]; c > 0; c--) {
                a[k] = v + min;
                k++;
            }
        }
    }

    static void pigeonhole(int[] a) {
        int n = a.length;
        if (n < 2) {
            return;
        }
        int min = minOf(a);
        int[] hole = new int[maxOf(a) - min + 1];
        int[] next = new int[n + 1];
        int[] item = copy(a);
        for (int i = n - 1; i >= 0; i--) {
            int h = item[i] - min;
            next[i + 1] = hole[h];
            hole[h] = i + 1;
        }
        int k = 0;
        for (int h = 0; h < hole.length; h++) {
            for (int node = hole[h]; node != 0; node = next[node]) {
                a[k] = item[node - 1];
                k++;
            }
        }
    }

    static void radixLsd(int[] a) {
        int n = a.length;
        if (n < 2) {
            return;
        }
        int max = maxOf(a);
        int[] aux = new int[n];
        int[] src = a;
        int[] dst = aux;
        for (int shift = 0; shift < 32 && (max >>> shift) > 0; shift += 8) {
            int[] start = new int[257];
            for (int i = 0; i < n; i++) {
                start[((src[i] >>> shift) & 255) + 1]++;
            }
            for (int d = 0; d < 256; d++) {
                start[d + 1] += start[d];
            }
            for (int i = 0; i < n; i++) {
                int d = (src[i] >>> shift) & 255;
                dst[start[d]] = src[i];
                start[d]++;
            }
            int[] held = src;
            src = dst;
            dst = held;
        }
        if (src != a) {
            arraycopy(src, 0, a, 0, n);
        }
    }

    private static int topShift(int[] a) {
        int max = a.length > 0 ? maxOf(a) : 0;
        return max == 0 ? -1 : ((31 - clz(max)) >> 3) * 8;
    }

    static void radixMsd(int[] a) {
        msdRange(a, new int[a.length], 0, a.length, topShift(a));
    }

    private static void msdRange(int[] a, int[] aux, int lo, int hi, int shift) {
        if (hi - lo < 32 || shift < 0) {
            insertionRange(a, lo, hi - 1);
            return;
        }
        int[] start = new int[257];
        for (int i = lo; i < hi; i++) {
            start[((a[i] >>> shift) & 255) + 1]++;
        }
        for (int d = 0; d < 256; d++) {
            start[d + 1] += start[d];
        }
        int[] next = copy(start);
        for (int i = lo; i < hi; i++) {
            int d = (a[i] >>> shift) & 255;
            aux[lo + next[d]] = a[i];
            next[d]++;
        }
        arraycopy(aux, lo, a, lo, hi - lo);
        for (int d = 0; d < 256; d++) {
            msdRange(a, aux, lo + start[d], lo + start[d + 1], shift - 8);
        }
    }

    static void americanFlag(int[] a) {
        flagRange(a, 0, a.length, topShift(a));
    }

    private static void flagRange(int[] a, int lo, int hi, int shift) {
        if (hi - lo < 32 || shift < 0) {
            insertionRange(a, lo, hi - 1);
            return;
        }
        int[] start = new int[257];
        for (int i = lo; i < hi; i++) {
            start[((a[i] >>> shift) & 255) + 1]++;
        }
        start[0] = lo;
        for (int d = 0; d < 256; d++) {
            start[d + 1] += start[d];
        }
        int[] next = copy(start);
        for (int d = 0; d < 256; d++) {
            while (next[d] < start[d + 1]) {
                int digit = (a[next[d]] >>> shift) & 255;
                if (digit == d) {
                    next[d]++;
                } else {
                    swap(a, next[d], next[digit]);
                    next[digit]++;
                }
            }
        }
        for (int d = 0; d < 256; d++) {
            flagRange(a, start[d], start[d + 1], shift - 8);
        }
    }

    static void radixExchange(int[] a) {
        int shift = topShift(a);
        if (shift >= 0) {
            bitRange(a, 0, a.length - 1, shift + 7);
        }
    }

    private static void bitRange(int[] a, int lo, int hi, int bit) {
        if (lo >= hi || bit < 0) {
            return;
        }
        int i = lo;
        int j = hi;
        while (i <= j) {
            while (i <= j && ((a[i] >>> bit) & 1) == 0) {
                i++;
            }
            while (i <= j && ((a[j] >>> bit) & 1) == 1) {
                j--;
            }
            if (i < j) {
                swap(a, i, j);
            }
        }
        bitRange(a, lo, j, bit - 1);
        bitRange(a, i, hi, bit - 1);
    }

    static void bucket(int[] a) {
        int n = a.length;
        if (n < 2) {
            return;
        }
        int min = minOf(a);
        int max = maxOf(a);
        if (min == max) {
            return;
        }
        double scale = (double) (n - 1) / (max - min);
        int[] start = new int[n + 1];
        for (int i = 0; i < n; i++) {
            start[(int) ((a[i] - min) * scale) + 1]++;
        }
        for (int b = 0; b < n; b++) {
            start[b + 1] += start[b];
        }
        int[] next = copy(start);
        int[] aux = new int[n];
        for (int i = 0; i < n; i++) {
            int b = (int) ((a[i] - min) * scale);
            aux[next[b]] = a[i];
            next[b]++;
        }
        arraycopy(aux, 0, a, 0, n);
        for (int b = 0; b < n; b++) {
            insertionRange(a, start[b], start[b + 1] - 1);
        }
    }

    static void flash(int[] a) {
        int n = a.length;
        if (n < 2) {
            return;
        }
        int min = a[0];
        int top = 0;
        for (int i = 1; i < n; i++) {
            if (a[i] < min) {
                min = a[i];
            }
            if (a[i] > a[top]) {
                top = i;
            }
        }
        if (a[top] == min) {
            return;
        }
        int classes = Math.max(2, (int) (0.43 * n));
        double scale = (double) (classes - 1) / (a[top] - min);
        int[] end = new int[classes];
        for (int i = 0; i < n; i++) {
            end[(int) (scale * (a[i] - min))]++;
        }
        for (int c = 1; c < classes; c++) {
            end[c] += end[c - 1];
        }
        swap(a, top, 0);
        // Follow cycles: each item goes to the end of its class and bumps the one there.
        int moves = 0;
        int j = 0;
        int c = classes - 1;
        while (moves < n - 1) {
            while (j > end[c] - 1) {
                j++;
                c = (int) (scale * (a[j] - min));
            }
            int flying = a[j];
            while (j != end[c]) {
                c = (int) (scale * (flying - min));
                int held = a[end[c] - 1];
                a[end[c] - 1] = flying;
                flying = held;
                end[c]--;
                moves++;
            }
        }
        insertionRange(a, 0, n - 1);
    }

    static void proxmap(int[] a) {
        int n = a.length;
        if (n < 2) {
            return;
        }
        int min = minOf(a);
        int max = maxOf(a);
        if (min == max) {
            return;
        }
        double scale = (double) (n - 1) / (max - min);
        int[] hits = new int[n];
        for (int i = 0; i < n; i++) {
            hits[(int) ((a[i] - min) * scale)]++;
        }
        int[] start = new int[n];
        int running = 0;
        for (int k = 0; k < n; k++) {
            start[k] = running;
            running += hits[k];
        }
        int[] out = new int[n];
        int[] placed = new int[n];
        for (int i = 0; i < n; i++) {
            int x = a[i];
            int k = (int) ((x - min) * scale);
            int first = start[k];
            int pos = first + placed[k];
            placed[k]++;
            while (pos > first && out[pos - 1] > x) {
                out[pos] = out[pos - 1];
                pos--;
            }
            out[pos] = x;
        }
        arraycopy(out, 0, a, 0, n);
    }

    static void interpolation(int[] a) {
        interpolationRange(a, new int[a.length], 0, a.length - 1);
    }

    private static void interpolationRange(int[] a, int[] aux, int lo, int hi) {
        int n = hi - lo + 1;
        if (n < 2) {
            return;
        }
        int min = a[lo];
        int max = a[lo];
        for (int i = lo + 1; i <= hi; i++) {
            min = Math.min(min, a[i]);
            max = Math.max(max, a[i]);
        }
        if (min == max) {
            return;
        }
        double scale = (double) (n - 1) / (max - min);
        int[] start = new int[n + 1];
        for (int i = lo; i <= hi; i++) {
            start[(int) ((a[i] - min) * scale) + 1]++;
        }
        for (int b = 0; b < n; b++) {
            start[b + 1] += start[b];
        }
        int[] next = copy(start);
        for (int i = lo; i <= hi; i++) {
            int b = (int) ((a[i] - min) * scale);
            aux[lo + next[b]] = a[i];
            next[b]++;
        }
        arraycopy(aux, lo, a, lo, n);
        for (int b = 0; b < n; b++) {
            interpolationRange(a, aux, lo + start[b], lo + start[b + 1] - 1);
        }
    }

    /** Each value is a row of beads on rods. Let them fall, then read the rows back. */
    static void bead(int[] a) {
        int n = a.length;
        if (n < 2) {
            return;
        }
        int[] rod = new int[maxOf(a)];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < a[i]; j++) {
                rod[j]++;
            }
        }
        for (int row = 0; row < n; row++) {
            int beads = 0;
            while (beads < rod.length && rod[beads] > row) {
                beads++;
            }
            a[n - 1 - row] = beads;
        }
    }
}
