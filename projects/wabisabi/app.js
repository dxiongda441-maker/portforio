const defaultThemes = [
  {
    id: "health",
    name: "健康寿命",
    prompt: "最近学んだ健康習慣の中で、自分が一番取り入れたいものは？",
    template: ["今日学んだこと", "なぜ大事だと思ったか", "自分の生活でどう使うか"],
  },
  {
    id: "money",
    name: "お金・副業",
    prompt: "今日学んだ稼ぎ方やお金の考え方を、自分なら何から試す？",
    template: ["学んだ考え方", "どこが現実的だと思ったか", "最初の小さな行動"],
  },
  {
    id: "business",
    name: "ビジネス・職場",
    prompt: "職場でうまくやるために、明日ひとつ試すなら何？",
    template: ["今日の気づき", "うまくいった点・改善点", "明日試す行動"],
  },
  {
    id: "mental",
    name: "メンタル",
    prompt: "今の自分の感情を整えるために、どんな小さな対処ができる？",
    template: ["今感じていること", "そう感じた理由", "自分にできる小さな対処"],
  },
  {
    id: "habit",
    name: "習慣",
    prompt: "続けたい習慣を、もっと小さくすると何になる？",
    template: ["続けたいこと", "続かない理由", "今日できる最小単位"],
  },
  {
    id: "relationship",
    name: "人間関係",
    prompt: "最近の人間関係で学んだことを、次にどう活かす？",
    template: ["起きたこと", "そこから学んだこと", "次に変える行動"],
  },
  {
    id: "free",
    name: "自由テーマ",
    prompt: "今いちばん言葉にしておきたい学びは何？",
    template: ["結論", "理由", "自分への応用"],
  },
];

const state = {
  mediaRecorder: null,
  chunks: [],
  timerId: null,
  remaining: 180,
  currentAudioData: "",
  recognition: null,
  liveTranscript: "",
};

const storage = {
  getThemes() {
    return JSON.parse(localStorage.getItem("themes") || "null") || defaultThemes;
  },
  setThemes(themes) {
    localStorage.setItem("themes", JSON.stringify(themes));
  },
  getRecords() {
    return JSON.parse(localStorage.getItem("records") || "[]");
  },
  setRecords(records) {
    localStorage.setItem("records", JSON.stringify(records));
  },
};

const $ = (id) => document.getElementById(id);

function formatDateTime(iso) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function todayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
}

function dailyTheme(themes) {
  const seed = [...todayKey()].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return themes[seed % themes.length];
}

function renderThemeOptions() {
  const themes = storage.getThemes();
  const selectedTheme = $("themeSelect").value || dailyTheme(themes).id;
  $("themeSelect").innerHTML = themes
    .map((theme) => `<option value="${theme.id}">${theme.name}</option>`)
    .join("");
  $("filterTheme").innerHTML = `<option value="all">すべてのテーマ</option>${themes
    .map((theme) => `<option value="${theme.id}">${theme.name}</option>`)
    .join("")}`;
  $("studioRecordSelect").innerHTML = "";
  if (themes.some((theme) => theme.id === selectedTheme)) {
    $("themeSelect").value = selectedTheme;
  }
  renderPrompt();
}

function renderPrompt() {
  const themes = storage.getThemes();
  const theme = themes.find((item) => item.id === $("themeSelect").value) || themes[0];
  $("dailyPrompt").textContent = theme.prompt;
  $("talkTemplate").innerHTML = theme.template.map((line) => `<li>${line}</li>`).join("");
}

function renderThemes() {
  const themes = storage.getThemes();
  $("themeList").innerHTML = themes
    .map(
      (theme) => `
        <div class="theme-row">
          <strong>${theme.name}</strong>
          <span>${theme.prompt}</span>
          <button class="danger delete-theme" data-id="${theme.id}">削除</button>
        </div>
      `
    )
    .join("");
}

function renderRecords() {
  const records = storage.getRecords();
  const themes = storage.getThemes();
  const themeMap = Object.fromEntries(themes.map((theme) => [theme.id, theme.name]));
  const filter = $("filterTheme").value || "all";
  const sorted = [...records]
    .filter((record) => filter === "all" || record.themeId === filter)
    .sort((a, b) => {
      const diff = new Date(b.createdAt) - new Date(a.createdAt);
      return $("sortSelect").value === "oldest" ? -diff : diff;
    });

  if (!sorted.length) {
    $("recordList").innerHTML = `<div class="empty">まだ記録がありません。最初の3分を残しましょう。</div>`;
  } else {
    const template = $("recordItemTemplate");
    $("recordList").innerHTML = "";
    sorted.forEach((record) => {
      const node = template.content.cloneNode(true);
      node.querySelector(".record-date").textContent = formatDateTime(record.createdAt);
      node.querySelector(".record-title").textContent = record.title || "無題の三分録";
      node.querySelector(".record-theme").textContent = themeMap[record.themeId] || record.themeName || "テーマ未設定";
      node.querySelector(".record-memo").textContent = record.memo || "メモなし";
      node.querySelector("audio").src = record.audioData;
      node.querySelector(".use-in-studio").dataset.id = record.id;
      node.querySelector(".delete-record").dataset.id = record.id;
      $("recordList").appendChild(node);
    });
  }
  renderStudioSelector();
}

