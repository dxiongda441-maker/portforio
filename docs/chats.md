# チャット別の成果物一覧

> 最終確認: 2026-11-15 / 確認者: Claude
> Claude Code のチャット（セッション）ごとに、何を作って、どこに置いてあり、次に何を決める必要があるかをまとめた表。
> 新しいチャットで作業したら、ここに1行足してください。

## このリポジトリ（portforio）のチャット

| 日付 | チャット名 | 分類 | 成果物の場所 | 状態 |
| --- | --- | --- | --- | --- |
| 2026-11-15 | Cloud Code 使い方改善（4回目の見直し） | 整理・統合 | 未取り込みだった4本（心理学クエスト・統計クエスト・第2の脳の雛形・URL切替スクリプト）をまとめて main へ・この表 | ✅ main に反映済み（2026-11-15、本人承認） |
| 2026-11-07 | X発信の設計（40ステップの当てはめ） | 計画・営業 | チャット内のみ（顧客像・計画を含むため公開リポジトリに置かない） | 💬 チャット内のみ |
| 2026-11-07 | 記録帳（○△×）の PWA | 作品（記録アプリ） | `projects/maru-log/`・`docs/decisions/0011-*` | ✅ main に反映済み（PR #8、2026-11-08） |
| 2026-11-03 | 第2の脳システム構築 | 設定（Obsidian の雛形） | `docs/obsidian/vault-template/`（`30_Sources/`・`40_Wiki/`・コマンド3つ） | ✅ main に反映済み（2026-11-15。実際の Vault での動作は未確認） |
| 2026-11-06 | 体と顔の評価・記録ツール | 作品（記録アプリ） | `projects/glow-log/`・`docs/decisions/0010-*` | ✅ main に反映済み（PR #8、2026-11-08） |
| 2026-10-31 | ポートフォリオの見直し（副業向けへ） | サイト全体 | `service/`・`samples/`・`index.html`・`_headers`・`tools/set-site-url.sh` | ✅ 本体は main に反映済み（2026-10-31）。残り1コミット（URL一括切替スクリプト）も 2026-11-15 に反映。Cloudflare への移行と独自ドメインは未着手（`docs/decisions/0009`） |
| 2026-10-23 | 心理学クエスト（心理学学习游戏） | 作品（学習ゲーム） | `projects/psychology-quest/`・`docs/decisions/0012-*` | ✅ main に反映済み（2026-11-15。PR #7 の内容。Security Quest の表示不具合2件の修正を含む） |
| 2026-10-23 | 統計クエスト（統計学 learning game） | 作品（学習ゲーム） | `projects/stats-quest/`・`docs/decisions/0013-*` | ✅ main に反映済み（2026-11-15。Security Quest と同じ不具合2件を移植修正） |
| 2026-10-23 | セキュリティ学習ゲーム | 作品（学習ゲーム） | `projects/security-quest/`・`.claude/commands/learning-game.md`・`tools/check-learning-game.js` | ✅ main に反映済み（2026-10-23） |
| 2026-10-21 | 設計図に基づく作成（IPキャラ） | 素材（キャラクター案） | ブランチ `claude/ip-character-blueprint`（`ip-chara/`）・Issue #6 | ⏸ Codex 待ち（Issue #6 の画像生成が未実行。デザイン6案の判定も未） |
| 2026-10-09 | 副業計画（カフェ向けInstagram運用） | 計画・営業文 | 非公開リポジトリ `tsumiage-private` の `archive/portforio/side-business/`（見本だけ `samples/cafe/` に公開） | 🔒 2026-10-31 に非公開側へ退避 |
| 2026-09-25 | 家族向けトランプゲームアプリ | 作品（ゲーム） | `projects/family-cards/` | ✅ 取り込み済み（2026-10-09、PWA 対応の最終コミットも含む） |
| 2026-09-12 | カフェ向けLP制作 | 作品（LP） | `projects/cafe-lp/` | ✅ 取り込み済み（2026-10-09） |
| 2026-09-24 | CLAUDE.md自己改善 | 設定（Claude 用） | `tools/check.sh`・`tools/screenshot.sh`・`docs/decisions/0006-*` | ✅ 取り込み済み（記録番号を 0004 → 0006 に変更。トランプ側の 0006 は 0007 に変更） |
| 2026-09-04 | 個人ビジネス構築ガイダンス | 作品（情報収集ツール Scout） | ブランチ `claude/personal-business-guidance-p3145p`（`projects/scout/`・`scout/`） | ⏸ 保留（2026-10-09 本人判断）：npm と毎朝の自動実行を含むため |
| 2026-08-14 | Brain高品質コンテンツ設計 | メモ（教材研究） | 非公開リポジトリ `tsumiage-private` の `archive/portforio/brain/` | 🔒 2026-10-31 に非公開側へ退避（公開側のブランチは削除予定） |
| 2026-09-03 | ソフトバンク入社への道 | 就職活動（ポートフォリオの文面変更） | ブランチ `claude/softbank-employment-path-uwalcp`（`index.html`・`README.md`） | ✅ 取り込み済み（2026-10-09）。作品数の記述は 10 作品に更新 |
| 2026-09-15 | ソフトバンク法人営業エントリー準備 | 就職活動（面接台本） | ブランチ `claude/softbank-corporate-sales-prep-0fgymy`（GitHub 上に存在せず） | 💬 チャット内のみ |
| 2026-08-28 | 会話の記憶範囲とObsidian活用 | 設定（Claude の記憶） | `CLAUDE.md`・`docs/`・`.claude/commands/` | ✅ main に反映済み（PR #4） |
| 2026-08-30 | 昨日のレポートと今日のタスク | 設定（Claude の記憶） | 上と同じブランチ | ✅ main に反映済み（PR #4） |
| 2026-08-15 | これまでのログ確認 | 改善（作品の不具合修正・OGP など） | `projects/*`・`assets/` | ✅ main に反映済み（PR #3） |
| 2026-08-15 | ログからのタスク抽出とレポート生成 | 調査レポート | Artifact「portforio 次にやること」 | 💬 チャット内のみ |
| 2026-09-12 | クラウドコード使用方法の改善 | 相談・整理 | ブランチ `claude/cloudcode-usage-review-qqonph`（GitHub 上に存在せず） | 💬 チャット内のみ |
| 2026-09-28 | ファイルディレクトリの整理 | 整理（このドキュメント） | ブランチ `claude/organize-file-directory-yq7io2` | ✅ 取り込み済み（2026-10-09） |

