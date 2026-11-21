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
