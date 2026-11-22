"""Mark code blocks of the course languages as runnable (```fae -> ```fae,run).

    python3 tools/mark-runnable.py          # report only
    python3 tools/mark-runnable.py apply    # rewrite ko/src/*.md

A block is runnable when the language has an interpreter in interp.js and the interpreter parses the
block (after removing comments, as runner.js does). Fragments with `...`/`???` and blocks that do not
parse are left as they are. Needs node.
"""
import glob, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
LANGS = {
    'ae': 'AE', 'vae': 'VAE', 'f1vae': 'F1VAE', 'fvae': 'FVAE', 'fae': 'FAE', 'rfae': 'RFAE',
    'bfae': 'BFAE', 'mfae': 'MFAE', 'lfae': 'LFAE', 'kfae': 'KFAE', 'fae-cps': 'FAE',
    'tfae': 'TFAE', 'trfae': 'TRFAE', 'atfae': 'ATFAE', 'ptfae': 'PTFAE', 'stfae': 'STFAE',
    'tifae': 'TIFAE', 'minifsharp': 'MiniFSharp', 'minipython': 'MiniPython', 'miniscala': 'MiniScala',
}
FENCE = re.compile(r'^(\s*)```([a-z0-9-]+)(,run)?\s*$')

NODE = r'''
const vm = require("vm"), fs = require("fs");
const ctx = {}; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[1], "utf8") + ";globalThis.__I = interp;", ctx);
const jobs = JSON.parse(fs.readFileSync(0, "utf8"));
console.log(JSON.stringify(jobs.map(([l, c]) => { try { return String(ctx.__I[l](c)); } catch (e) { return "EXC " + e; } })));
'''

def strip(code):
    code = re.sub(r'/\*[\s\S]*?\*/', '', code)
    return re.sub(r'//[^\n]*', '', code).strip()

def blocks():
    for f in sorted(glob.glob(os.path.join(ROOT, 'ko', 'src', '*.md'))):
        lines = open(f).read().split('\n')
        i = 0
        while i < len(lines):
            m = FENCE.match(lines[i])
            if m and m.group(2) in LANGS:
                j = i + 1
                while not lines[j].strip().startswith('```'):
                    j += 1
                yield f, i, m, '\n'.join(lines[i + 1:j])
                i = j
            i += 1

def main():
    found = list(blocks())
    jobs, idx = [], []
    for k, (f, i, m, code) in enumerate(found):
        if '...' in code or '???' in code:
            continue
        jobs.append([LANGS[m.group(2)], strip(code)])
        idx.append(k)
    out = subprocess.run(['node', '-e', NODE, os.path.join(ROOT, 'interp.js')], input=json.dumps(jobs),
                         capture_output=True, text=True, check=True).stdout
    results = json.loads(out)
    runnable = set()
    for k, r in zip(idx, results):
        if not (r.startswith('[PLError] parse error') or r.startswith('EXC')):
            runnable.add(k)
    print(f'{len(found)} blocks, {len(runnable)} runnable')
    if len(sys.argv) > 1 and sys.argv[1] == 'verbose':
        for k, r in zip(idx, results):
            f, i, m, code = found[k]
            print(f'{os.path.basename(f)}:{i + 1} [{m.group(2)}] {r[:70]!r}')
    if len(sys.argv) > 1 and sys.argv[1] == 'apply':
        by_file = {}
        for k, (f, i, m, code) in enumerate(found):
            by_file.setdefault(f, []).append((i, m, k in runnable))
        for f, items in by_file.items():
            lines = open(f).read().split('\n')
            for i, m, run in items:
                lines[i] = f'{m.group(1)}```{m.group(2)}' + (',run' if run else '')
            open(f, 'w').write('\n'.join(lines))

if __name__ == '__main__':
    main()
