package com.hiessy.sort;

import static com.hiessy.sort.Util.*;

/** Sorts that keep the largest item reachable in a tree stored inside the array. */
final class Heaps {
    static void heap(int[] a) {
        heapRange(a, 0, a.length - 1);
    }

    /** Sorts a[lo..hi], both ends included. */
    static void heapRange(int[] a, int lo, int hi) {
        int n = hi - lo + 1;
        for (int i = (n >> 1) - 1; i >= 0; i--) {
            siftDown(a, lo, i, n);
        }
        for (int end = n - 1; end > 0; end--) {
            swap(a, lo, lo + end);
            siftDown(a, lo, 0, end);
        }
    }

    private static void siftDown(int[] a, int lo, int i, int n) {
        int x = a[lo + i];
        while (true) {
            int child = 2 * i + 1;
            if (child >= n) {
                break;
            }
            if (child + 1 < n && a[lo + child + 1] > a[lo + child]) {
                child++;
            }
            if (a[lo + child] <= x) {
                break;
            }
            a[lo + i] = a[lo + child];
            i = child;
        }
        a[lo + i] = x;
    }

    static void heapTernary(int[] a) {
        int n = a.length;
        for (int i = div(n - 2, 3); i >= 0 && n > 1; i--) {
            ternaryDown(a, i, n);
        }
        for (int end = n - 1; end > 0; end--) {
            swap(a, 0, end);
            ternaryDown(a, 0, end);
        }
    }

    private static void ternaryDown(int[] a, int i, int n) {
        int x = a[i];
        while (true) {
            int first = 3 * i + 1;
            if (first >= n) {
                break;
            }
            int child = first;
            int stop = Math.min(first + 3, n);
            for (int c = first + 1; c < stop; c++) {
                if (a[c] > a[child]) {
                    child = c;
                }
            }
            if (a[child] <= x) {
                break;
            }
            a[i] = a[child];
            i = child;
        }
        a[i] = x;
    }

    static void heapBottomUp(int[] a) {
        int n = a.length;
        for (int i = (n >> 1) - 1; i >= 0; i--) {
            siftDown(a, 0, i, n);
        }
        for (int end = n - 1; end > 0; end--) {
            int x = a[end];
            a[end] = a[0];
            // Follow the larger child all the way down, then climb back to x's place.
            int j = 0;
            while (true) {
                int child = 2 * j + 1;
                if (child >= end) {
                    break;
                }
                if (child + 1 < end && a[child + 1] > a[child]) {
                    child++;
                }
                j = child;
            }
            while (a[j] < x) {
                j = (j - 1) >> 1;
            }
            while (j > 0) {
                int held = a[j];
                a[j] = x;
                x = held;
                j = (j - 1) >> 1;
            }
            a[0] = x;
        }
    }

    static void heapWeak(int[] a) {
        int n = a.length;
        if (n < 2) {
            return;
        }
        boolean[] flipped = new boolean[n];
        for (int i = n - 1; i > 0; i--) {
            int j = i;
            while ((j & 1) == (flipped[j >> 1] ? 1 : 0)) {
                j >>= 1;
            }
            weakMerge(a, flipped, j >> 1, i);
        }
        for (int end = n - 1; end >= 2; end--) {
            swap(a, 0, end);
            int x = 1;
            int y = 2 * x + (flipped[x] ? 1 : 0);
            while (y < end) {
                x = y;
                y = 2 * x + (flipped[x] ? 1 : 0);
            }
            while (x > 0) {
                weakMerge(a, flipped, 0, x);
                x >>= 1;
            }
        }
        swap(a, 0, 1);
    }

    private static void weakMerge(int[] a, boolean[] flipped, int i, int j) {
        if (a[i] < a[j]) {
            swap(a, i, j);
            flipped[j] = !flipped[j];
        }
    }

    /** Dijkstra's smoothsort: a forest of Leonardo heaps, so sorted input costs O(n). */
    static void smooth(int[] a) {
        int n = a.length;
        if (n < 2) {
            return;
        }
        int[] size = new int[44];
        size[0] = 1;
        size[1] = 1;
        for (int i = 2; i < 44; i++) {
            size[i] = size[i - 1] + size[i - 2] + 1;
        }
        int[] orders = new int[64];
        int trees = 0;
        for (int i = 0; i < n; i++) {
            if (trees >= 2 && orders[trees - 2] == orders[trees - 1] + 1) {
                trees--;
                orders[trees - 1]++;
            } else if (trees >= 1 && orders[trees - 1] == 1) {
                orders[trees] = 0;
                trees++;
            } else {
                orders[trees] = 1;
                trees++;
            }
            fixRoots(a, size, orders, trees - 1, i);
        }
        for (int i = n - 1; i > 0; i--) {
            trees--;
            int order = orders[trees];
            if (order >= 2) {
                int right = i - 1;
                int left = right - size[order - 2];
                orders[trees] = order - 1;
                trees++;
                fixRoots(a, size, orders, trees - 1, left);
                orders[trees] = order - 2;
                trees++;
                fixRoots(a, size, orders, trees - 1, right);
            }
        }
    }

    /** Keeps tree roots rising from left to right, then repairs the tree the new root landed in. */
    private static void fixRoots(int[] a, int[] size, int[] orders, int tree, int root) {
        while (tree > 0) {
            int previous = root - size[orders[tree]];
            if (a[previous] <= a[root]) {
                break;
            }
            int order = orders[tree];
            if (order >= 2) {
                int right = root - 1;
                int left = right - size[order - 2];
                if (a[previous] <= a[right] || a[previous] <= a[left]) {
                    break;
                }
            }
            swap(a, previous, root);
            root = previous;
            tree--;
        }
        siftLeonardo(a, size, root, orders[tree]);
    }

    private static void siftLeonardo(int[] a, int[] size, int root, int order) {
        while (order >= 2) {
            int right = root - 1;
            int left = right - size[order - 2];
            int child = a[left] >= a[right] ? left : right;
            if (a[root] >= a[child]) {
                return;
            }
            swap(a, root, child);
            order = child == left ? order - 1 : order - 2;
            root = child;
        }
    }
}
