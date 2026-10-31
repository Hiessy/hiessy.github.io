package com.hiessy.sort;

import static com.hiessy.sort.Util.*;

/** Sorts that grow a sorted section by inserting one item at a time. */
final class Insertion {
    static void insertion(int[] a) {
        insertionRange(a, 0, a.length - 1);
    }

    /** Sorts a[lo..hi], both ends included. */
    static void insertionRange(int[] a, int lo, int hi) {
        for (int i = lo + 1; i <= hi; i++) {
            int x = a[i];
            int j = i - 1;
            while (j >= lo && a[j] > x) {
                a[j + 1] = a[j];
                j--;
            }
            a[j + 1] = x;
        }
    }

    static void binaryInsertion(int[] a) {
        binaryInsertRange(a, 0, a.length, 1);
    }

    /** Sorts a[lo..hi) when a[lo..start) is already sorted. */
    static void binaryInsertRange(int[] a, int lo, int hi, int start) {
        for (int i = start; i < hi; i++) {
            int x = a[i];
            int left = lo;
            int right = i;
            while (left < right) {
                int mid = (left + right) >>> 1;
                if (a[mid] <= x) {
                    left = mid + 1;
                } else {
                    right = mid;
                }
            }
            arraycopy(a, left, a, left + 1, i - left);
            a[left] = x;
        }
    }

    static void shell(int[] a) {
        for (int gap = a.length >> 1; gap > 0; gap >>= 1) {
            gapInsertion(a, gap);
        }
    }

    private static final int[] CIURA = {1, 4, 10, 23, 57, 132, 301, 701};

    static void shellCiura(int[] a) {
        int[] gaps = new int[40];
        int count = 0;
        for (int i = 0; i < CIURA.length; i++) {
            gaps[count] = CIURA[i];
            count++;
        }
        // Past the measured gaps, keep growing by Ciura's ratio.
        while (gaps[count - 1] < a.length) {
            gaps[count] = (int) (gaps[count - 1] * 2.25);
            count++;
        }
        for (int k = count - 1; k >= 0; k--) {
            gapInsertion(a, gaps[k]);
        }
    }

    private static void gapInsertion(int[] a, int gap) {
        for (int i = gap; i < a.length; i++) {
            int x = a[i];
            int j = i;
            while (j >= gap && a[j - gap] > x) {
                a[j] = a[j - gap];
                j -= gap;
            }
            a[j] = x;
        }
    }

    static void library(int[] a) {
        int n = a.length;
        if (n < 2) {
            return;
        }
        int size = 4 * n + 4;
        int[] shelf = new int[size];
        boolean[] full = new boolean[size];
        int sorted = 1;
        while (sorted < n) {
            // Spread the sorted books out, leaving gaps for the next round.
            int step = div(size, sorted + 1);
            for (int i = 0; i < size; i++) {
                full[i] = false;
            }
            for (int i = 0; i < sorted; i++) {
                shelf[(i + 1) * step] = a[i];
                full[(i + 1) * step] = true;
            }
            int stop = Math.min(2 * sorted, n);
            for (int i = sorted; i < stop; i++) {
                shelve(shelf, full, size, a[i]);
            }
            int k = 0;
            for (int i = 0; i < size; i++) {
                if (full[i]) {
                    a[k] = shelf[i];
                    k++;
                }
            }
            sorted = stop;
        }
    }

    private static void shelve(int[] shelf, boolean[] full, int size, int x) {
        int lo = 0;
        int hi = size;
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            int m = mid;
            while (m < hi && !full[m]) {
                m++;
            }
            if (m == hi) {
                hi = mid;
            } else if (shelf[m] <= x) {
                lo = m + 1;
            } else {
                hi = mid;
            }
        }
        // lo is where x belongs. Push its neighbours into the nearest gap.
        int free = lo;
        while (free < size && full[free]) {
            free++;
        }
        if (free < size) {
            for (int i = free; i > lo; i--) {
                shelf[i] = shelf[i - 1];
            }
            shelf[lo] = x;
        } else {
            free = lo - 1;
            while (full[free]) {
                free--;
            }
            for (int i = free; i < lo - 1; i++) {
                shelf[i] = shelf[i + 1];
            }
            shelf[lo - 1] = x;
        }
        full[free] = true;
    }
}
