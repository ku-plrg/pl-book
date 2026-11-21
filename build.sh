#!/bin/sh
# Builds both books into book/ (book/en, book/ko) with a redirect at book/index.html.
set -e
cd "$(dirname "$0")"
rm -rf book
mdbook build en -d book/en
mdbook build ko -d book/ko
cp index.html book/
