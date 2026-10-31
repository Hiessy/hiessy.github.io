"""Builds the Sorting Lab from its Java sources.

    python tools/sorting/build.py          # Dispatch.java, algorithms.js, sources.json
    python tools/sorting/build.py --wasm   # the same, then Java to WebAssembly with TeaVM

The JavaScript is translated from the Java line by line, so the race compares the
same logic on two runtimes. It only understands the plain subset the sorts are
written in: int, double and boolean, arrays of those, static methods and no
overloads. Declarations start a line, and int division goes through Util.div.
"""
import json, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SORT = ROOT / "sort"
JAVA = SORT / "java" / "src" / "main" / "java" / "com" / "hiessy" / "sort"
FILES = ["Util", "Data", "Exchange", "Selection", "Insertion", "Merge", "Quick",
         "Heaps", "Trees", "Distribution", "Networks", "Silly"]

# Java's int arithmetic and these JavaScript versions agree; the plain translation wouldn't.
NATIVE = {
    "div": "function div(x, y) {\n    return (x / y) | 0;\n}",
    "mul": "function mul(x, y) {\n    return Math.imul(x, y);\n}",
    "clz": "function clz(x) {\n    return Math.clz32(x);\n}",
    "arraycopy": """function arraycopy(src, from, dst, to, length) {
    if (src === dst && from < to) {
        for (let i = length - 1; i >= 0; i--) {
            dst[to + i] = src[from + i];
        }
    } else {
        for (let i = 0; i < length; i++) {
            dst[to + i] = src[from + i];
        }
    }
}""",
}

SIGNATURE = re.compile(r"^(?:private |public )?static (?:final )?[\w\[\]]+ (\w+)\((.*)\) \{$")
FIELD = re.compile(r"^(?:private |public )?static final [\w\[\]]+ (\w+) = (.*);$")
DECLARATION = re.compile(r"^(\s*)(?:final )?(?:int|double|boolean)(?:\[\])* (?=\w)")
ARRAY_TYPES = {"int": "Int32Array", "boolean": "Uint8Array", "double": "Float64Array"}


def closing(text, start, opener, closer):
    """Index of the bracket that closes the one at text[start]."""
    depth = 0
    for i in range(start, len(text)):
        if text[i] == opener:
            depth += 1
        elif text[i] == closer:
            depth -= 1
            if depth == 0:
                return i
    raise ValueError(f"unbalanced {opener} in: {text}")


def translate_new(line):
    while True:
        m = re.search(r"new (int|boolean|double)\[", line)
        if not m:
            return line
        end = closing(line, m.end() - 1, "[", "]")
        size = line[m.end():end]
        if line[end + 1:end + 3] == "[]":
            line = f"{line[:m.start()]}new Array({size}){line[end + 3:]}"
        else:
            line = f"{line[:m.start()]}new {ARRAY_TYPES[m.group(1)]}({size}){line[end + 1:]}"


def translate_cast(line):
    """(int) x becomes (x | 0), for the single value the cast applies to."""
    while "(int) " in line:
        start = line.index("(int) ")
        i = start + 6
        while True:
            if line[i] == "(":
                i = closing(line, i, "(", ")") + 1
            elif line[i] == "[":
                i = closing(line, i, "[", "]") + 1
            elif line[i].isalnum() or line[i] in "._":
                i += 1
            else:
                break
        line = f"{line[:start]}({line[start + 6:i]} | 0){line[i:]}"
    return line


def translate_line(line):
    stripped = line.strip()
    if stripped.startswith(("//", "/*", "*")):
        return line
    line = translate_new(line)
    line = line.replace("(double) ", "")
    line = translate_cast(line)
    line = DECLARATION.sub(r"\1let ", line)
    line = re.sub(r"\bfor \((?:int|double) ", "for (let ", line)
    return line


