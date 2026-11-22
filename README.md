# pl-book

Textbook for COSE212: Programming Languages, built with [mdBook](https://rust-lang.github.io/mdBook/),
in English (`en/`) and Korean (`ko/`). Served at https://plrg.korea.ac.kr/pl-book/ (English by default).

Chapters are written in Korean first (`ko/` is the original) and then translated into `en/`.
Both books use the same file names, so the button on the top bar (`lang.js`) opens the same page
in the other language. When adding or renaming a chapter, do it in both `en/src/` and `ko/src/`.

```sh
./build.sh                              # build both into book/
python3 -m http.server -d book 8000     # preview at http://localhost:8000/
mdbook serve en --open                  # live preview of one language
```

## Writing conventions (Korean edition)

- When a Korean technical term first appears in a chapter, put the English term in parentheses
  right after it, e.g., 타입 안전성(type soundness), 서브타입(subtype). Do it again if the term
  comes back after a long gap within the chapter.
- Headings go at most three levels deep: chapter (`#`), section (`##`), subsection (`###`). Use a bold lead-in sentence instead of a fourth level.
- Do not add English in chapter/section titles or in `SUMMARY.md`, to keep titles and the
  sidebar short.
- Technical terms are written in Korean, transliterated if there is no good translation (e.g.,
  클로저, 컨티뉴에이션); acronyms such as CPS and ANF stay as they are. Code keywords stay in
  code font (e.g., `match`, `enum`).
- Use one Korean translation per term throughout the book, and keep `ko/src/glossary.md`
  (and its English counterpart `en/src/glossary.md`) up to date. Both are generated: add the
  term to `tools/glossary.tsv` and run `python3 tools/glossary.py apply`, which links each term
  to its first definition (`한국어(English)`) in reading order. `python3 tools/glossary.py
  candidates` lists such terms in the text that the glossary is still missing.
- Every code block that is a program starts with a comment naming its language, in that
  language's comment syntax: `/* FAE */`, `/* TFAE */`, `/* ANF */`, `/* CPS */`,
  `// JavaScript`, `# Python`, `// C++`, `-- Haskell`, and so on. Scala is the default
  language of the book (interpreters and type checkers), so Scala blocks are left unmarked,
  except where other languages appear next to them (e.g., the introduction). BNF, ASCII trees,
  and type equations need no header.
