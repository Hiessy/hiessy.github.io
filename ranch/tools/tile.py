# -*- coding: utf-8 -*-
"""A zoomed tile of the survey in house-frame meters.
Usage: python -I tile.py <out.png> a0 b0 a1 b1 [px per m] [ox oy] [skip=..]
a along the street (south to north), b depth. Default origin: the ground
floor's (frame.json SE). Other drawings pass their own origin (view pt)."""
import sys, json, subprocess
F = json.load(open("vec/frame.json")); K = F["K"]
out = sys.argv[1]
a0, b0, a1, b1 = [float(v) for v in sys.argv[2:6]]
rest = sys.argv[6:]
skip = "ELECTRICIDAD,Haches,Vista 2"
nums = []
for r in rest:
    if r.startswith("skip="):
        skip = r[5:]
    else:
        nums.append(float(r))
ppm = nums[0] if nums else 150
OX, OY = (nums[1], nums[2]) if len(nums) > 2 else F["O"]
x0, x1 = OX + a0 * K, OX + a1 * K
y0, y1 = OY - b1 * K, OY - b0 * K
cmd = [sys.executable, "-I", "tools/vdraw.py", "vec/vec.json", out, str(x0), str(y0), str(x1), str(y1), str(ppm / K),
       "grid=%s,%s,%s,%s" % (OX, OY, K, -K), "step=0.5", "skip=" + skip]
subprocess.run(cmd, check=True)
