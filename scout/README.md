# Scout — 読む前に選別する

業界・競合・トレンド情報を集め、**あなたの関心プロファイルとの関連度だけ**で並べ替えます。
汎用のニュース要約ではありません。「一般的に面白い記事」ではなく「あなたが読む価値のある記事」を残すのが目的です。

表示側は `projects/scout/`、公開URLは
<https://dxiongda441-maker.github.io/portforio/projects/scout/> です。

## 3ステップで動かす

```bash
# 1. 依存を入れる（初回だけ）
cd scout && npm install && cd ..

# 2. 記事を集めて採点する
node scout/collect.mjs

# 3. 見る（Service Workerは使っていないが、fetchするのでサーバー経由が必要）
python3 -m http.server 3000
# → http://localhost:3000/projects/scout/
```

`ANTHROPIC_API_KEY` を設定するとClaudeが採点します。無ければキーワード一致で採点するので、
**キーが無くても必ず動きます**（精度は落ちます）。

```bash
export ANTHROPIC_API_KEY=sk-ant-...
node scout/collect.mjs
```

## 触るのはこの2ファイルだけ

| ファイル | 役割 |
| --- | --- |
| `config/profile.md` | **選別の基準そのもの。ここが心臓部。** 自分の発信テーマ・追うキーワード・興味がないものを書く |
| `config/sources.json` | 集める先のRSS/AtomのURL。`windowHours` は何時間前までを対象にするか |

`profile.md` を具体的に書くほど選別が鋭くなります。抽象的な言葉（「ビジネス」「テクノロジー」）だけだと、
汎用ニュースアプリと同じ結果に戻ります。

競合や特定テーマを追うなら、Googleニュースの検索RSSが手軽です。

```
https://news.google.com/rss/search?q=検索語&hl=ja&gl=JP&ceid=JP:ja
```

## 毎朝の自動実行

`.github/workflows/scout.yml` が毎日 21:00 UTC（＝翌6:00 JST）に走り、
`projects/scout/data/digest.json` を更新してコミットします。`main` にpushされると
Pagesへ自動デプロイされるので、朝には選別済みの状態で開けます。

必要な設定は1つだけです。GitHubの **Settings → Secrets and variables → Actions** で
`ANTHROPIC_API_KEY` を登録してください。登録しなければキーワード採点で動き続けます。

注意点が2つあります。

- `workflow_dispatch`（手動実行）と `schedule` は、ワークフローが**デフォルトブランチにある時だけ**効きます
- スケジュール実行は、リポジトリが60日間無操作だと自動で止まります

## 公開範囲について

このリポジトリは公開されています。つまり次のものが第三者から見えます。

- `scout/config/profile.md` — あなたの関心プロファイル
- `projects/scout/data/digest.json` — 集めた記事と採点結果
- Scoutのページ自体（`noindex` は付けていますが、URLを知っていれば誰でも開けます）

**書かれて困ることは `profile.md` に入れないでください。** 顧客名、未公開の企画、社内情報などです。
非公開にしたい場合は、リポジトリをprivateにするか、profile.mdを `.gitignore` に入れて
GitHub Secretsから流し込む形に変えてください。

APIキーはリポジトリには入りません。ローカルの環境変数とGitHub Secretsにだけ置きます。

## 費用の目安

Claude採点を使う場合、1日120記事・20件ずつ6リクエストで、`claude-opus-5` なら**1日あたり数十円**程度です。
安くしたいときは `collect.mjs` の `MODEL` を `claude-haiku-4-5` に変えてください（採点の質は下がります）。

## 動かなくなったときに見るところ

| 症状 | 見る場所 |
| --- | --- |
| 記事が0件 | `sources.json` のURL。ブラウザで開いてXMLが出るか確認する |
| 「60点以上が0件」 | `profile.md` が記事と噛み合っていない。「すべて」タブで何が落ちたか見る |
| 採点が「キーワード」のまま | `ANTHROPIC_API_KEY` が渡っていない |
| ページが空 | `node scout/collect.mjs` をまだ実行していない |
