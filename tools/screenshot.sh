#!/usr/bin/env bash
# ページをヘッドレス Chromium で撮影する。npm も Playwright も使わない。
# Claude が自分で見た目を確かめるためのもの（撮った PNG を Read で開いて見る）。
#
#   bash tools/screenshot.sh                        トップをスマホ幅とPC幅で撮る
#   bash tools/screenshot.sh projects/quote/ 375    指定ページを指定幅で撮る
#
# 出力先は $SHOT_DIR（既定 /tmp/portforio-shots）。リポジトリには置かない。
# 注意: 作業環境によっては外部（Unsplash の背景写真など）に繋がらず、画像が欠けて写る。
set -euo pipefail

cd "$(dirname "$0")/.."
PAGE="${1:-}"
WIDTHS="${2:-375 1280}"
PORT="${PORT:-3000}"
OUT="${SHOT_DIR:-/tmp/portforio-shots}"
mkdir -p "$OUT"

CHROME="${CHROME:-}"
for c in /opt/pw-browsers/chromium chromium chromium-browser google-chrome; do
  [ -n "$CHROME" ] && break
  command -v "$c" >/dev/null 2>&1 && CHROME="$c"
done
[ -n "$CHROME" ] || { echo "Chromium が見つかりません（CHROME=... で指定可）"; exit 1; }

if ! curl -s -o /dev/null "http://localhost:$PORT/"; then
  python3 -m http.server "$PORT" >/dev/null 2>&1 &
  trap 'kill $!' EXIT
  sleep 1
fi

name=$(echo "${PAGE:-top}" | tr '/' '_' | sed 's/_$//')
for w in $WIDTHS; do
  file="$OUT/${name}-${w}.png"
  "$CHROME" --headless --no-sandbox --disable-gpu --hide-scrollbars \
    --window-size="$w,900" --screenshot="$file" "http://localhost:$PORT/$PAGE" >/dev/null 2>&1
  echo "$file"
done