function renderStudioSelector(selectedId) {
  const records = storage.getRecords().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (!records.length) {
    $("studioRecordSelect").innerHTML = `<option>記録がありません</option>`;
    $("studioMeta").textContent = "発信用に変換するには、まず録音を保存してください。";
    $("studioAudio").removeAttribute("src");
    return;
  }
  $("studioRecordSelect").innerHTML = records
    .map((record) => `<option value="${record.id}">${formatDateTime(record.createdAt)} / ${record.title || "無題"}</option>`)
    .join("");
  $("studioRecordSelect").value = selectedId || records[0].id;
  loadStudioRecord();
}

function loadStudioRecord() {
  const record = storage.getRecords().find((item) => item.id === $("studioRecordSelect").value);
  if (!record) return;
  $("studioMeta").textContent = `${formatDateTime(record.createdAt)} / ${record.themeName}`;
  $("studioAudio").src = record.audioData;
  $("sourceText").value = record.transcript || record.memo || "";
  $("xOutput").value = record.xDraft || "";
  $("substackOutput").value = record.substackDraft || "";
}

function updateTimer() {
  const minutes = String(Math.floor(state.remaining / 60)).padStart(2, "0");
  const seconds = String(state.remaining % 60).padStart(2, "0");
  $("timer").textContent = `${minutes}:${seconds}`;
}

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  state.chunks = [];
  state.currentAudioData = "";
  state.liveTranscript = "";
  state.mediaRecorder = new MediaRecorder(stream);
  state.mediaRecorder.ondataavailable = (event) => state.chunks.push(event.data);
  state.mediaRecorder.onstop = () => {
    const blob = new Blob(state.chunks, { type: state.mediaRecorder.mimeType || "audio/webm" });
    const reader = new FileReader();
    reader.onloadend = () => {
      state.currentAudioData = reader.result;
      $("previewAudio").src = state.currentAudioData;
      $("previewAudio").hidden = false;
      saveRecording();
    };
    reader.readAsDataURL(blob);
    stream.getTracks().forEach((track) => track.stop());
  };
  state.mediaRecorder.start();
  startSpeechRecognition();
  state.remaining = 180;
  updateTimer();
  $("recordButton").disabled = true;
  $("stopButton").disabled = false;
  $("recordStatus").textContent = "録音中です。型に沿って、今日の学びをひとつ話してください。";
  state.timerId = setInterval(() => {
    state.remaining -= 1;
    updateTimer();
    if (state.remaining <= 0) stopRecording();
  }, 1000);
}

function stopRecording() {
  clearInterval(state.timerId);
  stopSpeechRecognition();
  if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
    state.mediaRecorder.stop();
  }
  $("recordButton").disabled = false;
  $("stopButton").disabled = true;
}

function startSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;
  const recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    let text = "";
    for (let i = 0; i < event.results.length; i += 1) {
      text += event.results[i][0].transcript;
    }
    state.liveTranscript = text.trim();
  };
  recognition.onerror = () => {
    state.liveTranscript = "";
  };
  recognition.start();
  state.recognition = recognition;
}

function stopSpeechRecognition() {
  if (!state.recognition) return;
  try {
    state.recognition.stop();
  } catch {
    // Recognition may already be stopped by the browser.
  }
  state.recognition = null;
}

function saveRecording() {
  const themes = storage.getThemes();
  const theme = themes.find((item) => item.id === $("themeSelect").value) || themes[0];
  const now = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    title: $("recordTitle").value.trim() || `${theme.name}の三分録`,
    memo: $("recordMemo").value.trim(),
    themeId: theme.id,
    themeName: theme.name,
    prompt: theme.prompt,
    template: theme.template,
    audioData: state.currentAudioData,
    createdAt: now,
    transcript: state.liveTranscript,
    xDraft: "",
    substackDraft: "",
  };
  const records = storage.getRecords();
  storage.setRecords([record, ...records]);
  $("recordTitle").value = "";
  $("recordMemo").value = "";
  $("recordStatus").textContent = `${formatDateTime(now)} に保存しました。記録画面から日付順・テーマ別に確認できます。`;
  state.remaining = 180;
  updateTimer();
  renderRecords();
}

