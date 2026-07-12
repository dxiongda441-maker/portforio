const STORAGE_KEY = "reading-shelf-books";

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `book-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const sampleBooks = [
  {
    id: createId(),
    title: "深く考える読書",
    author: "Sample Author",
    sessions: [
      { date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), pages: 120, minutes: 100 },
      { date: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10), pages: 128, minutes: 110 }
    ],
    status: "finished",
    rating: 4,
    cover: "",
    learnings: ["問いを立てながら読む方法", "実生活に移せる知識の拾い方", "読後メモを資産にする習慣"],
    memo: "章ごとに一つだけ行動へ落とすと、読みっぱなしになりにくい。",
    todos: ["次の本から読む前の問いを3つ書く", "週末にメモを見返す"],
    reflection: "数日後に見返すと、最初の理解と違う気づきが残せる。",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: createId(),
    title: "Cafe Strategy Notes",
    author: "M. Tanaka",
    sessions: [
      { date: new Date().toISOString().slice(0, 10), pages: 86, minutes: 70 }
    ],
    status: "reading",
    rating: 3.5,
    cover: "",
    learnings: ["ブランドの空気感の作り方", "常連が戻る体験設計", "価格以外の価値の伝え方"],
    memo: "居心地は内装だけではなく、注文から席に着くまでの流れで決まる。",
    todos: ["気に入った店の導線を観察する"],
    reflection: "",
    createdAt: new Date().toISOString()
  }
];

let books = loadBooks();
let currentFilter = "all";
let coverData = "";
let editingBookId = null;

const views = {
  dashboard: document.querySelector("#dashboardView"),
  add: document.querySelector("#addView"),
  stats: document.querySelector("#statsView")
};

const bookForm = document.querySelector("#bookForm");
const learningList = document.querySelector("#learningList");
const todoList = document.querySelector("#todoList");
const sessionList = document.querySelector("#sessionList");
const entryTemplate = document.querySelector("#entryTemplate");
const sessionTemplate = document.querySelector("#sessionTemplate");
const coverInput = document.querySelector("#coverInput");
const coverPreview = document.querySelector("#coverPreview");
const coverText = document.querySelector("#coverText");
const ratingInput = document.querySelector("#ratingInput");
const ratingOutput = document.querySelector("#ratingOutput");

function loadBooks() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleBooks));
    return sampleBooks;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveBooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function switchView(name) {
  Object.entries(views).forEach(([viewName, element]) => {
    element.classList.toggle("active", viewName === name);
  });
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === name);
  });
}

function createInputLine(container, placeholder, value = "") {
  const item = entryTemplate.content.firstElementChild.cloneNode(true);
  const input = item.querySelector("input");
  input.placeholder = placeholder;
  input.value = value;
  item.querySelector("button").addEventListener("click", () => {
    if (container.children.length > 1) item.remove();
  });
  container.appendChild(item);
}

function createSessionLine(value = {}) {
  const item = sessionTemplate.content.firstElementChild.cloneNode(true);
  const dateInput = item.querySelector(".session-date");
  const pagesInput = item.querySelector(".session-pages");
  const minutesInput = item.querySelector(".session-minutes");
  dateInput.value = value.date || new Date().toISOString().slice(0, 10);
  pagesInput.value = value.pages || "";
  minutesInput.value = value.minutes || "";
  item.querySelector("button").addEventListener("click", () => {
    if (sessionList.children.length > 1) item.remove();
  });
  sessionList.appendChild(item);
}

function setInputValue(selector, value) {
  const input = document.querySelector(selector);
  if (input) input.value = value ?? "";
}

function setupDefaultFields() {
  learningList.innerHTML = "";
  todoList.innerHTML = "";
  sessionList.innerHTML = "";
  createSessionLine();
  ["この本から何を学びたいか", "今の自分の課題とどう関係するか", "読後に試したいこと"].forEach((placeholder) => {
    createInputLine(learningList, placeholder);
  });
  ["実際にやってみること", "誰かに説明してみること", "1週間以内に見返すこと"].forEach((placeholder) => {
    createInputLine(todoList, placeholder);
  });
}

function collectLines(container) {
  return [...container.querySelectorAll("input")]
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function collectSessions() {
  return [...sessionList.querySelectorAll(".session-line")]
    .map((line) => ({
      date: line.querySelector(".session-date").value,
      pages: Number(line.querySelector(".session-pages").value || 0),
      minutes: Number(line.querySelector(".session-minutes").value || 0)
    }))
    .filter((session) => session.date || session.pages || session.minutes);
}

function getSessions(book) {
  if (Array.isArray(book.sessions)) return book.sessions;
  if (book.pages || book.minutes) {
    return [{ date: book.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10), pages: Number(book.pages || 0), minutes: Number(book.minutes || 0) }];
  }
  return [];
}

function sumSessions(book, key) {
  return getSessions(book).reduce((sum, session) => sum + Number(session[key] || 0), 0);
}

function renderBooks() {
  const list = document.querySelector("#bookList");
  const visibleBooks = books.filter((book) => currentFilter === "all" || book.status === currentFilter);
  if (!visibleBooks.length) {
    list.innerHTML = '<div class="empty">まだ本がありません。「本を追加」から最初の一冊を登録してください。</div>';
    return;
  }

  list.innerHTML = visibleBooks
    .map((book) => {
      const cover = book.cover
        ? `<img src="${book.cover}" alt="${escapeHtml(book.title)}の表紙" />`
        : `<span>${escapeHtml(book.title.slice(0, 1) || "R")}</span>`;
      const learnings = book.learnings.slice(0, 3).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("");
      const todos = book.todos.length ? book.todos.map((item) => `・${escapeHtml(item)}`).join("<br>") : "未登録";
      const sessions = getSessions(book);
      const sessionText = sessions.length
        ? sessions.map((session) => `${formatDateWithWeekday(session.date)} / ${session.pages || 0}ページ / ${formatMinutes(session.minutes || 0)}`).join("<br>")
        : "未登録";
      return `
        <article class="book-card">
          <div class="book-cover">${cover}</div>
          <div class="book-body">
            <h3>${escapeHtml(book.title)}</h3>
            <p class="book-meta">${escapeHtml(book.author || "著者未登録")} / ${sumSessions(book, "pages")}ページ / ${formatMinutes(sumSessions(book, "minutes"))}</p>
            <div class="tag-row">${learnings}</div>
            <div class="book-detail">
              <strong>${book.status === "finished" ? "読了" : "読書中"} / 評価 ${formatRating(book.rating)}</strong>
              <span>読書日:<br>${sessionText}</span>
              <span>メモ: ${escapeHtml(book.memo || "未登録")}</span>
              <span>ToDo:<br>${todos}</span>
              <span>追記: ${escapeHtml(book.reflection || "未登録")}</span>
            </div>
            <div class="book-actions">
              <button class="secondary-action edit-book" data-id="${book.id}" type="button">編集</button>
              <button class="danger-action delete-book" data-id="${book.id}" type="button">削除</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function editBook(id) {
  const book = books.find((item) => item.id === id);
  if (!book) return;
  editingBookId = id;
  coverData = book.cover || "";

  setInputValue("#titleInput", book.title);
  setInputValue("#authorInput", book.author);
  setInputValue("#statusInput", book.status || "reading");
  setInputValue("#memoInput", book.memo);
  setInputValue("#reflectionInput", book.reflection);
  ratingInput.value = Number(book.rating || 0);
  ratingOutput.textContent = formatRating(book.rating);

  if (coverData) {
    coverPreview.src = coverData;
    coverPreview.style.display = "block";
    coverText.style.display = "none";
  } else {
    coverPreview.removeAttribute("src");
    coverPreview.style.display = "none";
    coverText.style.display = "block";
  }

  sessionList.innerHTML = "";
  const sessions = getSessions(book);
  if (sessions.length) sessions.forEach((session) => createSessionLine(session));
  else createSessionLine();

  learningList.innerHTML = "";
  const learnings = book.learnings?.length ? book.learnings : ["", "", ""];
  learnings.forEach((item, index) => createInputLine(learningList, ["この本から何を学びたいか", "今の自分の課題とどう関係するか", "読後に試したいこと"][index] || "追加したい学びの予想", item));

  todoList.innerHTML = "";
  const todos = book.todos?.length ? book.todos : ["", "", ""];
  todos.forEach((item, index) => createInputLine(todoList, ["実際にやってみること", "誰かに説明してみること", "1週間以内に見返すこと"][index] || "追加のToDo", item));

  document.querySelector(".form-actions .primary-action").textContent = "変更を保存";
  switchView("add");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteBook(id) {
  const book = books.find((item) => item.id === id);
  if (!book) return;
  if (!confirm(`「${book.title}」を削除しますか？`)) return;
  books = books.filter((item) => item.id !== id);
  saveBooks();
  renderAll();
}

function renderStats() {
  const weekStart = Date.now() - 7 * 86400000;
  const weeklyBooks = books.filter((book) => getSessions(book).some((session) => new Date(session.date).getTime() >= weekStart));
  const weeklyPages = books.reduce((sum, book) => sum + getSessions(book)
    .filter((session) => new Date(session.date).getTime() >= weekStart)
    .reduce((sessionSum, session) => sessionSum + Number(session.pages || 0), 0), 0);
  const weeklyMinutes = books.reduce((sum, book) => sum + getSessions(book)
    .filter((session) => new Date(session.date).getTime() >= weekStart)
    .reduce((sessionSum, session) => sessionSum + Number(session.minutes || 0), 0), 0);
  const finished = books.filter((book) => book.status === "finished");
  const average = books.length ? (books.reduce((sum, book) => sum + Number(book.rating || 0), 0) / books.length).toFixed(1) : "-";

  document.querySelector("#totalBooks").textContent = books.length;
  document.querySelector("#finishedBooks").textContent = finished.length;
  document.querySelector("#weeklyPages").textContent = weeklyPages;
  document.querySelector("#averageRating").textContent = average;
  document.querySelector("#weekBooks").textContent = `${weeklyBooks.length}冊`;
  document.querySelector("#weekPages").textContent = `${weeklyPages}ページ`;
  document.querySelector("#weekMinutes").textContent = formatMinutes(weeklyMinutes);
  document.querySelector("#sidebarPages").textContent = `${weeklyPages} pages`;
  document.querySelector("#sidebarTime").textContent = formatMinutes(weeklyMinutes);

  const timeline = document.querySelector("#timeline");
  timeline.innerHTML = books
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((book) => `
      <article class="timeline-item">
        <div>
          <strong>${escapeHtml(book.title)}</strong>
          <p class="book-meta">${new Date(book.createdAt).toLocaleDateString("ja-JP")} / ${sumSessions(book, "pages")}ページ / ${formatMinutes(sumSessions(book, "minutes"))}</p>
        </div>
        <span class="tag">${book.status === "finished" ? "読了" : "読書中"}</span>
      </article>
    `)
    .join("");
}

function renderAll() {
  renderBooks();
  renderStats();
}

function resetForm() {
  bookForm.reset();
  editingBookId = null;
  coverData = "";
  coverPreview.removeAttribute("src");
  coverPreview.style.display = "none";
  coverText.style.display = "block";
  ratingInput.value = 4;
  ratingOutput.textContent = "4.0";
  document.querySelector(".form-actions .primary-action").textContent = "本棚に保存";
  setupDefaultFields();
}

function formatMinutes(minutes) {
  const value = Number(minutes || 0);
  if (value < 60) return `${value}分`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours}時間${rest}分` : `${hours}時間`;
}

function formatRating(value) {
  return Number(value || 0).toFixed(1);
}

function formatDateWithWeekday(value) {
  if (!value) return "日付未登録";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "long" });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelector("#openAdd").addEventListener("click", () => switchView("add"));

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach((item) => item.classList.toggle("active", item === button));
    renderBooks();
  });
});

document.querySelector("#bookList").addEventListener("click", (event) => {
  const editButton = event.target.closest(".edit-book");
  const deleteButton = event.target.closest(".delete-book");
  if (editButton) editBook(editButton.dataset.id);
  if (deleteButton) deleteBook(deleteButton.dataset.id);
});

document.querySelector("#addLearning").addEventListener("click", () => {
  createInputLine(learningList, "追加したい学びの予想");
});

document.querySelector("#addSession").addEventListener("click", () => {
  createSessionLine();
});

document.querySelector("#addTodo").addEventListener("click", () => {
  createInputLine(todoList, "追加のToDo");
});

ratingInput.addEventListener("input", () => {
  ratingOutput.textContent = `${ratingInput.value}.0`;
});

coverInput.addEventListener("change", () => {
  const file = coverInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    coverData = reader.result;
    coverPreview.src = coverData;
    coverPreview.style.display = "block";
    coverText.style.display = "none";
  });
  reader.readAsDataURL(file);
});

document.querySelector("#resetForm").addEventListener("click", resetForm);

bookForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const book = {
    id: editingBookId || createId(),
    title: document.querySelector("#titleInput").value.trim(),
    author: document.querySelector("#authorInput").value.trim(),
    sessions: collectSessions(),
    status: document.querySelector("#statusInput").value,
    rating: Number(ratingInput.value),
    cover: coverData,
    learnings: collectLines(learningList),
    memo: document.querySelector("#memoInput").value.trim(),
    todos: collectLines(todoList),
    reflection: document.querySelector("#reflectionInput").value.trim(),
    createdAt: editingBookId ? books.find((item) => item.id === editingBookId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (editingBookId) {
    books = books.map((item) => item.id === editingBookId ? book : item);
  } else {
    books.unshift(book);
  }
  saveBooks();
  resetForm();
  renderAll();
  switchView("dashboard");
});

setupDefaultFields();
renderAll();

function showInstallStatus(message) {
  const existing = document.querySelector(".pwa-status");
  if (existing) existing.remove();
  const status = document.createElement("div");
  status.className = "pwa-status";
  status.textContent = message;
  document.body.appendChild(status);
  window.setTimeout(() => status.remove(), 4200);
}

window.addEventListener("online", () => showInstallStatus("オンラインに戻りました"));
window.addEventListener("offline", () => showInstallStatus("オフラインで利用中です"));

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((registration) => {
      registration.update();
    }).catch(() => {
      showInstallStatus("オフライン保存を有効にできませんでした");
    });
  });
} else if ("serviceWorker" in navigator && location.hostname !== "localhost") {
  window.addEventListener("load", () => {
    showInstallStatus("オフライン利用にはHTTPSで開く必要があります");
  });
}