### チャット以外で作られたもの

| 作品 | 場所 | 経緯 |
| --- | --- | --- |
| Reading Shelf / 三分録 / LevelLog / 1日1名言 / 世界の国クイズ / 世界ねこ図鑑クイズ / ビジネス契約ラーニング / 100円が冒険に出た!? | `projects/<作品>/` | 2026-07-13 にまとめて追加。元のチャットは特定できない。各フォルダの `README.md` に概要あり |

### 古いブランチ

2026-10-09 に本人が削除を承認（Claude のセッションからは権限が無く削除できないため、GitHub の Branches 画面で削除する）: `alter-portfolio`・`agent/add-portfolio-works-20260712`・`tmp-push-test`・
`claude/review-previous-logs-9ixygf`・`claude/conversation-memory-obsidian-yjdj5q`・
`claude/cafe-lp-creation-5z5gz9`・`claude/claude-md-self-improvement-7mceld`・`claude/family-card-game-app-fnnysi`。
中身は main か取り込み済みブランチに入っている。

2026-11-15 に確認して、同じく中身がすべて main に入っていたもの（削除してよい候補。**未承認**）:
`claude/continue-work-in-progress-zdkhoh`・`claude/organize-file-directory-yq7io2`・
`claude/softbank-employment-path-uwalcp`・`claude/security-quest`・`claude/self-improvement-tracker`。
台帳の1行だけが違うもの（内容はこの表に反映済み）: `claude/diary-log-pwa-fh9mrs`・`claude/zen-meitner-pkl4ix`。
2026-11-15 に main へ入ったので不要になったもの: `claude/psychology-quest`・`claude/learning-game-statistics-f1ahwf`・
`claude/second-brain-llm-wiki`・`claude/determined-newton-224ltn`。

## ほかのリポジトリのチャット

| リポジトリ | チャット名 | 成果物の場所 |
| --- | --- | --- |
| `ToDo` | ファイルディレクトリの整理 | ToDo アプリ本体（`css/`・`js/` に分割済み） |
| `Album` | LP creation patterns | `docs/lp-creation-patterns.md` |
| `Album` | （AI社員の履歴書） | `ai-office/` |

## 手元の PC で動かしたチャット

次のチャットは手元のパソコン上で動かしたもので、ファイルはこのリポジトリには入っていません。
中身はパソコン側のフォルダを確認してください。

| 日付 | チャット名 |
| --- | --- |
| 2026-09-18 | ブレイン教材の読み込み（記事11本・画像。Substack/note への投稿はブラウザ拡張の接続待ち） |
| 2026-09-17 | 成功者の学び漫画シリーズ |
| 2026-09-17 | 日々の振り返り音声記録アプリ |
| 2026-09-14 | ソフトバンク面接対策 |
| 2026-09-07 | ポートフォリオサイト開発 |
| 2026-09-05 | ワールドトリガーB級ランク戦ゲーム |
| 2026-09-04 | Schedule variation 7 to 24 |
| 2026-09-01 | Obsidian vault 統合と知識管理システム |
