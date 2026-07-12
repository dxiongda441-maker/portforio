(function () {
  const quotes = window.DAILY_QUOTES || [];
  const startDate = new Date("2026-07-03T00:00:00+09:00");
  const storageKey = "one-day-one-quote-state";

  const els = {
    todayDate: document.getElementById("todayDate"),
    favoriteButton: document.getElementById("favoriteButton"),
    portrait: document.getElementById("portraitInitials"),
    personRole: document.getElementById("personRole"),
    todayTitle: document.getElementById("todayTitle"),
    quoteText: document.getElementById("quoteText"),
    quoteTranslation: document.getElementById("quoteTranslation"),
    sourceLabel: document.getElementById("sourceLabel"),
    sourceLink: document.getElementById("sourceLink"),
    personBio: document.getElementById("personBio"),
    dailyAction: document.getElementById("dailyAction"),
    doneButton: document.getElementById("doneButton"),
    memoInput: document.getElementById("memoInput"),
    saveState: document.getElementById("saveState"),
    feedbackInput: document.getElementById("feedbackInput"),
    feedbackSaveState: document.getElementById("feedbackSaveState"),
    clearFeedbackButton: document.getElementById("clearFeedbackButton"),
    streakCount: document.getElementById("streakCount"),
    doneCount: document.getElementById("doneCount"),
    favoriteCount: document.getElementById("favoriteCount"),
    quoteList: document.getElementById("quoteList"),
    categoryFilter: document.getElementById("categoryFilter"),
    settingsButton: document.getElementById("settingsButton"),
    settingsDialog: document.getElementById("settingsDialog"),
    notifyTime: document.getElementById("notifyTime"),
    notificationButton: document.getElementById("notificationButton"),
    testNotificationButton: document.getElementById("testNotificationButton"),
    notificationStatus: document.getElementById("notificationStatus"),
    secureStatus: document.getElementById("secureStatus"),
    permissionStatus: document.getElementById("permissionStatus"),
    workerStatus: document.getElementById("workerStatus"),
    showTranslation: document.getElementById("showTranslation"),
    useSequential: document.getElementById("useSequential")
  };

  let state = readState();
  let currentQuote = getTodayQuote();
  let notificationTimer = null;
  let diagnosticsReadyHooked = false;

  render();
  bindEvents();
  registerServiceWorker();
  scheduleNotification();
  refreshDiagnostics();

  function readState() {
    try {
      return {
        favorites: [],
        done: {},
        memos: {},
        feedback: "",
        notifyTime: "07:00",
        showTranslation: true,
        useSequential: true,
        ...JSON.parse(localStorage.getItem(storageKey) || "{}")
      };
    } catch (error) {
      return {
        favorites: [],
        done: {},
        memos: {},
        feedback: "",
        notifyTime: "07:00",
        showTranslation: true,
        useSequential: true
      };
    }
  }

  function writeState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function getTodayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getTodayQuote() {
    if (!quotes.length) return null;
    if (!state.useSequential) {
      const dayKey = getTodayKey();
      let hash = 0;
      for (const char of dayKey) hash = (hash * 31 + char.charCodeAt(0)) % 100000;
      return quotes[hash % quotes.length];
    }
    const now = new Date();
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.max(0, Math.floor((today - start) / 86400000));
    return quotes[diffDays % quotes.length];
  }

  function render() {
    currentQuote = getTodayQuote();
    if (!currentQuote) return;

    const todayKey = getTodayKey();
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      month: "long",
      day: "numeric",
      weekday: "short"
    });

    els.todayDate.textContent = formatter.format(new Date());
    els.portrait.textContent = currentQuote.initials;
    els.portrait.style.backgroundColor = currentQuote.accent;
    els.personRole.textContent = currentQuote.role;
    els.todayTitle.textContent = currentQuote.person;
    els.quoteText.textContent = currentQuote.quote;
    els.quoteTranslation.textContent = currentQuote.translation;
    els.quoteTranslation.hidden = !state.showTranslation;
    els.sourceLabel.textContent = currentQuote.sourceTitle;
    els.sourceLink.href = currentQuote.sourceUrl;
    els.personBio.textContent = currentQuote.bio;
    els.dailyAction.textContent = currentQuote.action;
    els.memoInput.value = state.memos[todayKey] || "";
    els.feedbackInput.value = state.feedback || "";

    const isFavorite = state.favorites.includes(currentQuote.id);
    els.favoriteButton.textContent = isFavorite ? "保存済み" : "保存";
    els.favoriteButton.classList.toggle("is-active", isFavorite);

    const isDone = Boolean(state.done[todayKey]);
    els.doneButton.textContent = isDone ? "実行済み" : "実行した";
    els.doneButton.classList.toggle("is-done", isDone);

    els.notifyTime.value = state.notifyTime;
    els.showTranslation.checked = state.showTranslation;
    els.useSequential.checked = state.useSequential;

    renderStats();
    renderArchive();
    updateNotificationButton();
  }

  function renderStats() {
    const doneKeys = Object.keys(state.done).filter((key) => state.done[key]);
    els.doneCount.textContent = String(doneKeys.length);
    els.favoriteCount.textContent = String(state.favorites.length);
    els.streakCount.textContent = String(calculateStreak(doneKeys));
  }

  function calculateStreak(doneKeys) {
    const doneSet = new Set(doneKeys);
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (doneSet.has(getTodayKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function renderArchive() {
    const category = els.categoryFilter.value;
    const visibleQuotes = quotes.filter((item) => category === "all" || item.category === category);
    els.quoteList.innerHTML = visibleQuotes
      .map((item) => {
        const saved = state.favorites.includes(item.id) ? "・保存済み" : "";
        return `
          <article class="quote-item">
            <h4>${escapeHtml(item.person)} <span>${saved}</span></h4>
            <p>${escapeHtml(item.quote)}</p>
          </article>
        `;
      })
      .join("");
  }

  function bindEvents() {
    els.settingsButton.addEventListener("click", () => {
      els.settingsDialog.showModal();
      refreshDiagnostics();
    });

    els.favoriteButton.addEventListener("click", () => {
      const exists = state.favorites.includes(currentQuote.id);
      state.favorites = exists
        ? state.favorites.filter((id) => id !== currentQuote.id)
        : [...state.favorites, currentQuote.id];
      writeState();
      render();
    });

    els.doneButton.addEventListener("click", () => {
      const todayKey = getTodayKey();
      state.done[todayKey] = !state.done[todayKey];
      writeState();
      render();
    });

    els.memoInput.addEventListener("input", () => {
      const todayKey = getTodayKey();
      state.memos[todayKey] = els.memoInput.value;
      writeState();
      els.saveState.textContent = "保存しました";
      window.clearTimeout(els.saveState.dataset.timer);
      els.saveState.dataset.timer = window.setTimeout(() => {
        els.saveState.textContent = "自動保存されます";
      }, 1200);
    });

    els.feedbackInput.addEventListener("input", () => {
      state.feedback = els.feedbackInput.value;
      writeState();
      els.feedbackSaveState.textContent = "保存しました";
      window.clearTimeout(els.feedbackSaveState.dataset.timer);
      els.feedbackSaveState.dataset.timer = window.setTimeout(() => {
        els.feedbackSaveState.textContent = "自動保存されます";
      }, 1200);
    });

    els.clearFeedbackButton.addEventListener("click", () => {
      if (!state.feedback) return;
      state.feedback = "";
      els.feedbackInput.value = "";
      writeState();
      els.feedbackSaveState.textContent = "消去しました";
      window.clearTimeout(els.feedbackSaveState.dataset.timer);
      els.feedbackSaveState.dataset.timer = window.setTimeout(() => {
        els.feedbackSaveState.textContent = "自動保存されます";
      }, 1200);
    });

    els.categoryFilter.addEventListener("change", renderArchive);

    els.notifyTime.addEventListener("change", () => {
      state.notifyTime = els.notifyTime.value || "07:00";
      writeState();
      scheduleNotification();
    });

    els.showTranslation.addEventListener("change", () => {
      state.showTranslation = els.showTranslation.checked;
      writeState();
      render();
    });

    els.useSequential.addEventListener("change", () => {
      state.useSequential = els.useSequential.checked;
      writeState();
      render();
    });

    els.notificationButton.addEventListener("click", async () => {
      if (!("Notification" in window)) {
        alert("このブラウザは通知に対応していません。");
        return;
      }
      const permission = await Notification.requestPermission();
      updateNotificationButton();
      if (permission === "granted") {
        scheduleNotification(true);
      }
    });

    els.testNotificationButton.addEventListener("click", async () => {
      if (!("Notification" in window)) {
        alert("このブラウザは通知に対応していません。");
        return;
      }
      if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        updateNotificationButton();
        if (permission !== "granted") return;
      }
      showQuoteNotification("通知テスト");
    });
  }

  function updateNotificationButton() {
    if (!("Notification" in window)) {
      els.notificationButton.textContent = "通知非対応";
      els.notificationButton.disabled = true;
      els.testNotificationButton.disabled = true;
      els.notificationStatus.textContent = "このブラウザでは通知を使えません。";
      refreshDiagnostics();
      return;
    }
    const permission = Notification.permission;
    els.notificationButton.textContent = permission === "granted" ? "通知は許可済み" : "通知を許可する";
    els.testNotificationButton.disabled = permission === "denied";
    if (permission === "granted") {
      els.notificationStatus.textContent = `毎日 ${state.notifyTime} に通知します。ブラウザやスマホの省電力設定により、完全に閉じた状態では届かない場合があります。`;
    } else if (permission === "denied") {
      els.notificationStatus.textContent = "通知がブロックされています。スマホのブラウザ設定から許可してください。";
    } else {
      els.notificationStatus.textContent = "HTTPS公開後、通知を許可すると設定した時間に知らせます。";
    }
    refreshDiagnostics();
  }

  function scheduleNotification(showConfirmation = false) {
    if (notificationTimer) window.clearTimeout(notificationTimer);
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const [hours, minutes] = state.notifyTime.split(":").map(Number);
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);
    if (next <= new Date()) next.setDate(next.getDate() + 1);

    notificationTimer = window.setTimeout(() => {
      showQuoteNotification("1日1名言");
      scheduleNotification();
    }, next - new Date());

    if (showConfirmation) {
      showQuoteNotification("通知を設定しました", `毎日 ${state.notifyTime} に名言を確認します。`);
    }
  }

  function showQuoteNotification(title, body) {
    const quote = getTodayQuote();
    const notificationBody = body || `${quote.person}: ${quote.quote}`;
    navigator.serviceWorker?.ready.then((registration) => {
      registration.showNotification(title, {
        body: notificationBody,
        icon: "./icon.svg",
        badge: "./icon.svg"
      });
    }).catch(() => {
      new Notification(title, { body: notificationBody });
    });
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js")
        .then(refreshDiagnostics)
        .catch(refreshDiagnostics);
    }
  }

  async function refreshDiagnostics() {
    if (!els.secureStatus) return;

    const isLocal = location.hostname === "127.0.0.1" || location.hostname === "localhost";
    els.secureStatus.textContent = window.isSecureContext || isLocal ? "OK" : "未対応";

    if (!("Notification" in window)) {
      els.permissionStatus.textContent = "非対応";
    } else if (Notification.permission === "granted") {
      els.permissionStatus.textContent = "許可済み";
    } else if (Notification.permission === "denied") {
      els.permissionStatus.textContent = "ブロック中";
    } else {
      els.permissionStatus.textContent = "未許可";
    }

    if (!("serviceWorker" in navigator)) {
      els.workerStatus.textContent = "非対応";
      return;
    }

    try {
      if (!diagnosticsReadyHooked && navigator.serviceWorker.ready) {
        diagnosticsReadyHooked = true;
        navigator.serviceWorker.ready.then(refreshDiagnostics).catch(() => {});
      }
      const registration = await navigator.serviceWorker.getRegistration();
      els.workerStatus.textContent = registration ? "登録済み" : "未登録";
    } catch (error) {
      els.workerStatus.textContent = "確認不可";
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
