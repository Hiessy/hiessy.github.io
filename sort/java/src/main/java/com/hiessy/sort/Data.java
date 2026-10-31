package com.hiessy.sort;

import static com.hiessy.sort.Util.*;

/** The test inputs. Both languages generate the same numbers from the same seed. */
final class Data {
    static final int RANDOM = 0;
    static final int SORTED = 1;
    static final int REVERSED = 2;
    static final int NEARLY_SORTED = 3;
    static final int FEW_UNIQUE = 4;
    static final int RUNS = 5;
    static final int ORGAN_PIPE = 6;
    static final int ALL_EQUAL = 7;

    static int[] generate(int n, int pattern, int seed) {
        int[] a = new int[n];
        int x = seed != 0 ? seed : -1640531527;
        int range = Math.max(n * 4, 16);
        int runLength = Math.max(2, (int) Math.sqrt(n));
        for (int i = 0; i < n; i++) {
            x = nextRandom(x);
            if (pattern == RANDOM) {
                a[i] = (x >>> 1) % range;
            } else if (pattern == SORTED || pattern == NEARLY_SORTED) {
                a[i] = i;
            } else if (pattern == REVERSED) {
                a[i] = n - 1 - i;
            } else if (pattern == FEW_UNIQUE) {
                a[i] = (x >>> 1) % 8;
            } else if (pattern == RUNS) {
                a[i] = (i % runLength) * 3 + (x >>> 1) % 3;
            } else if (pattern == ORGAN_PIPE) {
                a[i] = i < n >> 1 ? i : n - 1 - i;
            } else {
                a[i] = 7;
            }
        }
        if (pattern == NEARLY_SORTED) {
            int swaps = (n >> 5) + 1;
            for (int k = 0; k < swaps && n > 1; k++) {
                x = nextRandom(x);
                int i = (x >>> 1) % n;
                x = nextRandom(x);
                int j = (x >>> 1) % n;
                swap(a, i, j);
            }
        }
        return a;
    }

    /** FNV-1a over the values, so two arrays can be compared across languages. */
    static int checksum(int[] a) {
        int h = -2128831035;
        for (int i = 0; i < a.length; i++) {
            h = mul(h ^ a[i], 16777619);
        }
        return h;
    }

    static boolean isSorted(int[] a) {
        for (int i = 1; i < a.length; i++) {
            if (a[i - 1] > a[i]) {
                return false;
            }
        }
        return true;
    }
}
