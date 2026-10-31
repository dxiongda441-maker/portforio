#!/usr/bin/env bash
# サイトの公開URLを一括で書き換える（canonical・og:url・og:image・sitemap・robots・README）。
# 公開先を移したとき（GitHub Pages → Cloudflare、独自ドメインの取得など）に1回だけ実行する。
#
#   bash tools/set-site-url.sh https://example.com
#
# - 末尾の / は付けない。サブディレクトリ付き（https://example.com/portfolio）も可
# - PWA の作品で index.html が変わったら、Service Worker の CACHE_NAME の版数も +1 する（CLAUDE.md ルール5）
# - docs/decisions/ は「当時の記録」なので書き換えない
set -euo pipefail

cd "$(dirname "$0")/.."
NEW="${1:?使い方: bash tools/set-site-url.sh https://新しいURL}"
NEW="${NEW%/}"
OLD="${OLD_URL:-https://dxiongda441-maker.github.io/portforio}"
case "$NEW" in https://*) ;; *) echo "https:// で始まるURLを指定してください"; exit 1 ;; esac

files=$(grep -rlF "$OLD" --exclude-dir=.git --exclude-dir=docs --exclude-dir=tools . || true)
[ -n "$files" ] || { echo "$OLD を含むファイルはありません（書き換え済み？）"; exit 0; }

for f in $files; do
  OLD="$OLD" NEW="$NEW" perl -pi -e 's/\Q$ENV{OLD}\E/$ENV{NEW}/g' "$f"
  echo "書き換え: $f"
done

# 404.html はどの階層でも出るため、ルートからの絶対パス（/portforio/...）で書いてある。
# 新しいURLのパス部分（ドメイン直下なら /）に合わせる
OLD_PATH="/${OLD#https://*/}/"
rest="${NEW#https://}"; NEW_PATH="/"
case "$rest" in */*) NEW_PATH="/${rest#*/}/" ;; esac
if [ "$OLD_PATH" != "$NEW_PATH" ] && grep -qF "\"$OLD_PATH" 404.html; then
  OP="$OLD_PATH" NP="$NEW_PATH" perl -pi -e 's/"\Q$ENV{OP}\E/"$ENV{NP}/g' 404.html
  echo "書き換え: ./404.html（$OLD_PATH → $NEW_PATH）"
fi

# index.html が変わった PWA は CACHE_NAME を上げる
for sw in projects/*/sw.js projects/*/service-worker.js; do
  [ -f "$sw" ] || continue
  dir=$(dirname "$sw")
  echo "$files" | grep -qx "./$dir/index.html" || continue
  ver=$(grep -o 'CACHE_PREFIX}v[0-9]*' "$sw" | sed 's/.*v//')
  perl -pi -e "s/CACHE_PREFIX\}v$ver\`/CACHE_PREFIX}v$((ver + 1))\`/" "$sw"
  echo "版数を上げた: $sw  v$ver → v$((ver + 1))"
done

echo
echo "残っている旧URL（docs/ と tools/ 以外）:"
grep -rnF "$OLD" --exclude-dir=.git --exclude-dir=docs --exclude-dir=tools . || echo "  なし"
echo "CLAUDE.md の「公開URL」「デプロイ」の行は内容も変わるので手で直すこと。"
