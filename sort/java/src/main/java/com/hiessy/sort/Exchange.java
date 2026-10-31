package com.hiessy.sort;

import static com.hiessy.sort.Util.*;

/** Sorts built on comparing two items and swapping them if they're out of order. */
final class Exchange {
    static void bubble(int[] a) {
        for (int end = a.length - 1; end > 0; end--) {
            boolean swapped = false;
            for (int i = 0; i < end; i++) {
                if (a[i] > a[i + 1]) {
                    swap(a, i, i + 1);
                    swapped = true;
                }
            }
            if (!swapped) {
                return;
            }
        }
    }

    static void cocktail(int[] a) {
        int lo = 0;
        int hi = a.length - 1;
        boolean swapped = true;
        while (swapped && lo < hi) {
            swapped = false;
            for (int i = lo; i < hi; i++) {
                if (a[i] > a[i + 1]) {
                    swap(a, i, i + 1);
                    swapped = true;
                }
            }
            hi--;
            for (int i = hi; i > lo; i--) {
                if (a[i - 1] > a[i]) {
                    swap(a, i - 1, i);
                    swapped = true;
                }
            }
            lo++;
        }
    }

    static void oddEven(int[] a) {
        boolean sorted = false;
        while (!sorted) {
            sorted = true;
            for (int start = 1; start >= 0; start--) {
                for (int i = start; i + 1 < a.length; i += 2) {
                    if (a[i] > a[i + 1]) {
                        swap(a, i, i + 1);
                        sorted = false;
                    }
                }
            }
        }
    }

    static void gnome(int[] a) {
        int i = 1;
        while (i < a.length) {
            if (i == 0 || a[i - 1] <= a[i]) {
                i++;
            } else {
                swap(a, i, i - 1);
                i--;
            }
        }
    }

    static void comb(int[] a) {
        int gap = a.length;
        boolean swapped = true;
        while (gap > 1 || swapped) {
            gap = Math.max(1, div(gap * 10, 13));
            swapped = false;
            for (int i = 0; i + gap < a.length; i++) {
                if (a[i] > a[i + gap]) {
                    swap(a, i, i + gap);
                    swapped = true;
                }
            }
        }
    }

    static void exchange(int[] a) {
        for (int i = 0; i < a.length - 1; i++) {
            for (int j = i + 1; j < a.length; j++) {
                if (a[i] > a[j]) {
                    swap(a, i, j);
                }
            }
        }
    }
}
