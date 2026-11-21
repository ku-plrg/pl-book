"""Glossary generator for the Korean edition.

    python3 tools/glossary.py              # report where each term is first defined
    python3 tools/glossary.py candidates   # list ko(en) terms in the text missing from glossary.tsv
    python3 tools/glossary.py apply        # insert <a id="g-..."> anchors, rewrite both glossary.md files

Terms live in tools/glossary.tsv (Korean<TAB>English).
"""
import re, os, sys, json, unicodedata
HERE = os.path.dirname(os.path.abspath(__file__))
root = os.path.join(HERE, '..', 'ko', 'src')
summ = open(f'{root}/SUMMARY.md').read()
order = [(t, f) for t, f in re.findall(r'\[([^\]]+)\]\(\./([^)]+\.md)\)', summ) if f != 'glossary.md']
terms = [l.rstrip('\n').split('\t') for l in open(os.path.join(HERE, 'glossary.tsv')) if l.strip()]
APPLY = len(sys.argv) > 1 and sys.argv[1] == 'apply'
ANCH = re.compile(r'<a id="g-[^"]*"></a>')

def slug(s):
    s = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', s)
    s = re.sub(r'<[^>]+>', '', s).strip().lower()
    return ''.join(c for c in s if c.isalnum() or c in ' _-').replace(' ', '-')
def gslug(en):
    s = unicodedata.normalize('NFKD', en.split(',')[0].lower())
    s = re.sub(r'\(.*?\)', '', s)
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return 'g-' + (s or 'x')
def plain(t):
    t = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', t)
    return re.sub(r'[`*]', '', t).strip()

docs = {}
for title, f in order:
    lines = [ANCH.sub('', l) for l in open(f'{root}/{f}').read().split('\n')]
    info = []; incode = False; insvg = 0; seen = {}; cur = None
    for l in lines:
        s = l.strip()
        if s.startswith('```'): incode = not incode; info.append(None); continue
        if incode: info.append(None); continue
        if '<svg' in l: insvg += 1
        if insvg:
            if '</svg>' in l: insvg -= 1
            info.append(None); continue
        m = re.match(r'(#{1,6})\s+(.*)', l)
        if m:
            sl = slug(m.group(2))
            if sl in seen: seen[sl] += 1; sl = f'{sl}-{seen[sl]}'
            else: seen[sl] = 0
            if len(m.group(1)) >= 2: cur = (plain(m.group(2)), sl)
            info.append(('H', cur)); continue
        info.append(('P', cur))
    docs[f] = (title, lines, info)

def scrub(l):  # hide math, inline code, link targets, html
    l = re.sub(r'\\\\\(.*?\\\\\)|`[^`]*`|\]\([^)]*\)|<[^>]+>', lambda m: ' ' * len(m.group(0)), l)
    return l

def locate(ko, en):
    enk = re.sub(r'\s*\(.*?\)$', '', en)
    k = re.escape(ko); e = re.escape(enk)
    pats = [
        re.compile(r'(\*\*)?' + k + r'(\*\*)?\s*\(\s*' + e, re.I),          # ko(en
        re.compile(r'(\*\*)?' + k + r'(\*\*)?[^.\n]{0,12}' + e, re.I),      # ko ..., en
        re.compile(r'\*\*' + k),                                           # **ko
        re.compile(r'(\*\*)?' + k + r'(\*\*)?\s*\(', re.I),                 # ko( other
        re.compile(k),
    ]
    for pi, p in enumerate(pats):
        for title, f in order:
            t, lines, info = docs[f]
            for i, l in enumerate(lines):
                if info[i] is None: continue
                if info[i][0] == 'H' and pi < 4: continue
                m = p.search(scrub(l))
                if m: return dict(rank=pi, f=f, title=t, line=i, col=m.start(), kind=info[i][0], sec=info[i][1])
    return None

