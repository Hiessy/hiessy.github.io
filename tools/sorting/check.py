"""Proves both languages sort correctly and identically.

Runs every algorithm on 31 sizes, 8 input shapes and 2 seeds in real Java and in
Node, checks each result against the language's built-in sort, and compares the
two outputs line by line.

    python tools/sorting/build.py --wasm
    python tools/sorting/check.py
"""
import pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
CLASSES = ROOT / "sort" / "java" / "target" / "classes"


def run(command, label):
    done = subprocess.run(command, capture_output=True, text=True)
    lines = done.stdout.splitlines()
    wrong = [l for l in lines if l.endswith("WRONG")]
    print(f"{label}: {len(lines)} cases, {len(wrong)} wrong")
    for line in wrong[:20]:
        print("  ", line)
    if done.stderr.strip():
        print("  ", done.stderr.strip()[-1500:])
    return lines


def main():
    java = run(["java", "-cp", str(CLASSES), "com.hiessy.sort.Check"], "java")
    node = run(["node", str(ROOT / "tools" / "sorting" / "check.js")], "node")
    different = [(j, n) for j, n in zip(java, node) if j != n]
    print(f"different between languages: {len(different)}")
    for j, n in different[:10]:
        print("  ", j, "|", n)
    if not java or len(java) != len(node) or different or any(l.endswith("WRONG") for l in java + node):
        sys.exit(1)
    print("all good")


if __name__ == "__main__":
    main()
