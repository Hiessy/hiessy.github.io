package com.hiessy.sort;

import static com.hiessy.sort.Util.*;

/**
 * Sorting networks: the sequence of comparisons is fixed before seeing the data,
 * which is what lets them run in parallel on GPUs and in hardware.
 */
final class Networks {
    private static void compareExchange(int[] a, int i, int j) {
        if (a[i] > a[j]) {
            swap(a, i, j);
        }
    }

    static void batcher(int[] a) {
        int n = a.length;
        for (int level = 0, p = 1; p < n; level++, p *= 2) {
            for (int k = p; k >= 1; k >>= 1) {
                for (int j = k % p; j <= n - 1 - k; j += 2 * k) {
                    int stop = Math.min(k - 1, n - j - k - 1);
                    for (int i = 0; i <= stop; i++) {
                        if ((i + j) >> (level + 1) == (i + j + k) >> (level + 1)) {
                            compareExchange(a, i + j, i + j + k);
                        }
                    }
                }
            }
        }
    }

    static void bitonic(int[] a) {
        bitonicRange(a, 0, a.length, true);
    }

    private static void bitonicRange(int[] a, int lo, int n, boolean up) {
        if (n > 1) {
            int half = n >> 1;
            bitonicRange(a, lo, half, !up);
            bitonicRange(a, lo + half, n - half, up);
            bitonicMerge(a, lo, n, up);
        }
    }

    private static void bitonicMerge(int[] a, int lo, int n, boolean up) {
        if (n > 1) {
            int m = 1 << (31 - clz(n - 1));
            for (int i = lo; i < lo + n - m; i++) {
                if (up) {
                    compareExchange(a, i, i + m);
                } else {
                    compareExchange(a, i + m, i);
                }
            }
            bitonicMerge(a, lo, m, up);
            bitonicMerge(a, lo + m, n - m, up);
        }
    }
}