function makeXPost(text) {
  const cleaned = text.trim();
  if (!cleaned) return "変換したい録音の要点や文字起こしを入力してください。";
  const first = cleaned.split(/[。！？\n]/).find(Boolean) || cleaned;
  return [
    "今日の学び。",
    "",
    first.length > 70 ? `${first.slice(0, 70)}...` : first,
    "",
    "大事なのは、知識で終わらせずに、自分の生活で試せる形まで小さくすること。",
    "",
    "今日からひとつだけ行動に変えてみる。",
  ].join("\n");
}

function makeSubstack(text) {
  const cleaned = text.trim();
  if (!cleaned) return "変換したい録音の要点や文字起こしを入力してください。";
  const lines = cleaned
    .split(/\n|。/)
    .map((line) => line.trim())
    .filter(Boolean);
  const titleSeed = lines[0] || "今日の学び";
  return [
    `# ${titleSeed.length > 28 ? `${titleSeed.slice(0, 28)}...` : titleSeed}`,
    "",
    "今日は、インプットした内容を自分の言葉で整理してみました。",
    "",
    "## 今日学んだこと",
    cleaned,
    "",
    "## なぜ大事だと思ったか",
    "知識は聞いただけでは流れてしまいます。自分の言葉で説明すると、どこまで理解しているかが見えます。",
    "",
    "## 自分の生活への応用",
    "まずは大きく変えようとせず、今日からできる小さな行動に落とし込みます。",
    "",
    "## 読者への問い",
    "あなたなら、この学びを今日どんな行動に変えますか？",
  ].join("\n");
}

function saveDrafts() {
  const id = $("studioRecordSelect").value;
  const records = storage.getRecords().map((record) =>
    record.id === id
      ? {
          ...record,
          transcript: $("sourceText").value,
          xDraft: $("xOutput").value,
          substackDraft: $("substackOutput").value,
        }
      : record
  );
  storage.setRecords(records);
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
      tab.classList.add("active");
      $(tab.dataset.view).classList.add("active");
    });
  });

  $("themeSelect").addEventListener("change", renderPrompt);
  $("recordButton").addEventListener("click", () => {
    startRecording().catch(() => {
      $("recordStatus").textContent = "マイクの利用が許可されませんでした。ブラウザの権限設定を確認してください。";
      $("recordButton").disabled = false;
      $("stopButton").disabled = true;
    });
  });
  $("stopButton").addEventListener("click", stopRecording);
  $("sortSelect").addEventListener("change", renderRecords);
  $("filterTheme").addEventListener("change", renderRecords);
  $("studioRecordSelect").addEventListener("change", loadStudioRecord);
  $("makeXButton").addEventListener("click", () => {
    $("xOutput").value = makeXPost($("sourceText").value);
    saveDrafts();
  });
  $("makeSubstackButton").addEventListener("click", () => {
    $("substackOutput").value = makeSubstack($("sourceText").value);
    saveDrafts();
  });
  $("sourceText").addEventListener("input", saveDrafts);
  $("xOutput").addEventListener("input", saveDrafts);
  $("substackOutput").addEventListener("input", saveDrafts);

  $("recordList").addEventListener("click", (event) => {
    const studioButton = event.target.closest(".use-in-studio");
    const deleteButton = event.target.closest(".delete-record");
    if (studioButton) {
      renderStudioSelector(studioButton.dataset.id);
      document.querySelector('[data-view="studioView"]').click();
    }
    if (deleteButton && confirm("この録音を削除しますか？")) {
      storage.setRecords(storage.getRecords().filter((record) => record.id !== deleteButton.dataset.id));
      renderRecords();
    }
  });

  $("themeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("newThemeName").value.trim();
    const prompt = $("newThemePrompt").value.trim();
    if (!name || !prompt) return;
    const themes = storage.getThemes();
    themes.push({
      id: crypto.randomUUID(),
      name,
      prompt,
      template: ["今日学んだこと", "なぜ大事だと思ったか", "自分ならどう使うか"],
    });
    storage.setThemes(themes);
    $("newThemeName").value = "";
    $("newThemePrompt").value = "";
    renderThemeOptions();
    renderThemes();
    renderRecords();
  });

  $("themeList").addEventListener("click", (event) => {
    const button = event.target.closest(".delete-theme");
    if (!button) return;
    const themes = storage.getThemes();
    if (themes.length <= 1) {
      alert("テーマは最低1つ必要です。");
      return;
    }
    storage.setThemes(themes.filter((theme) => theme.id !== button.dataset.id));
    renderThemeOptions();
    renderThemes();
    renderRecords();
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!location.protocol.startsWith("http")) return;
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

function init() {
  if (!localStorage.getItem("themes")) storage.setThemes(defaultThemes);
  renderThemeOptions();
  renderThemes();
  renderRecords();
  updateTimer();
  bindEvents();
  registerServiceWorker();
}

init();