def parse(path):
    """The members of a class: dicts with name, the Java text and the JavaScript text."""
    lines = path.read_text(encoding="utf-8").splitlines()
    start = next(i for i, l in enumerate(lines) if re.match(r"(public )?final class ", l))
    end = len(lines) - 1 - lines[::-1].index("}")
    body = [l[4:] if l.startswith("    ") else l for l in lines[start + 1:end]]

    members, pending, i = [], [], 0
    while i < len(body):
        line = body[i]
        field = FIELD.match(line)
        method = SIGNATURE.match(line)
        if field:
            value = field.group(2).replace("{", "[").replace("}", "]")
            members.append({"name": field.group(1), "java": "\n".join(pending + [line]),
                            "js": "\n".join(pending + [f"const {field.group(1)} = {value};"])})
            pending = []
        elif method:
            close = next(j for j in range(i + 1, len(body)) if body[j] == "}")
            name = method.group(1)
            params = ", ".join(p.split()[-1] for p in method.group(2).split(",") if p.strip())
            if name in NATIVE:
                js = NATIVE[name]
            else:
                inner = [translate_line(l) for l in body[i + 1:close]]
                js = "\n".join([f"function {name}({params}) {{"] + inner + ["}"])
            members.append({"name": name, "java": "\n".join(pending + body[i:close + 1]),
                            "js": "\n".join(pending + [js])})
            pending = []
            i = close
        elif line.strip():
            pending.append(line)
        i += 1
    return members


def helpers_of(entry, members):
    """The members an algorithm calls, directly or not, leaving out the shared Util ones."""
    found, queue = [], [entry]
    while queue:
        name = queue.pop(0)
        if name in found:
            continue
        found.append(name)
        for other, member in members.items():
            if other not in found and member["file"] != "Util" and member["file"] != "Data" \
                    and re.search(rf"\b{other}\b", members[name]["java"]):
                queue.append(other)
    return found


def write_dispatch(catalog, members):
    cases = "\n".join(
        f"            case {i}:\n                {members[e['id']]['file']}.{e['id']}(a);\n                return;"
        for i, e in enumerate(catalog))
    ids = ", ".join(f'"{e["id"]}"' for e in catalog)
    limits = ", ".join(str(min(e["raceMax"], 2000)) for e in catalog)
    (JAVA / "Dispatch.java").write_text(f"""// Generated by tools/sorting/build.py from sort/catalog.json. Do not edit.
package com.hiessy.sort;

final class Dispatch {{
    static final String[] IDS = {{{ids}}};
    static final int[] TEST_LIMITS = {{{limits}}};

    static void sort(int algorithm, int[] a) {{
        switch (algorithm) {{
{cases}
            default:
                throw new IllegalArgumentException();
        }}
    }}
}}
""", encoding="utf-8", newline="\n")


def write_javascript(catalog, members):
    code = "\n\n".join(m["js"] for m in members.values())
    names = ",\n".join(f"        {e['id']}" for e in catalog)
    (SORT / "js" / "algorithms.js").write_text(f"""// Generated by tools/sorting/build.py from sort/java. Do not edit.
const Sorts = (function () {{
'use strict';

{code}

return {{
    sorts: {{
{names}
    }},
    generate,
    checksum,
    isSorted
}};
}})();

if (typeof module !== 'undefined') {{
    module.exports = Sorts;
}}
""", encoding="utf-8", newline="\n")


def write_sources(catalog, members):
    sources = {}
    for e in catalog:
        chain = helpers_of(e["id"], members)
        sources[e["id"]] = {
            "java": "\n\n".join(members[n]["java"] for n in chain),
            "js": "\n\n".join(members[n]["js"] for n in chain),
        }
    (SORT / "js" / "sources.json").write_text(
        json.dumps(sources, ensure_ascii=False, separators=(",", ":")), encoding="utf-8", newline="\n")


def main():
    catalog = json.loads((SORT / "catalog.json").read_text(encoding="utf-8"))
    members = {}
    for name in FILES:
        for member in parse(JAVA / f"{name}.java"):
            if member["name"] in members:
                raise SystemExit(f"{member['name']} is defined twice: JavaScript has one namespace")
            members[member["name"]] = dict(member, file=name)
    missing = [e["id"] for e in catalog if e["id"] not in members]
    if missing:
        raise SystemExit(f"in the catalog but not in the Java: {missing}")

    write_dispatch(catalog, members)
    write_javascript(catalog, members)
    write_sources(catalog, members)
    print(f"{len(catalog)} algorithms, {len(members)} members")

    if "--wasm" in sys.argv:
        maven = shutil.which("mvn") or shutil.which("mvn.cmd")
        subprocess.run([maven, "-B", "-q", "package"], cwd=SORT / "java", check=True)
        print("wasm:", (SORT / "wasm" / "sort.wasm").stat().st_size, "bytes")


if __name__ == "__main__":
    main()
