package com.hiessy.sort;

import static com.hiessy.sort.Data.isSorted;
import static com.hiessy.sort.Util.*;

/** Sorts that are slow on purpose. They're how you learn what a bad O looks like. */
final class Silly {
    static void stooge(int[] a) {
        if (a.length > 1) {
            stoogeRange(a, 0, a.length - 1);
        }
    }

    private static void stoogeRange(int[] a, int lo, int hi) {
        if (a[lo] > a[hi]) {
            swap(a, lo, hi);
        }
        if (hi - lo + 1 > 2) {
            int third = div(hi - lo + 1, 3);
            stoogeRange(a, lo, hi - third);
            stoogeRange(a, lo + third, hi);
            stoogeRange(a, lo, hi - third);
        }
    }

    static void slow(int[] a) {
        slowRange(a, 0, a.length - 1);
    }

    /** "Multiply and surrender": the opposite of divide and conquer. */
    private static void slowRange(int[] a, int lo, int hi) {
        if (lo >= hi) {
            return;
        }
        int mid = (lo + hi) >>> 1;
        slowRange(a, lo, mid);
        slowRange(a, mid + 1, hi);
        if (a[hi] < a[mid]) {
            swap(a, hi, mid);
        }
        slowRange(a, lo, hi - 1);
    }

    static void bogo(int[] a) {
        int seed = -1640531527;
        while (!isSorted(a)) {
            for (int i = a.length - 1; i > 0; i--) {
                seed = nextRandom(seed);
                swap(a, i, (seed >>> 1) % (i + 1));
            }
        }
    }

    static void bozo(int[] a) {
        int seed = -1640531527;
        while (!isSorted(a)) {
            seed = nextRandom(seed);
            int i = (seed >>> 1) % a.length;
            seed = nextRandom(seed);
            int j = (seed >>> 1) % a.length;
            swap(a, i, j);
        }
    }
}
