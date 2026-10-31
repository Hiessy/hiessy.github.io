package com.hiessy.sort;

import static com.hiessy.sort.Heaps.heapRange;
import static com.hiessy.sort.Insertion.insertionRange;
import static com.hiessy.sort.Util.*;

/**
 * Sorts that split the data around pivots. Each range recurses into its smaller
 * side and loops on the larger, so the call stack stays O(log n) even on bad input.
 */
final class Quick {
    static void quickLomuto(int[] a) {
        lomutoRange(a, 0, a.length - 1);
    }

    private static void lomutoRange(int[] a, int lo, int hi) {
        while (lo < hi) {
            int pivot = a[hi];
            int p = lo;
            for (int i = lo; i < hi; i++) {
                if (a[i] < pivot) {
                    swap(a, i, p);
                    p++;
                }
            }
            swap(a, p, hi);
            if (p - lo < hi - p) {
                lomutoRange(a, lo, p - 1);
                lo = p + 1;
            } else {
                lomutoRange(a, p + 1, hi);
                hi = p - 1;
            }
        }
    }

    static void quickHoare(int[] a) {
        hoareRange(a, 0, a.length - 1);
    }

    private static void hoareRange(int[] a, int lo, int hi) {
        while (lo < hi) {
            int pivot = a[(lo + hi) >>> 1];
            int i = lo;
            int j = hi;
            while (i <= j) {
                while (a[i] < pivot) {
                    i++;
                }
                while (a[j] > pivot) {
                    j--;
                }
                if (i <= j) {
                    swap(a, i, j);
                    i++;
                    j--;
                }
            }
            if (j - lo < hi - i) {
                hoareRange(a, lo, j);
                lo = i;
            } else {
                hoareRange(a, i, hi);
                hi = j;
            }
        }
    }

    static void quickThreeWay(int[] a) {
        threeWayRange(a, 0, a.length - 1);
    }

    private static void threeWayRange(int[] a, int lo, int hi) {
        while (lo < hi) {
            int pivot = a[(lo + hi) >>> 1];
            int lt = lo;
            int i = lo;
            int gt = hi;
            while (i <= gt) {
                if (a[i] < pivot) {
                    swap(a, lt, i);
                    lt++;
                    i++;
                } else if (a[i] > pivot) {
                    swap(a, i, gt);
                    gt--;
                } else {
                    i++;
                }
            }
            if (lt - lo < hi - gt) {
                threeWayRange(a, lo, lt - 1);
                lo = gt + 1;
            } else {
                threeWayRange(a, gt + 1, hi);
                hi = lt - 1;
            }
        }
    }

    static void quickDualPivot(int[] a) {
        dualPivotRange(a, 0, a.length - 1);
    }

    private static void dualPivotRange(int[] a, int lo, int hi) {
        while (lo < hi) {
            int third = div(hi - lo, 3);
            swap(a, lo, lo + third);
            swap(a, hi, hi - third);
            if (a[lo] > a[hi]) {
                swap(a, lo, hi);
            }
            int small = a[lo];
            int large = a[hi];
            int lt = lo + 1;
            int gt = hi - 1;
            int i = lt;
            while (i <= gt) {
                if (a[i] < small) {
                    swap(a, i, lt);
                    lt++;
                    i++;
                } else if (a[i] > large) {
                    swap(a, i, gt);
                    gt--;
                } else {
                    i++;
                }
            }
            lt--;
            gt++;
            swap(a, lo, lt);
            swap(a, hi, gt);
            int left = lt - lo;
            int middle = gt - lt;
            int right = hi - gt;
            if (left >= middle && left >= right) {
                dualPivotRange(a, lt + 1, gt - 1);
                dualPivotRange(a, gt + 1, hi);
                hi = lt - 1;
            } else if (middle >= right) {
                dualPivotRange(a, lo, lt - 1);
                dualPivotRange(a, gt + 1, hi);
                lo = lt + 1;
                hi = gt - 1;
            } else {
                dualPivotRange(a, lo, lt - 1);
                dualPivotRange(a, lt + 1, gt - 1);
                lo = gt + 1;
            }
        }
    }

