package com.hiessy.sort;

import static com.hiessy.sort.Util.*;

/**
 * Sorts that build a search tree and read it back in order. Nodes live in parallel
 * arrays, numbered from 1, so that 0 means "no node".
 */
final class Trees {
    /** Walks the tree in order with an explicit stack, because a tree can be n levels deep. */
    private static void readInOrder(int[] key, int[] left, int[] right, int root, int[] out) {
        int[] stack = new int[out.length + 1];
        int top = 0;
        int node = root;
        int k = 0;
        while (node != 0 || top > 0) {
            while (node != 0) {
                stack[top] = node;
                top++;
                node = left[node];
            }
            top--;
            node = stack[top];
            out[k] = key[node];
            k++;
            node = right[node];
        }
    }

    private static int rotateRight(int[] left, int[] right, int y) {
        int x = left[y];
        left[y] = right[x];
        right[x] = y;
        return x;
    }

    private static int rotateLeft(int[] left, int[] right, int x) {
        int y = right[x];
        right[x] = left[y];
        left[y] = x;
        return y;
    }

    static void tree(int[] a) {
        int n = a.length;
        if (n < 2) {
            return;
        }
        int[] key = new int[n + 1];
        int[] left = new int[n + 1];
        int[] right = new int[n + 1];
        key[1] = a[0];
        for (int i = 2; i <= n; i++) {
            key[i] = a[i - 1];
            int node = 1;
            while (true) {
                if (key[i] < key[node]) {
                    if (left[node] == 0) {
                        left[node] = i;
                        break;
                    }
                    node = left[node];
                } else {
                    if (right[node] == 0) {
                        right[node] = i;
                        break;
                    }
                    node = right[node];
                }
            }
        }
        readInOrder(key, left, right, 1, a);
    }

    static void avl(int[] a) {
        int n = a.length;
        int[] key = new int[n + 1];
        int[] left = new int[n + 1];
        int[] right = new int[n + 1];
        int[] height = new int[n + 1];
        int root = 0;
        for (int i = 1; i <= n; i++) {
            key[i] = a[i - 1];
            root = avlInsert(key, left, right, height, root, i);
        }
        readInOrder(key, left, right, root, a);
    }

    private static int avlInsert(int[] key, int[] left, int[] right, int[] height, int node, int item) {
        if (node == 0) {
            height[item] = 1;
            return item;
        }
        if (key[item] < key[node]) {
            left[node] = avlInsert(key, left, right, height, left[node], item);
        } else {
            right[node] = avlInsert(key, left, right, height, right[node], item);
        }
        updateHeight(left, right, height, node);
        int balance = height[left[node]] - height[right[node]];
        if (balance > 1) {
            if (key[item] >= key[left[node]]) {
                left[node] = avlLeft(left, right, height, left[node]);
            }
            return avlRight(left, right, height, node);
        }
        if (balance < -1) {
            if (key[item] < key[right[node]]) {
                right[node] = avlRight(left, right, height, right[node]);
            }
            return avlLeft(left, right, height, node);
        }
        return node;
    }

    private static void updateHeight(int[] left, int[] right, int[] height, int node) {
        height[node] = 1 + Math.max(height[left[node]], height[right[node]]);
    }

    private static int avlRight(int[] left, int[] right, int[] height, int y) {
        int x = rotateRight(left, right, y);
        updateHeight(left, right, height, y);
        updateHeight(left, right, height, x);
        return x;
    }

    private static int avlLeft(int[] left, int[] right, int[] height, int x) {
        int y = rotateLeft(left, right, x);
        updateHeight(left, right, height, x);
        updateHeight(left, right, height, y);
        return y;
    }

    static void splay(int[] a) {
        int n = a.length;
        int[] key = new int[n + 1];
        int[] left = new int[n + 1];
        int[] right = new int[n + 1];
        int[] parent = new int[n + 1];
        int root = 0;
        for (int i = 1; i <= n; i++) {
            key[i] = a[i - 1];
            if (root != 0) {
                int node = root;
                while (true) {
                    if (key[i] < key[node]) {
                        if (left[node] == 0) {
                            left[node] = i;
                            break;
                        }
                        node = left[node];
                    } else {
                        if (right[node] == 0) {
                            right[node] = i;
                            break;
                        }
                        node = right[node];
                    }
                }
                parent[i] = node;
                splayToRoot(left, right, parent, i);
            }
            root = i;
        }
        readInOrder(key, left, right, root, a);
    }

