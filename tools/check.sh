#!/usr/bin/env bash
# CLAUDE.md の「常に守るルール」を機械的に確かめる。変更後・コミット前に実行する。
#
#   bash tools/check.sh
#
# 何も書き換えない。問題があれば NG を出して終了コード 1 で終わる。
set -uo pipefail

cd "$(dirname "$0")/.."
FAIL=0
ok() { echo "  ok  $1"; }
ng() { echo "  NG  $1"; FAIL=1; }

echo "[index.html は自己完結している]"
n=$(grep -c '<script' index.html)
[ "$n" -eq 0 ] && ok "<script> が 0 個" || ng "<script> が $n 個ある（0 個のはず）"
n=$(grep -c 'rel="stylesheet"' index.html)
[ "$n" -eq 0 ] && ok "外部 CSS が 0 個" || ng "外部 CSS が $n 個ある（0 個のはず）"
for f in style.css main.js; do
  [ -e "$f" ] && ng "$f が復活している（0001 で削除済み）" || ok "$f は存在しない"
done

echo "[作品カードのリンク先と sitemap]"
for slug in $(grep -o 'href="\(\./\)\?projects/[^/"]*' index.html | sed 's|.*projects/||' | sort -u); do
  [ -f "projects/$slug/index.html" ] && ok "カード → projects/$slug/" || ng "カードのリンク先 projects/$slug/ が無い"
done
for d in projects/*/; do
  slug=$(basename "$d")
  grep -q "projects/$slug/" sitemap.xml || ng "sitemap.xml に projects/$slug/ が無い"
  grep -Eq "href=\"(\./)?projects/$slug/" index.html || ng "index.html に projects/$slug/ のカードが無い"
  f="$d/index.html"
  for pat in 'name="description"' 'rel="canonical"' 'og:image' 'twitter:card' 'href="../../'; do
    grep -q "$pat" "$f" || ng "projects/$slug/index.html に $pat が無い"
  done
done
ok "sitemap / カード / 共通 <head> を確認した（NG が無ければ全件一致）"

echo "[PWA の Service Worker]"
for sw in projects/*/sw.js projects/*/service-worker.js; do
  [ -f "$sw" ] || continue
  prefix=$(grep -o 'CACHE_PREFIX = "[^"]*"' "$sw" | sed 's/.*"\(.*\)"/\1/')
  if [ -z "$prefix" ]; then ng "$sw に CACHE_PREFIX が無い"; continue; fi
  grep -q 'CACHE_NAME = `${CACHE_PREFIX}v[0-9]*`' "$sw" || ng "$sw の CACHE_NAME が CACHE_PREFIX 由来でない"
  grep -q 'startsWith(CACHE_PREFIX)' "$sw" || ng "$sw の activate が startsWith(CACHE_PREFIX) で絞っていない（0003）"
  ver=$(grep -o 'CACHE_PREFIX}v[0-9]*' "$sw" | sed 's/.*v//')
  ok "$sw  prefix=$prefix  v$ver"
done

# 未コミットの変更がある PWA で CACHE_NAME が上がっていなければ警告する
if git rev-parse --git-dir >/dev/null 2>&1; then
  for sw in projects/*/sw.js projects/*/service-worker.js; do
    [ -f "$sw" ] || continue
    dir=$(dirname "$sw")
    base=$(git merge-base HEAD origin/main 2>/dev/null || echo HEAD)
    if [ -n "$(git diff --name-only "$base" -- "$dir" ":(exclude)$dir/*.md")" ] && ! git diff "$base" -- "$sw" | grep -q '^+.*CACHE_NAME'; then
      ng "$dir を変更したのに $sw の CACHE_NAME が上がっていない"
    fi
  done
fi

echo
if [ "$FAIL" -eq 0 ]; then echo "すべて OK"; else echo "NG があります"; exit 1; fi