    static void introsort(int[] a) {
        int n = a.length;
        if (n < 2) {
            return;
        }
        introRange(a, 0, n - 1, 2 * (31 - clz(n)));
        insertionRange(a, 0, n - 1);
    }

    /** Quicksort until ranges are tiny, or heapsort if the pivots keep going badly. */
    private static void introRange(int[] a, int lo, int hi, int depth) {
        while (hi - lo > 16) {
            if (depth == 0) {
                heapRange(a, lo, hi);
                return;
            }
            depth--;
            int mid = (lo + hi) >>> 1;
            int pivot = Math.max(Math.min(a[lo], a[mid]), Math.min(Math.max(a[lo], a[mid]), a[hi]));
            int i = lo - 1;
            int j = hi + 1;
            while (true) {
                do {
                    i++;
                } while (a[i] < pivot);
                do {
                    j--;
                } while (a[j] > pivot);
                if (i >= j) {
                    break;
                }
                swap(a, i, j);
            }
            introRange(a, j + 1, hi, depth);
            hi = j;
        }
    }

    static void pdqsort(int[] a) {
        int n = a.length;
        if (n > 1) {
            pdqLoop(a, 0, n, 31 - clz(n), true);
        }
    }

    private static void pdqLoop(int[] a, int begin, int end, int badAllowed, boolean leftmost) {
        while (true) {
            int size = end - begin;
            if (size < 24) {
                insertionRange(a, begin, end - 1);
                return;
            }
            int half = size >> 1;
            if (size > 128) {
                sort3(a, begin, begin + half, end - 1);
                sort3(a, begin + 1, begin + half - 1, end - 2);
                sort3(a, begin + 2, begin + half + 1, end - 3);
                sort3(a, begin + half - 1, begin + half, begin + half + 1);
                swap(a, begin, begin + half);
            } else {
                sort3(a, begin + half, begin, end - 1);
            }
            // Nothing here is below the item just left of the range. If the pivot
            // equals it, gather the equal items on the left: they're already done.
            if (!leftmost && a[begin - 1] >= a[begin]) {
                begin = partitionLeft(a, begin, end) + 1;
                continue;
            }
            int part = partitionRight(a, begin, end);
            int pivot = part >> 1;
            boolean alreadyPartitioned = (part & 1) == 1;
            int left = pivot - begin;
            int right = end - pivot - 1;
            if (left < size >> 3 || right < size >> 3) {
                badAllowed--;
                if (badAllowed == 0) {
                    heapRange(a, begin, end - 1);
                    return;
                }
                scatter(a, begin, pivot, left);
                scatter(a, pivot + 1, end, right);
            } else if (alreadyPartitioned && partialInsertion(a, begin, pivot)
                    && partialInsertion(a, pivot + 1, end)) {
                return;
            }
            pdqLoop(a, begin, pivot, badAllowed, leftmost);
            begin = pivot + 1;
            leftmost = false;
        }
    }

    private static void sort3(int[] a, int i, int j, int k) {
        if (a[j] < a[i]) {
            swap(a, i, j);
        }
        if (a[k] < a[j]) {
            swap(a, j, k);
        }
        if (a[j] < a[i]) {
            swap(a, i, j);
        }
    }

    /** Breaks up patterns in a[begin..end) that caused an unbalanced split. */
    private static void scatter(int[] a, int begin, int end, int size) {
        if (size < 24) {
            return;
        }
        int q = size >> 2;
        swap(a, begin, begin + q);
        swap(a, end - 1, end - q);
        if (size > 128) {
            swap(a, begin + 1, begin + q + 1);
            swap(a, begin + 2, begin + q + 2);
            swap(a, end - 2, end - q - 1);
            swap(a, end - 3, end - q - 2);
        }
    }