    private static void splayToRoot(int[] left, int[] right, int[] parent, int x) {
        while (parent[x] != 0) {
            int p = parent[x];
            int g = parent[p];
            if (g == 0) {
                rotateUp(left, right, parent, x);
            } else if ((left[g] == p) == (left[p] == x)) {
                rotateUp(left, right, parent, p);
                rotateUp(left, right, parent, x);
            } else {
                rotateUp(left, right, parent, x);
                rotateUp(left, right, parent, x);
            }
        }
    }

    private static void rotateUp(int[] left, int[] right, int[] parent, int x) {
        int p = parent[x];
        int g = parent[p];
        if (left[p] == x) {
            left[p] = right[x];
            if (right[x] != 0) {
                parent[right[x]] = p;
            }
            right[x] = p;
        } else {
            right[p] = left[x];
            if (left[x] != 0) {
                parent[left[x]] = p;
            }
            left[x] = p;
        }
        parent[p] = x;
        parent[x] = g;
        if (g != 0) {
            if (left[g] == p) {
                left[g] = x;
            } else {
                right[g] = x;
            }
        }
    }

    static void treap(int[] a) {
        int n = a.length;
        int[] key = new int[n + 1];
        int[] left = new int[n + 1];
        int[] right = new int[n + 1];
        int[] priority = new int[n + 1];
        int seed = -1640531527;
        int root = 0;
        for (int i = 1; i <= n; i++) {
            key[i] = a[i - 1];
            seed = nextRandom(seed);
            priority[i] = seed;
            root = treapInsert(key, left, right, priority, root, i);
        }
        readInOrder(key, left, right, root, a);
    }

    private static int treapInsert(int[] key, int[] left, int[] right, int[] priority, int node, int item) {
        if (node == 0) {
            return item;
        }
        if (key[item] < key[node]) {
            left[node] = treapInsert(key, left, right, priority, left[node], item);
            if (priority[left[node]] > priority[node]) {
                return rotateRight(left, right, node);
            }
        } else {
            right[node] = treapInsert(key, left, right, priority, right[node], item);
            if (priority[right[node]] > priority[node]) {
                return rotateLeft(left, right, node);
            }
        }
        return node;
    }

    /** Builds a Cartesian tree in O(n), then pulls items out with a heap of candidates. */
    static void cartesian(int[] a) {
        int n = a.length;
        if (n < 2) {
            return;
        }
        int[] key = new int[n + 1];
        int[] left = new int[n + 1];
        int[] right = new int[n + 1];
        int[] spine = new int[n + 1];
        int top = 0;
        for (int i = 1; i <= n; i++) {
            key[i] = a[i - 1];
            int last = 0;
            while (top > 0 && key[spine[top - 1]] > key[i]) {
                top--;
                last = spine[top];
            }
            left[i] = last;
            if (top > 0) {
                right[spine[top - 1]] = i;
            }
            spine[top] = i;
            top++;
        }
        int[] heap = new int[n + 1];
        heap[0] = spine[0];
        int count = 1;
        for (int k = 0; k < n; k++) {
            int node = heap[0];
            a[k] = key[node];
            count--;
            heap[0] = heap[count];
            candidateDown(heap, key, count);
            if (left[node] != 0) {
                candidateUp(heap, key, count, left[node]);
                count++;
            }
            if (right[node] != 0) {
                candidateUp(heap, key, count, right[node]);
                count++;
            }
        }
    }

    private static void candidateDown(int[] heap, int[] key, int count) {
        int i = 0;
        while (true) {
            int child = 2 * i + 1;
            if (child >= count) {
                return;
            }
            if (child + 1 < count && key[heap[child + 1]] < key[heap[child]]) {
                child++;
            }
            if (key[heap[child]] >= key[heap[i]]) {
                return;
            }
            swap(heap, i, child);
            i = child;
        }
    }

    private static void candidateUp(int[] heap, int[] key, int count, int node) {
        int i = count;
        heap[i] = node;
        while (i > 0) {
            int parent = (i - 1) >> 1;
            if (key[heap[parent]] <= key[heap[i]]) {
                return;
            }
            swap(heap, i, parent);
            i = parent;
        }
    }
}