res = []; inserts = {}
used = set()
for ko, en in terms:
    r = locate(ko, en)
    if not r: res.append((ko, en, None)); continue
    if r['kind'] == 'H':
        target = r['sec'][1]
    else:
        a = gslug(en)
        while a in used: a += '-'
        used.add(a); target = a
        inserts.setdefault(r['f'], []).append((r['line'], r['col'], a))
    sec = r['sec'][0] if r['sec'] else None
    label = r['title'] + (f' › {sec}' if sec and sec != r['title'] else '')
    res.append((ko, en, dict(r, target=target, label=label)))

nf = [(a, b) for a, b, r in res if not r]
print('found', len(res) - len(nf), 'notfound', len(nf), ':', ', '.join(f'{a}({b})' for a, b in nf))
print('by rank', {k: sum(1 for *_, r in res if r and r['rank'] == k) for k in range(5)})
for a, b, r in res:
    if r and r['rank'] >= 3: print('  weak', a, '->', r['label'])

# harvest ko(en) patterns not in glossary
known = {a for a, b in terms}
cand = {}
for title, f in order:
    t, lines, info = docs[f]
    for i, l in enumerate(lines):
        if not info[i] or info[i][0] != 'P': continue
        for m in re.finditer(r'(?:\*\*)?([가-힣][가-힣0-9 \-]{0,14}?)(?:\*\*)?\s?\(([A-Za-z][A-Za-z \-]{2,40})\)', scrub(l)):
            ko = m.group(1).strip()
            if ko not in known: cand.setdefault(ko, (m.group(2), f))
if len(sys.argv) > 1 and sys.argv[1] == 'candidates':
    for ko, (en, f) in sorted(cand.items()): print(f'{ko}\t{en}\t{f}')

if APPLY:
    for f, ins in inserts.items():
        lines = docs[f][1]
        for line, col, a in sorted(ins, reverse=True):
            l = lines[line]; lines[line] = l[:col] + f'<a id="{a}"></a>' + l[col:]
        open(f'{root}/{f}', 'w').write('\n'.join(lines))
    # glossary
    CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
    MAP = {'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ'}
    def group(ko):
        c = ko[0]
        if '가' <= c <= '힣':
            g = CHO[(ord(c) - 0xAC00) // 588]; return MAP.get(g, g)
        return '기타'
    items = sorted([x for x in res if x[2]], key=lambda x: (group(x[0]) == '기타', x[0]))
    groups = []
    for ko, en, r in items:
        g = group(ko)
        if not groups or groups[-1][0] != g: groups.append((g, []))
        groups[-1][1].append(f"- **{ko}** ({en}) · [{r['label']}](./{r['f']}#{r['target']})")
    out = ['# 용어집', '',
           '이 책에서 쓰는 한국어 용어와 대응하는 영어 용어입니다. 본문에서는 각 장에서 처음 나올 때 영어를 괄호로 함께 적습니다. 링크를 누르면 그 용어가 처음 나와 설명되는 곳으로 갑니다.', '',
           ' · '.join(f'[{g}](#{g})' for g, _ in groups), '']
    for g, ls in groups:
        out += [f'## {g}', ''] + ls + ['']
    open(f'{root}/glossary.md', 'w').write('\n'.join(out))
    # English glossary (no links until the English chapters are written)
    def egrp(en):
        c = en[0].upper(); return c if 'A' <= c <= 'Z' else 'Other'
    eg = []
    for ko, en in sorted(terms, key=lambda x: (egrp(x[1]) == 'Other', x[1].lower())):
        g = egrp(en)
        if not eg or eg[-1][0] != g: eg.append((g, []))
        eg[-1][1].append(f'- **{en}** ({ko})')
    out = ['# Glossary', '',
           'English terms used in this book and the Korean terms used in the Korean edition. Links to the place where each term is first defined will be added once the English chapters are written.', '',
           ' · '.join(f'[{g}](#{g.lower()})' for g, _ in eg), '']
    for g, ls in eg:
        out += [f'## {g}', ''] + ls + ['']
    open(os.path.join(HERE, '..', 'en', 'src', 'glossary.md'), 'w').write('\n'.join(out))
