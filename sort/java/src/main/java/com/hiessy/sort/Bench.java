package com.hiessy.sort;

import org.teavm.jso.JSExport;

/** What the page calls in WebAssembly. Numbers only, so nothing crosses the boundary but ints. */
public final class Bench {
    private static int[] master = new int[0];
    private static int[] work = new int[0];

    private Bench() {
    }

    public static void main(String[] args) {
    }

    @JSExport
    public static void prepare(int n, int pattern, int seed) {
        master = Data.generate(n, pattern, seed);
        work = new int[n];
    }

    @JSExport
    public static void reset() {
        System.arraycopy(master, 0, work, 0, master.length);
    }

    @JSExport
    public static void sort(int algorithm) {
        Dispatch.sort(algorithm, work);
    }

    @JSExport
    public static int checksum() {
        return Data.checksum(work);
    }
}
