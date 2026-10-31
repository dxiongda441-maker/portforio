# 0009. 公開先は Cloudflare（Workers の静的アセット）へ移し、リポジトリは非公開にする

- **日付**: 2026-10-31
- **状態**: 提案（Cloudflare のアカウント作成と接続は本人の操作待ち）
- **関係する場所**: `_headers`, `index.html`, `service/index.html`, `.github/workflows/deploy.yml`

## 背景

サイトを副業の営業に使うにあたり、セキュリティを重視したいという方針が出た。
現状は GitHub Pages（`dxiongda441-maker.github.io/portforio/`）で、次の制約がある。

- 無料プランではリポジトリを**公開**にしないと Pages を使えない。
  そのため `CLAUDE.md`・`docs/`（チャット一覧や過去の判断）・ブランチ・履歴まで誰でも読める。
- HTTP ヘッダーを自分で設定できない。CSP は `<meta>` で書けるが、
  `frame-ancestors`（他サイトへの埋め込み禁止）や `Permissions-Policy` は `<meta>` では効かない。

なお、このサイトはサーバー側のプログラム（PHP・Node.js など）を一切持たない静的サイトなので、
それらの脆弱性の影響はもともと受けない。守るべきは「何を公開してしまうか」と「ブラウザ側の防御」。

## 決めたこと

- 公開先を **Cloudflare の Workers（静的アセット）** に移す。Cloudflare は新規なら Pages より Workers を推奨しており、
  今後の機能追加も Workers 側に集中すると公式に案内している。料金は静的ファイルの配信なら無料。
- GitHub は**コードの置き場**として使い続け、Cloudflare を GitHub に接続して push で自動公開する。
  Cloudflare は非公開リポジトリからも公開できるので、**移行後にリポジトリを非公開にする**。
- 配信するファイルを限定する（`docs/`・`CLAUDE.md`・`tools/`・`.github/` などは配信しない）。
- セキュリティヘッダーはリポジトリ直下の `_headers` に書く（Cloudflare が読む）。
  トップ・サービス・見本はスクリプトを使わないので `script-src 'none'` で全面禁止。
  それまでの間も効くよう、トップとサービスには同じ CSP を `<meta>` でも入れてある。
- 人に見せ始める段階で、独自ドメイン（.com）を Cloudflare Registrar で取る（原価販売・WHOIS の個人情報は無料で非公開）。

## 検討して捨てた案

- **GitHub Pages のまま**: 無料・手間ゼロだが、リポジトリを公開し続ける必要があり、ヘッダーも設定できない。
- **Cloudflare Pages**: 静的サイトなら今も十分動き、設定も少し簡単。ただし新機能は Workers 側に集中するため、新規に始めるなら Workers を選ぶ。
- **Netlify**: ヘッダー設定も非公開リポジトリも使えるが、無料枠の転送量に上限がある。Cloudflare に寄せればドメインと DNS も1か所で管理できる。
- **WordPress などの CMS / 自前サーバー**: 更新は楽になるが、ログイン画面とサーバーのプログラムを持つことになり、まさに避けたい攻撃面が増える。

## 結果と影響

- 移行したら `CLAUDE.md` の公開URL・デプロイ手順、`canonical`・`og:url`・`sitemap.xml` の URL を新しいドメインに書き換える。
- GitHub Pages の `deploy.yml` は、移行が済んで新 URL で確認できてから止める。
- Service Worker を持つ作品は、オリジンが変わると新しいキャッシュで動き直す（利用者のデータは端末の旧 URL 側に残る）。
