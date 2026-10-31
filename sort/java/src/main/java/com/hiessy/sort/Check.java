package com.hiessy.sort;

import java.util.Arrays;

/**
 * Runs every sort on every input and prints a checksum per case, which
 * tools/sorting/check.py compares with the JavaScript. Never reaches the page.
 */
public final class Check {
    static final int[] SIZES = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 15, 16, 17, 31, 32, 33, 40, 63, 64, 65,
        127, 128, 129, 255, 256, 257, 500, 1000, 1024, 1500, 2000};

    private Check() {
    }

    public static void main(String[] args) {
        int failures = 0;
        for (int id = 0; id < Dispatch.IDS.length; id++) {
            for (int n : SIZES) {
                if (n > Dispatch.TEST_LIMITS[id]) {
                    continue;
                }
                for (int pattern = 0; pattern < 8; pattern++) {
                    for (int seed = 1; seed <= 2; seed++) {
                        int[] a = Data.generate(n, pattern, seed);
                        int[] expected = a.clone();
                        Arrays.sort(expected);
                        Dispatch.sort(id, a);
                        boolean ok = Arrays.equals(a, expected);
                        if (!ok) {
                            failures++;
                        }
                        System.out.println(Dispatch.IDS[id] + " " + n + " " + pattern + " " + seed + " "
                                + Data.checksum(a) + (ok ? "" : " WRONG"));
                    }
                }
            }
        }
        if (failures > 0) {
            System.err.println(failures + " wrong results");
            System.exit(1);
        }
    }
}
