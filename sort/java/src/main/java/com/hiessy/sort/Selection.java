package com.hiessy.sort;

import static com.hiessy.sort.Util.*;

/** Sorts that find the item that belongs next and put it in place. */
final class Selection {
    static void selection(int[] a) {
        for (int i = 0; i < a.length - 1; i++) {
            int min = i;
            for (int j = i + 1; j < a.length; j++) {
                if (a[j] < a[min]) {
                    min = j;
                }
            }
            swap(a, i, min);
        }
    }

    static void doubleSelection(int[] a) {
        int lo = 0;
        int hi = a.length - 1;
        while (lo < hi) {
            int min = lo;
            int max = lo;
            for (int i = lo + 1; i <= hi; i++) {
                if (a[i] < a[min]) {
                    min = i;
                }
                if (a[i] > a[max]) {
                    max = i;
                }
            }
            swap(a, lo, min);
            // The largest may have just been moved by that swap.
            if (max == lo) {
                max = min;
            }
            swap(a, hi, max);
            lo++;
            hi--;
        }
    }

    static void bingo(int[] a) {
        if (a.length < 2) {
            return;
        }
        int top = maxOf(a);
        int target = minOf(a);
        int placed = 0;
        while (target < top) {
            int next = top;
            for (int i = placed; i < a.length; i++) {
                if (a[i] == target) {
                    swap(a, i, placed);
                    placed++;
                } else if (a[i] < next) {
                    next = a[i];
                }
            }
            target = next;
        }
    }

    static void cycle(int[] a) {
        int n = a.length;
        for (int start = 0; start < n - 1; start++) {
            int item = a[start];
            int pos = start;
            for (int i = start + 1; i < n; i++) {
                if (a[i] < item) {
                    pos++;
                }
            }
            if (pos == start) {
                continue;
            }
            while (item == a[pos]) {
                pos++;
            }
            int held = a[pos];
            a[pos] = item;
            item = held;
            while (pos != start) {
                pos = start;
                for (int i = start + 1; i < n; i++) {
                    if (a[i] < item) {
                        pos++;
                    }
                }
                while (item == a[pos]) {
                    pos++;
                }
                held = a[pos];
                a[pos] = item;
                item = held;
            }
        }
    }

    static void pancake(int[] a) {
        for (int size = a.length; size > 1; size--) {
            int max = 0;
            for (int i = 1; i < size; i++) {
                if (a[i] > a[max]) {
                    max = i;
                }
            }
            if (max != size - 1) {
                reverse(a, 0, max);
                reverse(a, 0, size - 1);
            }
        }
    }
}
