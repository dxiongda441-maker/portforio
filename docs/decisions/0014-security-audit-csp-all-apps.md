# 0014. 全作品に CSP を入れ、利用者入力を innerHTML に入れる箇所はエスケープする

- **日付**: 2026-11-21
- **状態**: 採用
- **関係する場所**: `projects/*/index.html`, `projects/wabisabi/app.js`, `projects/reading-shelf/app.js`

## 背景

PHP・Node.js の脆弱性や大手の個人情報漏洩が続いたため、これまでの作品を一通り点検した。

- サーバー側のプログラム・npm 依存・外部 CDN のスクリプトは **0**。PHP/Node.js の脆弱性やパッケージ汚染の対象外。
- リポジトリと履歴に API キー等の秘密情報は無い。画像に位置情報（EXIF GPS）も無い。
- 全作品が同じオリジン（`dxiongda441-maker.github.io`）にあるため、**どれか1作品で XSS が起きると、
  glow-log の体重・写真など他作品の端末内データまで読まれうる**。ここが一番の弱点。
- `wabisabi` はテーマ名・お題・録音タイトルを、`reading-shelf` は表紙画像の値を、エスケープせずに innerHTML に入れていた。
- CSP（`<meta>`）があったのは glow-log / maru-log / 3つのクエストだけだった。

## 決めたこと

- `wabisabi` に `esc()` を足し、利用者の入力を通す。`reading-shelf` の表紙 `src` も `escapeHtml` を通す。
- CSP が無かった 8 作品（cat-quiz, contracts, country-quiz, family-cards, levellog, quote, reading-shelf, wabisabi）に
  `<meta http-equiv="Content-Security-Policy">` を追加。スクリプトは自サイトのみ、inline スクリプト・イベント属性は不可。
  外部は必要な分だけ許可（cat-quiz: Wikipedia、wabisabi: Unsplash の背景）。
- ヘッドレス Chromium で 8 作品を開き、CSP 違反と JS エラーが 0 件であることを確認した。

## 検討して捨てた案

- **cafe-lp / money-anime にも CSP**: inline スクリプトや Google Fonts があり、書き換えの範囲が広がる。
  利用者入力を扱わないので後回しにした。
- **作品ごとにサブドメインを分ける**: 同一オリジン問題の根本解決だが、公開先の移転（0009）と合わせて考える。

## 結果と影響

- 外部の画像・API を新しく使うときは、その作品の CSP に許可を足さないと表示されない。
- `wabisabi` の背景 `source.unsplash.com` は Unsplash 側で提供終了しており、もともと表示されていない（別途要対応）。
