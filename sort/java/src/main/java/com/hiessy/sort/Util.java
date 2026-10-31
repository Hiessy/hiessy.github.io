package com.hiessy.sort;

/**
 * Helpers the sorts share. The build swaps div, mul, clz and arraycopy for
 * hand-written JavaScript, because int arithmetic differs between the languages.
 */
final class Util {
    static void swap(int[] a, int i, int j) {
        int t = a[i];
        a[i] = a[j];
        a[j] = t;
    }

    /** Integer division that truncates in both languages. */
    static int div(int x, int y) {
        return x / y;
    }

    /** 32-bit multiplication that wraps in both languages. */
    static int mul(int x, int y) {
        return x * y;
    }

    static int clz(int x) {
        return Integer.numberOfLeadingZeros(x);
    }

    static void arraycopy(int[] src, int from, int[] dst, int to, int length) {
        System.arraycopy(src, from, dst, to, length);
    }

    static int[] copy(int[] a) {
        int[] b = new int[a.length];
        arraycopy(a, 0, b, 0, a.length);
        return b;
    }

    /** One step of xorshift32. Shifts only, so both languages get the same numbers. */
    static int nextRandom(int x) {
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        return x;
    }

    static int minOf(int[] a) {
        int min = a[0];
        for (int i = 1; i < a.length; i++) {
            if (a[i] < min) {
                min = a[i];
            }
        }
        return min;
    }

    static int maxOf(int[] a) {
        int max = a[0];
        for (int i = 1; i < a.length; i++) {
            if (a[i] > max) {
                max = a[i];
            }
        }
        return max;
    }

    /** Reverses a[lo..hi], both ends included. */
    static void reverse(int[] a, int lo, int hi) {
        while (lo < hi) {
            swap(a, lo, hi);
            lo++;
            hi--;
        }
    }
}
