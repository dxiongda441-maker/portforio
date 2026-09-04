#!/usr/bin/env bash
# トップページの背景写真(Unsplash)をローカルに取り込み、index.html の
# --bg-* 変数をローカルパスに書き換える。
#
#   bash tools/fetch-backgrounds.sh          既にある画像は再取得しない
#   bash tools/fetch-backgrounds.sh --force  すべて取得し直す
#
# cwebp があればWebPに変換し、無ければJPEGのまま保存する。
# 何度実行しても結果は同じになる。
set -euo pipefail

cd "$(dirname "$0")/.."
OUT_DIR="assets/backgrounds"
FORCE="${1:-}"

# 変数名 / Unsplashの写真ID / 取得幅
IMAGES=(
  "hero photo-1492571350019-22de08371fd3 2400"
  "spring photo-1522383225653-ed111181a951 2200"
  "summer photo-1507525428034-b723cf961d3e 2200"
  "autumn photo-1500530855697-b586d89ba3ee 2200"
  "winter photo-1483664852095-d6cc6870702d 2200"
  "contact photo-1500534314209-a25ddb2bd429 2200"
)

if command -v cwebp >/dev/null 2>&1; then
  EXT="webp"
else
  EXT="jpg"
  echo "cwebp が見つからないため JPEG のまま保存します（WebP にするには libwebp を入れてください）。"
fi

mkdir -p "$OUT_DIR"

for entry in "${IMAGES[@]}"; do
  read -r name id width <<<"$entry"
  target="$OUT_DIR/$name.$EXT"

  if [ -f "$target" ] && [ "$FORCE" != "--force" ]; then
    echo "skip     $target （--force で再取得）"
    continue
  fi

  url="https://images.unsplash.com/$id?auto=format&fit=crop&w=$width&q=90"
  tmp="$(mktemp)"
  echo "download $name ..."
  curl -fsSL --max-time 120 "$url" -o "$tmp"

  if [ "$EXT" = "webp" ]; then
    cwebp -quiet -q 82 "$tmp" -o "$target"
  else
    mv "$tmp" "$target"
  fi
  rm -f "$tmp"
  echo "saved    $target ($(du -h "$target" | cut -f1))"
done

python3 - "$OUT_DIR" "$EXT" <<'PY'
import pathlib, re, sys

out_dir, ext = sys.argv[1], sys.argv[2]
html = pathlib.Path("index.html")
source = html.read_text(encoding="utf-8")
updated = source

for name in ("hero", "spring", "summer", "autumn", "winter", "contact"):
    updated = re.sub(
        rf'--bg-{name}: url\("[^"]*"\);',
        f'--bg-{name}: url("./{out_dir}/{name}.{ext}");',
        updated,
    )

if updated == source:
    print("index.html: 変更なし（すでにローカルパスを指しています）")
else:
    html.write_text(updated, encoding="utf-8")
    print("index.html: --bg-* をローカルパスに書き換えました")
PY

echo
echo "完了しました。ローカルサーバーで表示を確認してください:"
echo "  python3 -m http.server 3000"