    /** Returns the pivot's final position times two, plus 1 if nothing had to move. */
    private static int partitionRight(int[] a, int begin, int end) {
        int pivot = a[begin];
        int first = begin;
        int last = end;
        do {
            first++;
        } while (a[first] < pivot);
        if (first - 1 == begin) {
            while (first < last) {
                last--;
                if (a[last] < pivot) {
                    break;
                }
            }
        } else {
            do {
                last--;
            } while (a[last] >= pivot);
        }
        boolean alreadyPartitioned = first >= last;
        while (first < last) {
            swap(a, first, last);
            do {
                first++;
            } while (a[first] < pivot);
            do {
                last--;
            } while (a[last] >= pivot);
        }
        int position = first - 1;
        a[begin] = a[position];
        a[position] = pivot;
        return position * 2 + (alreadyPartitioned ? 1 : 0);
    }

    private static int partitionLeft(int[] a, int begin, int end) {
        int pivot = a[begin];
        int first = begin;
        int last = end;
        do {
            last--;
        } while (pivot < a[last]);
        if (last + 1 == end) {
            while (first < last) {
                first++;
                if (pivot < a[first]) {
                    break;
                }
            }
        } else {
            do {
                first++;
            } while (pivot >= a[first]);
        }
        while (first < last) {
            swap(a, first, last);
            do {
                last--;
            } while (pivot < a[last]);
            do {
                first++;
            } while (pivot >= a[first]);
        }
        a[begin] = a[last];
        a[last] = pivot;
        return last;
    }

    /** Insertion sort that gives up after a few moves. Returns true if it finished. */
    private static boolean partialInsertion(int[] a, int begin, int end) {
        int moved = 0;
        for (int current = begin + 1; current < end; current++) {
            if (a[current] < a[current - 1]) {
                int x = a[current];
                int i = current;
                do {
                    a[i] = a[i - 1];
                    i--;
                } while (i != begin && x < a[i - 1]);
                a[i] = x;
                moved += current - i;
            }
            if (moved > 8) {
                return false;
            }
        }
        return true;
    }

    private static final int SAMPLE_BUCKETS = 16;
    private static final int OVERSAMPLING = 8;

    static void sample(int[] a) {
        sampleRange(a, new int[a.length], 0, a.length);
    }

    /** Quicksort with many pivots at once, taken from a sorted sample. */
    private static void sampleRange(int[] a, int[] aux, int lo, int hi) {
        int n = hi - lo;
        if (n <= 256) {
            insertionRange(a, lo, hi - 1);
            return;
        }
        int[] picks = new int[SAMPLE_BUCKETS * OVERSAMPLING];
        int step = div(n, picks.length);
        for (int i = 0; i < picks.length; i++) {
            picks[i] = a[lo + i * step];
        }
        insertionRange(picks, 0, picks.length - 1);
        int[] splitters = new int[SAMPLE_BUCKETS - 1];
        for (int i = 0; i < splitters.length; i++) {
            splitters[i] = picks[(i + 1) * OVERSAMPLING];
        }
        int[] start = new int[SAMPLE_BUCKETS + 1];
        for (int i = lo; i < hi; i++) {
            start[bucketOf(splitters, a[i]) + 1]++;
        }
        for (int b = 0; b < SAMPLE_BUCKETS; b++) {
            start[b + 1] += start[b];
        }
        int[] next = copy(start);
        for (int i = lo; i < hi; i++) {
            int b = bucketOf(splitters, a[i]);
            aux[lo + next[b]] = a[i];
            next[b]++;
        }
        arraycopy(aux, lo, a, lo, n);
        for (int b = 0; b < SAMPLE_BUCKETS; b++) {
            int from = lo + start[b];
            int to = lo + start[b + 1];
            if (to - from == n) {
                // The sample couldn't split this range, so it must be full of equal items.
                heapRange(a, from, to - 1);
            } else {
                sampleRange(a, aux, from, to);
            }
        }
    }

    private static int bucketOf(int[] splitters, int x) {
        int lo = 0;
        int hi = splitters.length;
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (splitters[mid] <= x) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        return lo;
    }
}
