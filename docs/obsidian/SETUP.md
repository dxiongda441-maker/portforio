# Obsidian Vault との連携

## 前提の整理

Obsidian の Vault は**ただの Markdown ファイルが入ったフォルダ**。
特殊な形式ではないので、パスさえ通れば Claude は `grep` / `cat` でそのまま読める。

ただし**「Obsidian だから性能が上がる」わけではない**。効くのは次の 2 点で、
これは構造化された Markdown なら何であれ得られる。

- **継続性** — 毎回説明し直すコストが消える
- **検索性** — 過去の判断を後から引ける

Obsidian の固有機能（バックリンク、グラフビュー、タグ、デイリーノート）は
**人間が書き続けやすくするための装置**であって、Claude が読む分には素の Markdown と同じ。
「書き続けられる」ことが実は一番難しいので、そこに効くなら十分価値がある。

### 逆効果になる使い方 ⚠️

**Vault 全体を読み込ませないこと。** ノートが増えるほどコンテキストを食い潰し、
本題に使える容量が減って精度が落ちる。

> 薄い索引を常時読ませ、詳細は grep で取りに行かせる。

---

## 方式A: ローカルで Vault を直接開く（最も簡単）

自分の PC で Claude Code を動かす場合。

```bash
# Vault そのものを作業ディレクトリにする
cd ~/Documents/MyVault && claude

# または、このリポジトリで作業しながら Vault も参照する
cd ~/portforio && claude --add-dir ~/Documents/MyVault
```

Vault 直下に `CLAUDE.md` を置けば、Vault を開いたときに自動で読み込まれる。
雛形は `vault-template/` にある。

**制約**: このリポジトリの web セッション（クラウド実行）からは、
ローカルの Vault は**一切見えない**。

---

## 方式B: Vault を git 管理する（web セッションからも使う場合）

**この環境で継続性を持たせたいならこれ一択。**

1. **Vault 用のリポジトリを作る。必ず private にすること。**
   個人ノートには機密が混ざる。public にすると全世界に公開される。

2. Obsidian の設定 → コミュニティプラグイン → **Git** を導入し、
   自動コミット間隔とリモートを設定する。

3. Claude のセッションにその Vault リポジトリを追加する。
   web セッションなら「〇〇/my-vault を追加して」と依頼すれば `add_repo` で追加できる
   （追加できるのはアクセス権のあるリポジトリのみ）。

**制約**: 同期はプラグインのコミット間隔ぶん遅れる。書いた直後は反映されていないことがある。

---

## 方式C: Obsidian MCP サーバー

Obsidian の **Local REST API** プラグインを有効にし、
それを叩くコミュニティ製 MCP サーバーを Claude Code に登録する方式。

```bash
claude mcp add obsidian -- <サーバーの起動コマンド>
```

ファイルパスを意識せずノートの検索・作成ができるのが利点。
ただし方式A・Bで実用上ほぼ足りるうえ、ローカルで Obsidian を起動している必要があるため、
**優先度は低い。** A か B を先に試すこと。

---

## 推奨する Vault 構造

```
Vault/
├── CLAUDE.md              ← 30行程度。索引とルールだけ。雛形は vault-template/
├── 00_Index/
│   └── MOC.md             ← どこに何があるかの地図（Map of Content）
├── 10_Decisions/          ← 決定ログ。1決定1ファイル、日付つき
├── 20_Projects/
│   └── portforio/         ← プロジェクト別コンテキスト
├── 30_Sources/            ← 読んだものの原本。Claude は読むだけ
├── 40_Wiki/               ← 原本から Claude が書く Wiki（index.md / log.md）
├── .claude/commands/      ← /ingest /ask /lint
└── 90_Daily/              ← デイリーノート
```

数字プレフィクスは並び順を固定するため。Johnny Decimal 風に間隔を空けておくと後から挿入できる。

### このリポジトリとの役割分担

| 置き場所 | 何を書くか |
|---|---|
| **このリポジトリの `docs/`** | portforio のコードに直接ひもづく判断。コードと一緒に版管理されるべきもの |
| **Vault** | プロジェクトを横断する知識、着想、日々の記録、まだ形になっていない検討 |

Vault 側からこのリポジトリの決定を参照したいときは、リンクではなく
「`portforio/docs/decisions/0001` 参照」のようにパスで書いておくと、
どちらから見ても辿れる。

---

## 「読んだものを覚える第2の脳」を作る（5分）

Karpathy の「LLM Wiki」方式。**AI が暗記するのではなく**、読んだものを原本として貯め、
Claude がそれを自分用の Wiki に整理し直し、質問されたら Wiki から出典つきで答える仕組み。
検索のたびに原本を読み直すより速く、読んだもの同士がリンクでつながっていく。

```
30_Sources/   原本（Web Clipper で保存。Claude は読むだけ）
    ↓ /ingest
40_Wiki/      Claude が書く Wiki（概念ごとのページ・出典ページ・index.md・log.md）
    ↓ /ask 質問
出典つきの回答
```

### 手順

1. **Vault を用意する**（1分）— `vault-template/` の中身を Vault 直下へコピーする。
   隠しフォルダ `.claude/` も忘れずに（`/ingest` `/ask` `/lint` のコマンドが入っている）。
   ```bash
   cp -r ~/portforio/docs/obsidian/vault-template/. ~/Documents/MyVault/
   ```
2. **Web Clipper を入れる**（2分）— ブラウザ拡張「Obsidian Web Clipper」を入れ、
   設定の保存先（Note location）を `30_Sources` にする。
3. **何か1本クリップする**（1分）— 気になった記事で拡張のボタンを押すだけ。
4. **取り込む**（1分）— Vault で Claude Code を起動して `/ingest`。
   ```bash
   cd ~/Documents/MyVault && claude
   > /ingest
   ```
5. 以降は「読んだらクリップ → たまに `/ingest`」。聞きたいときは `/ask 〇〇について何を読んだ？`、
   月1回くらい `/lint` で矛盾やリンク切れを点検する。

### 注意

- **web セッション（クラウド）から使うなら方式B（private リポジトリ）が必要。**
  ローカルの Vault はクラウドから見えない。
- 規模の目安は数百ページまで。それを超えると `index.md` だけでは当たりがつかなくなり、
  別途検索の仕組みが要る。
- 有料記事・書籍の全文を貼るのは個人利用の範囲にとどめる。リポジトリを public にしないこと。

<!-- ✏️ 実際に使う Vault のパスや方式が決まったら、ここに書き足してください -->
