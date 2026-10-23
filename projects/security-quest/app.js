"use strict";

(() => {
  const STORAGE_KEY = "security-quest-v1";
  const PASS_RATE = 0.8;
  const FINAL_PASS_RATE = 0.85;
  const FINAL_SIZE = 40;
  const REVIEW_SIZE = 10;
  const REVIEW_GRADUATE_STREAK = 2;
  const XP_CORRECT = 10;
  const XP_FIRST_CLEAR = 50;
  const XP_PER_NEW_STAR = 20;

  const TYPE_LABELS = {
    choice: "選択",
    multi: "すべて選べ",
    order: "並べ替え",
    input: "入力",
    spot: "見つけ出せ",
    match: "組み合わせ"
  };

  const RANKS = [
    { min: 0, title: "見習いセキュリティ担当" },
    { min: 3, title: "ジュニアアナリスト" },
    { min: 6, title: "SOCアナリスト" },
    { min: 9, title: "セキュリティエンジニア" },
    { min: 12, title: "シニアエンジニア" },
    { min: 15, title: "セキュリティアーキテクト" },
    { min: 18, title: "CISO候補" }
  ];
  const FINAL_RANK = "CISO（最高情報セキュリティ責任者）";

  const SQ = window.SQ || { acts: [], chapters: [] };
  const chapters = SQ.chapters.slice().sort((a, b) => a.no - b.no);
  chapters.forEach((ch) => {
    ch.quiz.forEach((q, i) => {
      q.id = `${ch.id}-${i + 1}`;
      q.chapterId = ch.id;
    });
  });
  const chapterById = new Map(chapters.map((ch) => [ch.id, ch]));
  const questionById = new Map(chapters.flatMap((ch) => ch.quiz.map((q) => [q.id, q])));

  const app = document.getElementById("app");
  let state = load();
  let battle = null;
  let lastResult = null;

  // ---------- 保存 ----------

  function defaultState() {
    return { version: 1, name: "", xp: 0, chapters: {}, wrong: {}, final: { cleared: false, best: 0, date: "" }, freeMode: false };
  }

  function load() {
    const base = defaultState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return base;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return base;
      return {
        ...base,
        name: typeof data.name === "string" ? data.name.slice(0, 24) : "",
        xp: Number.isFinite(data.xp) ? data.xp : 0,
        chapters: isPlainObject(data.chapters) ? data.chapters : {},
        wrong: isPlainObject(data.wrong) ? data.wrong : {},
        final: { ...base.final, ...(isPlainObject(data.final) ? data.final : {}) },
        freeMode: data.freeMode === true
      };
    } catch {
      return base;
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // プライベートモード等で保存できなくても遊べるようにする
    }
  }

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function progressOf(ch) {
    return state.chapters[ch.id] || { read: false, cleared: false, best: 0, stars: 0 };
  }

  function updateProgress(ch, patch) {
    state.chapters[ch.id] = { ...progressOf(ch), ...patch };
  }

  // ---------- 進行判定 ----------

  function clearedCount() {
    return chapters.filter((ch) => progressOf(ch).cleared).length;
  }

  function totalStars() {
    return chapters.reduce((sum, ch) => sum + (progressOf(ch).stars || 0), 0);
  }

  function isUnlocked(ch) {
    if (state.freeMode || ch.no === 1) return true;
    const prev = chapters[chapters.indexOf(ch) - 1];
    return !prev || progressOf(prev).cleared;
  }

  function termsUnlocked(ch) {
    const p = progressOf(ch);
    return state.freeMode || p.read || p.cleared;
  }

  function finalUnlocked() {
    return chapters.length > 0 && clearedCount() === chapters.length;
  }

  function rankTitle() {
    if (state.final.cleared) return FINAL_RANK;
    const count = clearedCount();
    return RANKS.filter((r) => count >= r.min).pop().title;
  }

  function nextChapter() {
    return chapters.find((ch) => isUnlocked(ch) && !progressOf(ch).cleared);
  }

  function wrongIds() {
    return Object.keys(state.wrong).filter((id) => questionById.has(id));
  }

  // ---------- DOM ヘルパー ----------

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === "class") node.className = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else if (value === true) node.setAttribute(key, "");
      else node.setAttribute(key, value);
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  // **太字** と `コード` だけを解釈する。innerHTML は使わない。
  function rich(text) {
    const frag = document.createDocumentFragment();
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let last = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index > last) frag.append(text.slice(last, match.index));
      const token = match[0];
      frag.append(token.startsWith("**") ? el("strong", {}, token.slice(2, -2)) : el("code", {}, token.slice(1, -1)));
      last = match.index + token.length;
    }
    if (last < text.length) frag.append(text.slice(last));
    return frag;
  }

  function button(label, onclick, cls = "btn") {
    return el("button", { type: "button", class: cls, onclick }, label);
  }

  function link(label, href, cls = "btn") {
    return el("a", { class: cls, href }, label);
  }

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function range(n) {
    return Array.from({ length: n }, (_, i) => i);
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function starText(n, max = 3) {
    return "★".repeat(n) + "☆".repeat(max - n);
  }

  function heading(text, sub) {
    return el("div", { class: "screen-head" }, sub ? el("p", { class: "eyebrow" }, sub) : null, el("h1", { tabindex: "-1" }, text));
  }

  // ---------- ルーティング ----------

  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  window.addEventListener("hashchange", render);

  function render() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const [view, arg, sub] = parts;
    app.replaceChildren();

    if (view !== "battle" && battle && !battle.finished) battle = null;

    if (!view) renderHome();
    else if (view === "ch") {
      const ch = chapterById.get(arg);
      if (!ch || !isUnlocked(ch)) return go("#/");
      if (sub) renderLesson(ch, Number(sub));
      else renderChapter(ch);
    } else if (view === "battle") {
      if (!battle) return go("#/");
      renderBattle();
    } else if (view === "result") {
      if (!lastResult) return go("#/");
      renderResult();
    } else if (view === "glossary") renderGlossary();
    else if (view === "settings") renderSettings();
    else if (view === "help") renderHelp();
    else if (view === "certificate") {
      if (!state.final.cleared) return go("#/");
      renderCertificate();
    } else return go("#/");

    window.scrollTo(0, 0);
    const h1 = app.querySelector("h1");
    if (h1) h1.focus({ preventScroll: true });
  }

  // ---------- ホーム（マップ） ----------

  function renderHome() {
    const cleared = clearedCount();
    const total = chapters.length;
    const next = nextChapter();
    const reviewCount = wrongIds().length;
    const unlockedTerms = chapters.filter(termsUnlocked).reduce((s, ch) => s + ch.terms.length, 0);
    const allTerms = chapters.reduce((s, ch) => s + ch.terms.length, 0);

    const hero = el(
      "section",
      { class: "hero" },
      el("p", { class: "eyebrow" }, "情報セキュリティ学習RPG"),
      el("h1", { tabindex: "-1" }, "セキュリティ・クエスト"),
      el("p", { class: "hero-lead" }, "架空企業「ハコニワ社」のセキュリティチームに配属されたあなた。18体の脅威を倒し、最終試験に合格すれば、組織を守るために必要な知識の地図がすべて手に入る。"),
      el(
        "div",
        { class: "status-card" },
        el("div", { class: "status-rank" }, el("span", { class: "label" }, "称号"), el("strong", {}, rankTitle())),
        el("div", { class: "status-grid" }, statBox("撃破", `${cleared}/${total}`), statBox("★", `${totalStars()}/${total * 3}`), statBox("XP", state.xp), statBox("図鑑", `${unlockedTerms}/${allTerms}`)),
        el("div", { class: "meter", role: "progressbar", "aria-label": "全体の進行度", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(cleared) }, el("span", { style: `width:${total ? (cleared / total) * 100 : 0}%` }))
      ),
      el(
        "div",
        { class: "hero-actions" },
        next ? link(cleared === 0 && !progressOf(next).read ? "冒険を始める" : `続きから：第${next.no}章`, `#/ch/${next.id}`, "btn btn-primary") : null,
        button(`復習ダンジョン（${reviewCount}）`, startReview, reviewCount ? "btn" : "btn btn-muted"),
        finalUnlocked() ? button(state.final.cleared ? "最終試験に再挑戦" : "最終試験に挑む", startFinal, "btn btn-gold") : el("span", { class: "btn btn-muted", "aria-disabled": "true" }, "最終試験（全章撃破で解放）"),
        state.final.cleared ? link("修了証を見る", "#/certificate", "btn btn-gold") : null
      )
    );

    const map = el("section", { class: "map", "aria-label": "章の一覧" });
    for (const act of SQ.acts) {
      const list = chapters.filter((ch) => ch.act === act.no);
      map.append(
        el(
          "div",
          { class: "act" },
          el("div", { class: "act-head" }, el("p", { class: "eyebrow" }, `ACT ${act.no}`), el("h2", {}, act.title), el("p", {}, act.desc)),
          el("ol", { class: "chapter-grid" }, list.map(chapterTile))
        )
      );
    }

    app.append(hero, map);
  }

  function statBox(label, value) {
    return el("div", { class: "stat" }, el("span", { class: "label" }, label), el("strong", {}, String(value)));
  }

  function chapterTile(ch) {
    const p = progressOf(ch);
    const unlocked = isUnlocked(ch);
    const inner = [
      el("span", { class: "tile-no" }, `第${ch.no}章`),
      el("span", { class: "tile-icon", "aria-hidden": "true" }, unlocked ? ch.icon : "🔒"),
      el("strong", { class: "tile-title" }, ch.title),
      el("span", { class: "tile-sub" }, unlocked ? ch.subtitle : "前の章のボスを倒すと解放"),
      el("span", { class: "tile-stars", "aria-label": `星${p.stars || 0}個` }, p.cleared ? starText(p.stars) : unlocked ? "未撃破" : "")
    ];
    return el("li", {}, unlocked ? el("a", { class: `tile${p.cleared ? " is-cleared" : ""}`, href: `#/ch/${ch.id}` }, inner) : el("div", { class: "tile is-locked" }, inner));
  }

  // ---------- 章トップ・講義 ----------

  function renderChapter(ch) {
    const p = progressOf(ch);
    const index = chapters.indexOf(ch);
    app.append(
      heading(`${ch.icon} ${ch.title}`, `CHAPTER ${pad(ch.no)} ／ ${ch.subtitle}`),
      el("p", { class: "story" }, rich(ch.story)),
      el(
        "div",
        { class: "boss-card" },
        el("p", { class: "eyebrow" }, "この章のボス"),
        el("h2", {}, ch.boss.name),
        el("p", { class: "boss-line" }, `「${ch.boss.line}」`),
        el("p", { class: "muted" }, `講義 ${ch.lessons.length}枚 ／ 問題 ${ch.quiz.length}問 ／ 撃破条件：${Math.ceil(ch.quiz.length * PASS_RATE)}問以上正解`),
        p.cleared ? el("p", { class: "cleared-note" }, `撃破済み ${starText(p.stars)}（最高 ${Math.round(p.best * 100)}%）`) : null
      ),
      el("h2", { class: "section-title" }, "講義の目次"),
      el(
        "ol",
        { class: "lesson-index" },
        ch.lessons.map((lesson, i) => el("li", {}, el("a", { href: `#/ch/${ch.id}/${i + 1}` }, lesson.title)))
      ),
      el(
        "div",
        { class: "actions" },
        link(p.read ? "講義を読み直す" : "講義を始める", `#/ch/${ch.id}/1`, p.read ? "btn" : "btn btn-primary"),
        p.read || p.cleared || state.freeMode ? button("ボス戦に挑む", () => startChapterBattle(ch), p.read ? "btn btn-primary" : "btn") : null,
        index > 0 ? link("← 前の章", `#/ch/${chapters[index - 1].id}`, "btn btn-ghost") : null,
        link("マップへ", "#/", "btn btn-ghost")
      )
    );
  }

  function renderLesson(ch, n) {
    const total = ch.lessons.length;
    if (!Number.isInteger(n) || n < 1 || n > total) return go(`#/ch/${ch.id}`);
    const lesson = ch.lessons[n - 1];
    const isLast = n === total;
    if (isLast && !progressOf(ch).read) {
      updateProgress(ch, { read: true });
      save();
    }

    const card = el(
      "article",
      { class: "lesson-card" },
      el("p", { class: "eyebrow" }, `第${ch.no}章 ${ch.title} ／ 講義 ${n}/${total}`),
      el("h1", { tabindex: "-1" }, lesson.title),
      lesson.body.map((para) => el("p", {}, rich(para))),
      lesson.example ? el("pre", { class: "code" }, el("code", {}, lesson.example)) : null,
      lesson.points && lesson.points.length
        ? el("div", { class: "points" }, el("h2", {}, "ここを押さえる"), el("ul", {}, lesson.points.map((pt) => el("li", {}, rich(pt)))))
        : null
    );

    const dots = el(
      "ol",
      { class: "dots", "aria-label": "講義の進み具合" },
      range(total).map((i) => el("li", {}, el("a", { href: `#/ch/${ch.id}/${i + 1}`, class: i + 1 === n ? "is-current" : "", "aria-label": `講義${i + 1}`, "aria-current": i + 1 === n ? "step" : null })))
    );

    const nav = el(
      "div",
      { class: "actions lesson-nav" },
      n > 1 ? link("← 前へ", `#/ch/${ch.id}/${n - 1}`, "btn btn-ghost") : link("← 章トップ", `#/ch/${ch.id}`, "btn btn-ghost"),
      isLast ? button(`ボス「${ch.boss.name}」に挑む`, () => startChapterBattle(ch), "btn btn-primary") : link("次へ →", `#/ch/${ch.id}/${n + 1}`, "btn btn-primary")
    );

    app.append(dots, card, nav);
  }

  // ---------- バトル ----------

  function startChapterBattle(ch) {
    const total = ch.quiz.length;
    const needed = Math.ceil(total * PASS_RATE);
    beginBattle({ mode: "chapter", chapterId: ch.id, title: `第${ch.no}章 ${ch.title}`, bossName: ch.boss.name, questions: shuffle(ch.quiz), needed, maxWrong: total - needed });
  }

  function startFinal() {
    const pool = shuffle(chapters.flatMap((ch) => ch.quiz));
    const picked = [];
    // 全章から偏りなく拾うため、章ごとに最低2問を先に確保する
    for (const ch of chapters) picked.push(...shuffle(ch.quiz).slice(0, 2));
    for (const q of pool) {
      if (picked.length >= FINAL_SIZE) break;
      if (!picked.includes(q)) picked.push(q);
    }
    const questions = shuffle(picked.slice(0, FINAL_SIZE));
    const needed = Math.ceil(questions.length * FINAL_PASS_RATE);
    beginBattle({ mode: "final", title: "最終試験", bossName: "ゼロデイ・ドラゴン", questions, needed, maxWrong: questions.length - needed });
  }

  function startReview() {
    const ids = wrongIds();
    if (!ids.length) {
      alert("復習待ちの問題はありません。ボス戦で間違えた問題がここに溜まります。");
      return;
    }
    const questions = shuffle(ids).slice(0, REVIEW_SIZE).map((id) => questionById.get(id));
    beginBattle({ mode: "review", title: "復習ダンジョン", bossName: "忘却のミミック", questions, needed: questions.length, maxWrong: Infinity });
  }

  function beginBattle(config) {
    battle = { ...config, index: 0, correct: 0, wrong: 0, log: [], view: null, answered: false, finished: false, defeated: false, xpGained: 0 };
    prepareQuestion();
    go("#/battle");
  }

  function prepareQuestion() {
    const q = battle.questions[battle.index];
    const view = { selected: new Set(), choice: null };
    if (q.type === "choice" || q.type === "multi") view.order = shuffle(range(q.choices.length));
    if (q.type === "order") {
      let order = shuffle(range(q.items.length));
      while (q.items.length > 1 && order.every((v, i) => v === i)) order = shuffle(order);
      view.order = order;
    }
    if (q.type === "match") {
      view.right = shuffle(range(q.pairs.length));
      view.picks = q.pairs.map(() => "");
    }
    battle.view = view;
    battle.answered = false;
  }

  function renderBattle() {
    const q = battle.questions[battle.index];
    const total = battle.questions.length;
    const isReview = battle.mode === "review";
    const hp = Math.max(0, battle.needed - battle.correct);
    const hearts = isReview ? null : battle.maxWrong + 1 - battle.wrong;

    const top = el(
      "section",
      { class: `boss-bar${hp === 0 ? " is-down" : ""}`, "aria-label": "戦況" },
      el("div", { class: "boss-name" }, el("span", { class: "eyebrow" }, battle.title), el("strong", {}, hp === 0 ? `${battle.bossName}（撃破！）` : battle.bossName)),
      el("div", { class: "hp", role: "img", "aria-label": `ボスの残りHP ${hp}/${battle.needed}` }, el("span", { style: `width:${(hp / battle.needed) * 100}%` })),
      el(
        "div",
        { class: "battle-meta" },
        el("span", {}, `Q ${battle.index + 1}/${total}`),
        hearts !== null ? el("span", { class: "hearts", "aria-label": `残りライフ ${hearts}` }, "♥".repeat(Math.max(0, hearts)) + "♡".repeat(battle.maxWrong + 1 - Math.max(0, hearts))) : el("span", {}, "練習モード（ライフ無制限）")
      )
    );

    const chapter = chapterById.get(q.chapterId);
    const qCard = el(
      "section",
      { class: "question-card" },
      el("p", { class: "eyebrow" }, `${TYPE_LABELS[q.type]}${battle.mode !== "chapter" ? ` ／ 第${chapter.no}章 ${chapter.title}` : ""}`),
      el("h1", { class: "question", tabindex: "-1" }, rich(q.q)),
      q.code ? el("pre", { class: "code" }, el("code", {}, q.code)) : null,
      el("div", { class: "answer-area" }, renderAnswerUI(q)),
      el("div", { class: "feedback", id: "feedback", "aria-live": "polite" })
    );

    app.append(top, qCard, el("div", { class: "actions" }, button("撤退する", retreat, "btn btn-ghost")));
  }

  function retreat() {
    if (battle.log.length && !confirm("撤退すると、このバトルの結果は記録されません。よろしいですか？")) return;
    const ch = battle.chapterId ? chapterById.get(battle.chapterId) : null;
    battle = null;
    go(ch ? `#/ch/${ch.id}` : "#/");
  }

  function renderAnswerUI(q) {
    const v = battle.view;
    if (q.type === "choice") {
      return el(
        "div",
        { class: "choices" },
        v.order.map((idx, i) => el("button", { type: "button", class: "choice", "data-idx": String(idx), onclick: () => submit(idx) }, el("span", { class: "key" }, String(i + 1)), el("span", {}, rich(q.choices[idx]))))
      );
    }
    if (q.type === "multi") {
      const wrap = el(
        "div",
        { class: "choices" },
        v.order.map((idx) =>
          el(
            "button",
            {
              type: "button",
              class: "choice is-toggle",
              "data-idx": String(idx),
              "aria-pressed": "false",
              onclick: (e) => {
                if (battle.answered) return;
                const on = !v.selected.has(idx);
                on ? v.selected.add(idx) : v.selected.delete(idx);
                e.currentTarget.setAttribute("aria-pressed", String(on));
              }
            },
            el("span", { class: "check", "aria-hidden": "true" }),
            el("span", {}, rich(q.choices[idx]))
          )
        )
      );
      return [wrap, submitButton(() => submit([...v.selected]))];
    }
    if (q.type === "order") {
      const list = el("ol", { class: "order-list" });
      const draw = () => {
        list.replaceChildren(
          ...v.order.map((idx, pos) =>
            el(
              "li",
              { class: "order-item", "data-idx": String(idx) },
              el("span", { class: "order-text" }, rich(q.items[idx])),
              el(
                "span",
                { class: "order-btns" },
                el("button", { type: "button", class: "mini", "aria-label": "上へ", disabled: pos === 0 || battle.answered, onclick: () => move(pos, -1) }, "↑"),
                el("button", { type: "button", class: "mini", "aria-label": "下へ", disabled: pos === v.order.length - 1 || battle.answered, onclick: () => move(pos, 1) }, "↓")
              )
            )
          )
        );
      };
      const move = (pos, delta) => {
        const target = pos + delta;
        [v.order[pos], v.order[target]] = [v.order[target], v.order[pos]];
        draw();
        const btn = list.children[target] && list.children[target].querySelectorAll("button")[delta < 0 ? 0 : 1];
        if (btn && !btn.disabled) btn.focus();
      };
      v.redraw = draw;
      draw();
      return [list, submitButton(() => submit(v.order.slice()))];
    }
    if (q.type === "input") {
      const input = el("input", { type: "text", class: "text-input", id: "answer-input", autocomplete: "off", spellcheck: "false", placeholder: q.placeholder || "答えを入力", "aria-label": "解答" });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing && !battle.answered) {
          e.preventDefault();
          e.stopPropagation();
          submit(input.value);
        }
      });
      setTimeout(() => input.focus(), 0);
      return [input, submitButton(() => submit(input.value))];
    }
    if (q.type === "spot") {
      const list = el(
        "div",
        { class: `spot-list${q.mono === false ? "" : " is-mono"}` },
        q.lines.map((line, idx) =>
          el(
            "button",
            {
              type: "button",
              class: "spot-line",
              "data-idx": String(idx),
              "aria-pressed": "false",
              onclick: (e) => {
                if (battle.answered) return;
                const on = !v.selected.has(idx);
                on ? v.selected.add(idx) : v.selected.delete(idx);
                e.currentTarget.setAttribute("aria-pressed", String(on));
              }
            },
            el("span", { class: "ln", "aria-hidden": "true" }, String(idx + 1)),
            el("span", { class: "spot-text" }, line === "" ? " " : line)
          )
        )
      );
      return [el("p", { class: "hint" }, "該当する行をタップして選び、「決定」を押す。"), list, submitButton(() => submit([...v.selected]))];
    }
    if (q.type === "match") {
      const rows = el(
        "div",
        { class: "match-list" },
        q.pairs.map(([left], i) => {
          const select = el(
            "select",
            {
              class: "match-select",
              "data-row": String(i),
              "aria-label": `${left} に対応するもの`,
              onchange: (e) => {
                v.picks[i] = e.target.value;
              }
            },
            el("option", { value: "" }, "選んでください"),
            v.right.map((r) => el("option", { value: String(r) }, q.pairs[r][1]))
          );
          return el("div", { class: "match-row" }, el("span", { class: "match-left" }, rich(left)), select);
        })
      );
      return [
        rows,
        submitButton(() => {
          if (v.picks.some((p) => p === "")) {
            alert("すべての項目を選んでから決定してください。");
            return;
          }
          submit(v.picks.map(Number));
        })
      ];
    }
    return el("p", {}, "未対応の問題形式です。");
  }

  function submitButton(onclick) {
    return el("div", { class: "submit-row" }, el("button", { type: "button", class: "btn btn-primary submit", onclick }, "決定"));
  }

  function normalize(text) {
    return String(text).normalize("NFKC").toLowerCase().replace(/\s+/g, "");
  }

  function sameSet(a, b) {
    const sa = new Set(a);
    return sa.size === new Set(b).size && [...sa].every((x) => b.includes(x));
  }

  function judge(q, answer) {
    switch (q.type) {
      case "choice":
        return answer === q.answer;
      case "multi":
      case "spot":
        return sameSet(answer, q.answer);
      case "order":
        return answer.every((v, i) => v === i);
      case "input":
        return q.answer.map(normalize).includes(normalize(answer));
      case "match":
        return answer.every((v, i) => v === i);
      default:
        return false;
    }
  }

  function submit(answer) {
    if (battle.answered) return;
    const q = battle.questions[battle.index];
    if (q.type === "input" && normalize(answer) === "") return;
    battle.answered = true;
    const ok = judge(q, answer);
    battle.log.push({ id: q.id, ok });
    if (ok) {
      battle.correct += 1;
      battle.xpGained += XP_CORRECT;
    } else {
      battle.wrong += 1;
    }
    trackReview(q.id, ok);
    revealAnswer(q, answer, ok);
  }

  function trackReview(id, ok) {
    if (!ok) {
      state.wrong[id] = { streak: 0 };
      return;
    }
    if (!state.wrong[id]) return;
    const streak = (state.wrong[id].streak || 0) + 1;
    if (streak >= REVIEW_GRADUATE_STREAK) delete state.wrong[id];
    else state.wrong[id] = { streak };
  }

  function revealAnswer(q, answer, ok) {
    const area = app.querySelector(".answer-area");
    area.classList.add("is-answered");
    area.querySelectorAll("button, select, input").forEach((node) => {
      node.disabled = true;
    });

    if (q.type === "choice" || q.type === "multi") {
      const correct = q.type === "choice" ? [q.answer] : q.answer;
      const chosen = q.type === "choice" ? [answer] : answer;
      area.querySelectorAll(".choice").forEach((node) => {
        const idx = Number(node.dataset.idx);
        if (correct.includes(idx)) node.classList.add("is-correct");
        else if (chosen.includes(idx)) node.classList.add("is-wrong");
      });
    } else if (q.type === "spot") {
      area.querySelectorAll(".spot-line").forEach((node) => {
        const idx = Number(node.dataset.idx);
        if (q.answer.includes(idx)) node.classList.add("is-correct");
        else if (answer.includes(idx)) node.classList.add("is-wrong");
      });
    } else if (q.type === "order") {
      area.querySelectorAll(".order-item").forEach((node, pos) => {
        node.classList.add(Number(node.dataset.idx) === pos ? "is-correct" : "is-wrong");
      });
    } else if (q.type === "match") {
      area.querySelectorAll(".match-select").forEach((node) => {
        const row = Number(node.dataset.row);
        node.closest(".match-row").classList.add(answer[row] === row ? "is-correct" : "is-wrong");
      });
    } else if (q.type === "input") {
      area.querySelector("input").classList.add(ok ? "is-correct" : "is-wrong");
    }

    const fb = app.querySelector("#feedback");
    const total = battle.questions.length;
    const isReview = battle.mode === "review";
    const defeated = !isReview && battle.wrong > battle.maxWrong;
    const bossDown = !isReview && ok && battle.correct === battle.needed;
    const last = battle.index + 1 >= total;

    fb.className = `feedback ${ok ? "is-ok" : "is-ng"}`;
    fb.append(
      el("p", { class: "verdict" }, ok ? "正解！ 会心の一撃。" : "不正解… ダメージを受けた。"),
      !ok ? correctAnswerView(q) : null,
      el("div", { class: "explain" }, el("p", { class: "label" }, "解説"), el("p", {}, rich(q.exp))),
      bossDown && !last ? el("p", { class: "bossdown" }, `${battle.bossName}を撃破！ 残りの問題は追撃（★の評価に影響）。`) : null,
      defeated ? el("p", { class: "defeat" }, "ライフが尽きた… 講義を見直して再挑戦しよう。") : null,
      el(
        "div",
        { class: "submit-row" },
        el("button", { type: "button", class: "btn btn-primary next", onclick: () => advance(defeated) }, defeated || last ? "結果を見る" : "次の問題へ →")
      )
    );

    // 上部の HP・ライフ表示も更新する
    const hp = Math.max(0, battle.needed - battle.correct);
    const bar = app.querySelector(".hp > span");
    if (bar) bar.style.width = `${(hp / battle.needed) * 100}%`;
    const hpBox = app.querySelector(".hp");
    if (hpBox) hpBox.setAttribute("aria-label", `ボスの残りHP ${hp}/${battle.needed}`);
    if (hp === 0) app.querySelector(".boss-bar").classList.add("is-down");
    const hearts = app.querySelector(".hearts");
    if (hearts) {
      const left = Math.max(0, battle.maxWrong + 1 - battle.wrong);
      hearts.textContent = "♥".repeat(left) + "♡".repeat(battle.maxWrong + 1 - left);
      hearts.setAttribute("aria-label", `残りライフ ${left}`);
    }
    if (!ok) app.querySelector(".question-card").classList.add("shake");

    fb.querySelector(".next").focus({ preventScroll: true });
    fb.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }

  function correctAnswerView(q) {
    let content;
    if (q.type === "choice") content = el("p", {}, rich(q.choices[q.answer]));
    else if (q.type === "multi") content = el("ul", {}, q.answer.map((i) => el("li", {}, rich(q.choices[i]))));
    else if (q.type === "order") content = el("ol", {}, q.items.map((item) => el("li", {}, rich(item))));
    else if (q.type === "input") content = el("p", {}, el("code", {}, q.answer[0]));
    else if (q.type === "spot") content = el("p", {}, `${q.answer.map((i) => i + 1).join("・")} 行目`);
    else if (q.type === "match") content = el("ul", {}, q.pairs.map(([l, r]) => el("li", {}, rich(l), " → ", r)));
    return el("div", { class: "correct-answer" }, el("p", { class: "label" }, "正解"), content);
  }

  function advance(defeated) {
    if (defeated) {
      battle.defeated = true;
      return finishBattle();
    }
    battle.index += 1;
    if (battle.index >= battle.questions.length) return finishBattle();
    prepareQuestion();
    render();
  }

  function finishBattle() {
    const b = battle;
    b.finished = true;
    const total = b.questions.length;
    const rate = b.correct / total;
    const prevRank = rankTitle();
    let cleared = false;
    let stars = 0;
    let bonus = 0;
    let firstClear = false;

    if (b.mode === "chapter") {
      const ch = chapterById.get(b.chapterId);
      const p = progressOf(ch);
      cleared = !b.defeated && rate >= PASS_RATE;
      stars = cleared ? (rate === 1 ? 3 : rate >= 0.9 ? 2 : 1) : 0;
      if (cleared && !p.cleared) {
        firstClear = true;
        bonus += XP_FIRST_CLEAR;
      }
      if (stars > (p.stars || 0)) bonus += (stars - (p.stars || 0)) * XP_PER_NEW_STAR;
      updateProgress(ch, { read: true, cleared: p.cleared || cleared, best: Math.max(p.best || 0, rate), stars: Math.max(p.stars || 0, stars) });
    } else if (b.mode === "final") {
      cleared = !b.defeated && rate >= FINAL_PASS_RATE;
      if (cleared && !state.final.cleared) {
        firstClear = true;
        bonus += 300;
        state.final.date = new Date().toISOString().slice(0, 10);
      }
      state.final = { ...state.final, cleared: state.final.cleared || cleared, best: Math.max(state.final.best || 0, rate) };
    } else {
      cleared = true;
    }

    b.xpGained += bonus;
    state.xp += b.xpGained;
    save();
    const newRank = rankTitle();
    lastResult = { battle: b, rate, cleared, stars, firstClear, rankUp: newRank !== prevRank ? newRank : null };
    battle = null;
    go("#/result");
  }

  // ---------- 結果 ----------

  function renderResult() {
    const { battle: b, rate, cleared, stars, firstClear, rankUp } = lastResult;
    const ch = b.chapterId ? chapterById.get(b.chapterId) : null;
    const nextIdx = ch ? chapters.indexOf(ch) + 1 : -1;
    const next = nextIdx > 0 && nextIdx < chapters.length ? chapters[nextIdx] : null;
    const answered = new Map(b.log.map((entry) => [entry.id, entry.ok]));
    let title;
    if (b.mode === "review") title = "復習完了";
    else if (cleared) title = b.mode === "final" ? "最終試験 合格！" : "ボス撃破！";
    else title = "敗北…";

    app.append(
      heading(title, b.title),
      el(
        "section",
        { class: `result-card ${cleared ? "is-win" : "is-lose"}` },
        el("p", { class: "score" }, `${b.correct} / ${b.questions.length} 正解（${Math.round(rate * 100)}%）`),
        b.mode === "chapter" && cleared ? el("p", { class: "stars", "aria-label": `星${stars}個` }, starText(stars)) : null,
        el("p", {}, `獲得 XP：+${b.xpGained}${firstClear ? "（初回撃破ボーナス込み）" : ""}`),
        rankUp ? el("p", { class: "rankup" }, `称号が「${rankUp}」に上がった！`) : null,
        !cleared && b.mode === "chapter" ? el("p", {}, `撃破には ${Math.ceil(b.questions.length * PASS_RATE)}問以上の正解が必要。間違えた問題は復習ダンジョンに送られた。`) : null,
        !cleared && b.mode === "final" ? el("p", {}, `合格ラインは ${Math.ceil(b.questions.length * FINAL_PASS_RATE)}問。苦手な章を復習してから再挑戦しよう。`) : null,
        b.mode === "chapter" && cleared && stars < 3 ? el("p", { class: "muted" }, "全問正解で★3。間違えた問題は復習ダンジョンで2回連続正解すると卒業できる。") : null
      ),
      el(
        "div",
        { class: "actions" },
        b.mode === "final" && cleared ? link("修了証を受け取る", "#/certificate", "btn btn-gold") : null,
        ch && cleared && next ? link(`次の章へ：${next.title}`, `#/ch/${next.id}`, "btn btn-primary") : null,
        ch && cleared && !next && finalUnlocked() && !state.final.cleared ? button("最終試験に挑む", startFinal, "btn btn-gold") : null,
        ch ? button("もう一度戦う", () => startChapterBattle(ch), cleared ? "btn" : "btn btn-primary") : null,
        ch && !cleared ? link("講義を見直す", `#/ch/${ch.id}/1`, "btn") : null,
        b.mode === "final" && !cleared ? button("もう一度受ける", startFinal, "btn btn-primary") : null,
        b.mode === "review" && wrongIds().length ? button("続けて復習する", startReview, "btn btn-primary") : null,
        link("マップへ", "#/", "btn btn-ghost")
      ),
      el("h2", { class: "section-title" }, "振り返り"),
      el(
        "ol",
        { class: "review-list" },
        b.questions.map((q) => {
          const status = answered.has(q.id) ? (answered.get(q.id) ? "ok" : "ng") : "skip";
          const mark = status === "ok" ? "○" : status === "ng" ? "×" : "－";
          return el(
            "li",
            { class: `review-item is-${status}` },
            el(
              "details",
              { open: status === "ng" },
              el("summary", {}, el("span", { class: "mark", "aria-label": status === "ok" ? "正解" : status === "ng" ? "不正解" : "未回答" }, mark), el("span", {}, rich(q.q))),
              correctAnswerView(q),
              el("p", { class: "explain-text" }, rich(q.exp))
            )
          );
        })
      )
    );
  }

  // ---------- 用語図鑑 ----------

  function renderGlossary() {
    const allTerms = chapters.reduce((s, ch) => s + ch.terms.length, 0);
    const unlocked = chapters.filter(termsUnlocked).reduce((s, ch) => s + ch.terms.length, 0);
    const search = el("input", { type: "search", class: "text-input", placeholder: "用語を検索（例：XSS、ハッシュ）", "aria-label": "用語を検索" });
    const list = el("div", { class: "glossary" });

    const draw = () => {
      const query = normalize(search.value);
      list.replaceChildren();
      for (const ch of chapters) {
        if (!termsUnlocked(ch)) {
          if (!query) list.append(el("section", { class: "gloss-group is-locked" }, el("h2", {}, `第${ch.no}章 ${ch.title}`), el("p", { class: "muted" }, `🔒 ${ch.terms.length}語 — この章の講義を最後まで読むと解放`)));
          continue;
        }
        const terms = ch.terms.filter(([t, d]) => !query || normalize(t).includes(query) || normalize(d).includes(query));
        if (!terms.length) continue;
        list.append(
          el(
            "section",
            { class: "gloss-group" },
            el("h2", {}, el("a", { href: `#/ch/${ch.id}` }, `第${ch.no}章 ${ch.title}`)),
            el("dl", {}, terms.map(([t, d]) => [el("dt", {}, t), el("dd", {}, rich(d))]))
          )
        );
      }
      if (!list.children.length) list.append(el("p", { class: "muted" }, "該当する用語がありません。"));
    };
    search.addEventListener("input", draw);
    draw();

    app.append(heading("用語図鑑", `${unlocked} / ${allTerms} 語を解放`), search, list);
  }

  // ---------- 設定・遊び方 ----------

  function renderSettings() {
    const name = el("input", { type: "text", class: "text-input", maxlength: "24", value: state.name, placeholder: "修了証に載る名前", "aria-label": "プレイヤー名" });
    const free = el("input", { type: "checkbox", id: "free-mode", checked: state.freeMode });
    free.addEventListener("change", () => {
      state.freeMode = free.checked;
      save();
    });
    app.append(
      heading("設定"),
      el(
        "section",
        { class: "panel" },
        el("h2", {}, "プレイヤー名"),
        el("p", { class: "muted" }, "修了証に表示されます。このブラウザ内にだけ保存されます。"),
        name,
        el("div", { class: "submit-row" }, button("保存", () => {
          state.name = name.value.trim().slice(0, 24);
          save();
          alert("保存しました。");
        }, "btn btn-primary"))
      ),
      el(
        "section",
        { class: "panel" },
        el("h2", {}, "自由学習モード"),
        el("p", { class: "muted" }, "全章を最初から解放します。経験者が苦手分野だけ攻略したいとき向け。最終試験は全章撃破まで解放されません。"),
        el("label", { class: "toggle", for: "free-mode" }, free, el("span", {}, "全章を解放する"))
      ),
      el(
        "section",
        { class: "panel danger" },
        el("h2", {}, "データの初期化"),
        el("p", { class: "muted" }, "進捗・XP・復習リスト・修了記録をすべて消します。元に戻せません。"),
        button("すべての進捗を消す", () => {
          if (!confirm("本当にすべての進捗を消しますか？ この操作は取り消せません。")) return;
          state = defaultState();
          save();
          go("#/");
        }, "btn btn-danger")
      )
    );
  }

  function renderHelp() {
    app.append(
      heading("遊び方", "HOW TO PLAY"),
      el(
        "section",
        { class: "panel prose" },
        el("h2", {}, "ゲームの流れ"),
        el(
          "ol",
          {},
          el("li", {}, "マップから章を選び、講義カードを読む（1章 5〜7枚）。"),
          el("li", {}, `ボス戦に挑む。全問の${PASS_RATE * 100}%以上に正解すると撃破。間違えるとライフが減り、尽きると敗北。`),
          el("li", {}, "撃破すると次の章が解放される。全問正解で★3。"),
          el("li", {}, `全18章を撃破すると最終試験（全範囲から${FINAL_SIZE}問・合格${FINAL_PASS_RATE * 100}%）が解放される。合格で修了証。`)
        ),
        el("h2", {}, "問題の形式"),
        el(
          "ul",
          {},
          el("li", {}, el("strong", {}, "選択："), "1つ選ぶとすぐ判定。キーボードの数字キーでも選べる。"),
          el("li", {}, el("strong", {}, "すべて選べ："), "正しいものを全部選んで「決定」。過不足があると不正解。"),
          el("li", {}, el("strong", {}, "並べ替え："), "↑↓で正しい順序に並べる。"),
          el("li", {}, el("strong", {}, "入力："), "答えを打ち込む。大文字・小文字と空白は区別しない。"),
          el("li", {}, el("strong", {}, "見つけ出せ："), "メール・ログ・コードから怪しい行を全部選ぶ。"),
          el("li", {}, el("strong", {}, "組み合わせ："), "左の用語に合う説明を選ぶ。")
        ),
        el("h2", {}, "復習ダンジョン"),
        el("p", {}, "間違えた問題はすべて復習リストに入る。復習ダンジョンで2回連続正解すると卒業。忘れかけた頃にもう一度解くのが、記憶を定着させるいちばんの近道。"),
        el("h2", {}, "このゲームで届く範囲"),
        el("p", {}, "全章をクリアすると、セキュリティの主要分野（原則・脅威・暗号・認証・ネットワーク・OS・マルウェア・人・Web・開発・クラウド・IoT/AI・検知・インシデント対応・法令・防御の設計）の「地図」と判断の軸が手に入る。ただし実務の腕前は手を動かしてこそ身につく。修了後は修了証ページの資料を手がかりに、自分の環境で設定やログを実際に確かめてほしい。"),
        el("h2", {}, "このページ自体の安全対策"),
        el("p", {}, "このゲームは Content-Security-Policy で外部スクリプトと外部通信を禁止し、画面の描画に innerHTML を使っていない（第10章・第11章の内容の実践）。")
      )
    );
  }

  // ---------- 修了証 ----------

  function renderCertificate() {
    const name = state.name || "名もなき守り手";
    app.append(
      el(
        "section",
        { class: "certificate" },
        el("p", { class: "eyebrow" }, "CERTIFICATE OF COMPLETION"),
        el("h1", { tabindex: "-1" }, "修了証"),
        el("p", { class: "cert-name" }, `${name} 殿`),
        el("p", {}, `あなたはセキュリティ・クエスト全${chapters.length}章のボスを撃破し、最終試験に合格したことをここに証します。`),
        el("p", { class: "cert-rank" }, `称号：${FINAL_RANK}`),
        el("p", { class: "muted" }, `最終試験 最高得点 ${Math.round((state.final.best || 0) * 100)}% ／ ★ ${totalStars()}/${chapters.length * 3} ／ ${state.final.date || ""}`),
        el("p", { class: "muted small" }, "※ ゲーム内の記念証です。公的な資格ではありません。")
      ),
      el(
        "div",
        { class: "actions no-print" },
        button("印刷する", () => window.print(), "btn"),
        link("マップへ", "#/", "btn btn-ghost")
      ),
      el(
        "section",
        { class: "panel prose no-print" },
        el("h2", {}, "ここから先へ — 知識を腕前に変える"),
        el("p", {}, "地図は手に入った。次は実際に歩く番。一次情報に当たる習慣をつけ、手を動かすのは自分の環境か、許可された環境だけにすること（第17章）。"),
        el(
          "ul",
          {},
          resource("OWASP Top 10", "https://owasp.org/www-project-top-ten/", "Web アプリの重大リスクの原典。第10〜12章の続き。"),
          resource("NIST Cybersecurity Framework", "https://www.nist.gov/cyberframework", "組織の対策を整理する枠組み。第17〜18章の続き。"),
          resource("JPCERT/CC", "https://www.jpcert.or.jp/", "国内の注意喚起・インシデント対応の資料。第15〜16章の続き。"),
          resource("IPA 情報セキュリティ", "https://www.ipa.go.jp/security/", "国内の脅威動向・ガイドライン。情報処理安全確保支援士試験の範囲確認にも。"),
          resource("MITRE ATT&CK", "https://attack.mitre.org/", "攻撃者の戦術・技術の辞書。検知ルールを考えるときの共通言語。")
        )
      )
    );
  }

  function resource(name, url, note) {
    return el("li", {}, el("a", { href: url, target: "_blank", rel: "noreferrer" }, name), ` — ${note}`);
  }

  // ---------- キーボード操作 ----------

  document.addEventListener("keydown", (e) => {
    if (!location.hash.startsWith("#/battle") || !battle) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const q = battle.questions[battle.index];
    if (!battle.answered && q.type === "choice" && /^[1-9]$/.test(e.key)) {
      const idx = battle.view.order[Number(e.key) - 1];
      if (idx !== undefined) submit(idx);
    }
  });

  if (!chapters.length) {
    app.append(el("p", {}, "データの読み込みに失敗しました。ページを再読み込みしてください。"));
    return;
  }
  render();
})();
