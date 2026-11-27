# AI-Share — Claude / Codex / Gemini / Muse で同じ前提を使う

> 作成: 2026-11-27 / 作成者: Claude（クラウド）。PC での動作は未確認。

毎回同じ説明を送らずに済むように、**前提を1ファイル（`AI_CONTEXT.md`）にまとめて D: に置く**。
各 AI は「自分が最初に読むファイル」からそこを指すだけにする。中身を AI ごとに複製しない（食い違うため）。

## 作られるもの

```
D:\AI-Share\
├── AI_CONTEXT.md   ← 本体。ここだけ書き換える
├── CLAUDE.md       ← Claude Code が自動で読む。@AI_CONTEXT.md を取り込む
├── AGENTS.md       ← Codex が自動で読む。AI_CONTEXT.md を読むよう指示
├── GEMINI.md       ← Gemini CLI が自動で読む。@AI_CONTEXT.md を取り込む
├── inbox\          ← AI への依頼・渡す資料
├── outbox\         ← AI が作ったもの
├── notes\          ← 長くなった前提（AI_CONTEXT.md からリンク）
└── archive\        ← 済んだもの
```

ファイル名は `YYYY-MM-DD_誰から_内容.md`（例 `2026-11-28_claude_家計まとめ.md`）。

## 手順（PC で）

1. このリポジトリを PC に clone 済みなら、PowerShell で:
   ```powershell
   powershell -ExecutionPolicy Bypass -File <portforioの場所>\tools\setup-ai-share.ps1
   ```
   既にあるファイルは上書きしない。別の場所に作るなら `-Root E:\AI-Share` を付ける。
2. `D:\AI-Share\AI_CONTEXT.md` を開いて〔 〕を埋める。
3. 各 AI で読めるか確かめる（下の表）。

| AI | 読ませ方 | 確認のしかた |
|---|---|---|
| Claude Code（PC） | `cd D:\AI-Share; claude`、または別フォルダで `claude --add-dir D:\AI-Share` | 「私の今いちばん大事なことは？」と聞く |
| Claude（クラウド・スマホ） | **D: は見えない。** デスクトップアプリの Remote Control に D:\AI-Share を追加すると、クラウドのセッションから接続を申請できる | 同上 |
| Codex | `D:\AI-Share` を開く（`AGENTS.md` を読む） | 同上 |
| Gemini CLI | `D:\AI-Share` で `gemini`（`GEMINI.md` を読む） | 同上 |
| Gemini（ブラウザ） / Meta の Muse | **ファイルを自動で読めるかは分からない。** `AI_CONTEXT.md` を添付するか、中身を貼る | 同上 |

## 決まりごと

- **書き換えるのは `AI_CONTEXT.md` だけ。** CLAUDE.md / AGENTS.md / GEMINI.md は指し示すだけ。
- 埋めた `AI_CONTEXT.md` は公開リポジトリに入れない。雛形はこのフォルダの `AI_CONTEXT.template.md`。
- D: だけに置くとクラウドやスマホから見えない。必要になったら非公開リポジトリ（`tsumiage-private` など）に置く方式へ移す（`docs/obsidian/SETUP.md` の方式B と同じ考え方）。
