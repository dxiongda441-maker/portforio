# D:\AI-Share を作る（Claude / Codex / Gemini / Muse で前提を共有する）
# 使い方: powershell -ExecutionPolicy Bypass -File tools\setup-ai-share.ps1 [-Root D:\AI-Share]
# 既にあるファイルは上書きしない。何も消さない。
param([string]$Root = 'D:\AI-Share')

$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)

Write-Host "== 前に作りかけたフォルダが D: に無いか =="
Get-ChildItem (Split-Path $Root -Qualifier) -Directory -ErrorAction SilentlyContinue |
  Where-Object Name -match 'AI|share|共有|claude|codex|gemini|bridge' |
  ForEach-Object { Write-Host "  見つかった: $($_.FullName)" }

foreach ($d in 'inbox','outbox','notes','archive') {
  New-Item -ItemType Directory -Force (Join-Path $Root $d) | Out-Null
}

function Write-IfMissing([string]$name, [string]$body) {
  $p = Join-Path $Root $name
  if (Test-Path $p) { Write-Host "  そのまま: $name（既にある）"; return }
  [System.IO.File]::WriteAllText($p, $body, $utf8)
  Write-Host "  作成: $name"
}

$template = Join-Path $PSScriptRoot '..\docs\ai-share\AI_CONTEXT.template.md'
if (Test-Path $template) {
  Write-IfMissing 'AI_CONTEXT.md' ([System.IO.File]::ReadAllText((Resolve-Path $template), $utf8))
} else {
  Write-IfMissing 'AI_CONTEXT.md' "# AI_CONTEXT`n`n（雛形が見つからなかった。portforio の docs/ai-share/AI_CONTEXT.template.md を貼る）`n"
}

Write-IfMissing 'CLAUDE.md' @"
# AI-Share（Claude Code 用）
共通の前提は下のファイル。ここには書き足さず、AI_CONTEXT.md を直す。

@AI_CONTEXT.md

- 依頼は inbox/、作ったものは outbox/ に置く。ファイル名は YYYY-MM-DD_誰から_内容.md
"@

Write-IfMissing 'AGENTS.md' @"
# AI-Share（Codex 用）
作業を始める前に、同じフォルダの AI_CONTEXT.md を必ず読むこと。そこが共通の前提。
このファイルには書き足さず、AI_CONTEXT.md を直す。
- 依頼は inbox/、作ったものは outbox/ に置く。ファイル名は YYYY-MM-DD_誰から_内容.md
"@

Write-IfMissing 'GEMINI.md' @"
# AI-Share（Gemini CLI 用）
共通の前提は下のファイル。ここには書き足さず、AI_CONTEXT.md を直す。

@AI_CONTEXT.md

- 依頼は inbox/、作ったものは outbox/ に置く。ファイル名は YYYY-MM-DD_誰から_内容.md
"@

Write-Host "`n完了: $Root  次は AI_CONTEXT.md の〔 〕を埋める。"
explorer $Root
