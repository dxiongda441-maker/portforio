# Codex 向け作業指示 — IPキャラの画像生成

このディレクトリ（`ip-chara/`）での画像生成は Codex の担当。
企画（リスト・組み合わせ・判断基準）は Claude、採用の判定は人間が行う。応答は日本語で。

## 守ること

- 触ってよいのは `ip-chara/` の中だけ。リポジトリの他のファイルは編集しない。
- **`main` に push しない**（push すると GitHub Pages で即公開される）。作業ブランチで行う。
- ファイルやディレクトリを削除しない。気に入らない画像も残し、作り直したものは別名で保存する。
- 生き物の生態は `LISTS.md` に書いてあることだけを使う。新しく生態を書き足さない。
- 画像生成ツールが使えない場合は、**SVG や手描きで代用せず、止めて報告する。**

## 「次のバッチを作って」と言われたら

1. `batch-*.md` の最大番号 + 1 を今回のバッチ番号にする。
2. `LISTS.md` の「順番のルール」の表から、そのバッチの 6 組を取る（表に無ければ規則で計算する）。
3. 各キャラの設定を決める: 名前（カタカナ 4〜6 字）・能力・弱点・性格・+α の入れ方・配色。
   能力と弱点は、+α の機能や性質と、生き物の生態ネタの両方から作る。
4. **キャラクターデザイン（1:1）** を生成する（下のプロンプト雛形を使う）。
5. 4 の画像を**参照画像として渡して** **リファレンス（16:9）** を生成する。
6. 自分で `CRITERIA.md` の **A（動物が分かる）と B（+α がパッと分かる）** を確認する。
   どちらかが明らかに × なら 1 回だけ作り直す。それでも駄目ならそのまま出して、判定欄の横にその旨を書く。
7. 原寸画像を `images/batch-NNN/` に保存してコミットする。
   ファイル名は `<CのID>-design.png` と `<CのID>-ref.png`（例: `images/batch-002/C01-design.png`）。
8. `batch-NNN.md` を書く（書式は下）。
9. 報告は、6 体の「名前・組み合わせ・一言」の一覧だけにする。

## 仮のスタイル（全キャラ共通）

画風の出どころはまだ決まっていない。決まるまでは次の指定で統一する。決まったら採用キャラだけ作り直す。

```
Soft anime style, clean medium-weight line art, simple two-tone cel shading, warm pastel colors,
mascot proportions but keep the real animal's silhouette and anatomy recognizable,
plain off-white background, no text, no logo.
```

## プロンプト雛形

**キャラクターデザイン（1:1）**

```
Original character design for manga and anime, single full-body front three-quarter view, centered.
A <生き物の英名>. Keep its key features clearly visible: <必須特徴1>, <必須特徴2>, <必須特徴3>.
Add one everyday element as a small accent, about 30% of the design: <+α をどこにどう入れるか>.
The animal must stay instantly recognizable even if the accent is covered.
Expression and pose: <性格が出る表情・ポーズ>. Palette: <色 3 つ>.
<仮のスタイル>
```

**リファレンス（16:9）**（デザイン画像を参照画像に指定）

```
Character reference sheet (turnaround model sheet) of this exact same character: <特徴の要約>.
Top row: full-body front view, side view, back view at the same scale.
Bottom row: four facial expressions (<表情 4 つ>) as head close-ups, plus a row of flat color swatches.
Consistent proportions and colors. <仮のスタイル>
```

## batch-NNN.md の書式

```markdown
# 第N弾 候補（YYYY-MM-DD）

ラウンド r 前半/後半。判定は CRITERIA.md の記号で付ける。

| # | 名前 | 組み合わせ | A | B | C | D | E | F | 判定 | 理由 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ○○ | C01 ツチブタ × P01 じょうろ（道具） | | | | | | | 候補 | |

---

## 1. ○○ — ツチブタ × じょうろ

| デザイン | リファレンス |
|---|---|
| ![](images/batch-NNN/C01-design.png) | ![](images/batch-NNN/C01-ref.png) |

- **生態ネタ**: （LISTS.md から）
- **+α の入れ方**:
- **能力**:
- **弱点**:
- **性格**:
- **配色**:
```

判定・A〜F の欄は空けておく（人が書く）。

## batch-002 だけの追加作業: 画風の試し描き

画風を決める材料として、**C01（ツチブタ × じょうろ）のキャラクターデザイン**を 3 つの画風で描き、
`images/style-trial/` に `S1.png` `S2.png` `S3.png` で保存する。`batch-002.md` の末尾に 3 枚を並べる。

| ID | 画風 | 仮のスタイルの代わりに入れる指定 |
|---|---|---|
| S1 | いまの仮スタイル | （仮のスタイルのまま） |
| S2 | 図鑑寄りの水彩 | `Watercolor storybook illustration, soft pencil lines, more realistic animal anatomy, gentle textures, plain paper background, no text.` |
| S3 | 日常アニメ寄り | `TV slice-of-life anime style, thin clean lines, flat colors with one shadow tone, designed to sit naturally in everyday background art, plain background, no text.` |
