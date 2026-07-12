const state = {
  selectedContractId: CONTRACTS[0].id,
  filteredCategory: "すべて",
  quizQuestions: [],
  quizIndex: 0,
  quizScore: 0,
  answered: false
};

const CONTRACT_DETAILS = {
  nda: {
    lead: "情報を渡す前に、何を秘密として扱い、何に使ってよいかを先に決める契約です。",
    importance: "商談前",
    parties: "開示者 / 受領者",
    timing: "資料共有の前",
    terms: ["秘密情報の定義", "利用目的の制限", "第三者共有の範囲", "返却・廃棄", "存続期間と違反時の責任"],
    negotiation: ["口頭や画面共有で開示した情報も対象にするか", "グループ会社・外部専門家への共有をどこまで認めるか", "秘密保持期間が事業上の価値に合っているか"],
    practical: "NDAは契約書を結ぶこと自体より、開示する資料の管理が重要です。資料名、共有日時、共有相手、共有方法を残しておくと、後から保護対象を説明しやすくなります。",
    redFlags: ["目的を問わず自由に利用できる", "関連会社・委託先へ無制限に共有できる", "短期間で秘密保持義務が消える"]
  },
  outsourcing: {
    lead: "外部の個人や会社に仕事を依頼するとき、成果物・報酬・責任範囲を決める契約です。",
    importance: "発注前",
    parties: "発注者 / 受託者",
    timing: "作業開始前",
    terms: ["業務範囲", "成果物と納期", "検収基準", "報酬と支払期日", "追加作業・修正対応", "知的財産権"],
    negotiation: ["修正回数と追加費用の条件を分ける", "検収期限を決め、返答がない場合の扱いを明確にする", "作業指示が雇用のように強くなりすぎないか確認する"],
    practical: "業務委託は『何をもって完了か』が最重要です。完成イメージ、納品形式、検収期限、軽微な修正と追加発注の境界を最初に言語化すると、発注側も受託側も動きやすくなります。",
    redFlags: ["発注者がいつでも無償で修正を求められる", "報酬の支払時期が発注者の都合だけで決まる", "成果物以外の既存ノウハウまで譲渡対象になっている"]
  },
  employment: {
    lead: "会社の指揮命令のもとで働く条件を決める契約です。求人票ではなく、契約条件の確認が基準になります。",
    importance: "入社前",
    parties: "会社 / 労働者",
    timing: "内定承諾前",
    terms: ["賃金と手当", "労働時間と休日", "就業場所", "業務内容", "試用期間", "契約更新・退職・解雇"],
    negotiation: ["固定残業代の時間数と超過分支給を確認する", "勤務地・職種変更の範囲を見る", "副業や競業避止の制限が転職後の活動を妨げないか確認する"],
    practical: "転職では、口頭説明や求人票の条件だけで判断しないことが大切です。労働条件通知書、雇用契約書、就業規則の内容を並べ、矛盾があれば入社前に確認します。",
    redFlags: ["詳細は入社後に説明すると言われる", "固定残業代の内訳が分からない", "職務や勤務地の変更範囲が無制限に近い"]
  },
  sidejob: {
    lead: "本業を続けながら別の仕事をするとき、会社のルール・労働時間・秘密保持・利益相反を整理します。",
    importance: "開始前",
    parties: "本人 / 本業先 / 副業先",
    timing: "案件受注前",
    terms: ["届出・許可", "労働時間管理", "健康確保", "秘密保持", "競業避止", "会社設備の利用禁止"],
    negotiation: ["本業の就業規則にある禁止事由を確認する", "副業先が雇用か業務委託かで管理方法を変える", "実績公開やSNS投稿の範囲を先に決める"],
    practical: "副業は『できるか』だけでなく『本業に不利益を与えない形で続けられるか』が重要です。時間、情報、顧客、同業性の4点を最初に切り分けると判断しやすくなります。",
    redFlags: ["本業の顧客へ副業として直接営業する", "本業の資料やアカウントを副業に使う", "睡眠や休息を削る前提の稼働になる"]
  },
  "ip-assignment": {
    lead: "制作物や技術の権利を誰が持ち、誰がどこまで使えるかを決める契約です。",
    importance: "制作前",
    parties: "権利者 / 利用者",
    timing: "発注・共同開発前",
    terms: ["譲渡か利用許諾か", "対象物の特定", "利用範囲", "独占・非独占", "再許諾", "著作者人格権", "第三者素材"],
    negotiation: ["既存素材と新規成果物を分ける", "実績公開やポートフォリオ掲載の可否を決める", "独占利用を求めるなら対価が見合うか確認する"],
    practical: "制作物を『納品されたから自由に使える』とは限りません。権利の移転、利用できる媒体、改変の可否、二次利用、第三者素材の条件をセットで確認します。",
    redFlags: ["すべての関連ノウハウを無償で譲渡する", "第三者素材のライセンス確認がない", "独占利用なのに期間や対価が不明確"]
  },
  poc: {
    lead: "実証実験や共同研究で、目的・評価指標・成果の扱い・次の契約への進み方を決めます。",
    importance: "検証前",
    parties: "実証先 / 開発側",
    timing: "PoC開始前",
    terms: ["目的と評価指標", "期間", "役割分担", "費用負担", "データ利用", "成果の権利", "商用化条件"],
    negotiation: ["成功条件を定量・定性で決める", "無償でどこまで対応するか線を引く", "検証成果を営業資料や事例として使えるか確認する"],
    practical: "PoCは始めやすい一方で、終わり方が曖昧になりがちです。検証期間、合否判断、商用契約へ進む条件を先に置くと、単なる無料作業になりにくくなります。",
    redFlags: ["期間や成果物がないまま継続する", "成果の権利を相手が一方的に取得する", "商用化の協議義務や判断時期がない"]
  },
  investment: {
    lead: "出資を受けるとき、株式条件と経営上の約束を決める契約です。資金だけでなく意思決定に影響します。",
    importance: "払込前",
    parties: "会社 / 投資家 / 創業者",
    timing: "資金調達時",
    terms: ["株式の種類と価格", "払込条件", "事前承諾事項", "情報提供", "優先権", "創業者義務", "Exit条項"],
    negotiation: ["拒否権の範囲が広すぎないか", "次回調達を妨げる条項がないか", "創業者の離脱時に株式がどう扱われるか"],
    practical: "投資契約は一度結ぶと次回調達やM&Aにも影響します。投資家保護と経営の自由度のバランスを見ながら、日常的な意思決定まで承諾事項に入っていないか確認します。",
    redFlags: ["少額出資でも広範な拒否権がある", "創業者退任時の株式処理がない", "次回投資家が受け入れにくい優先条件がある"]
  },
  "service-terms": {
    lead: "Webサービスやアプリの利用条件と、個人情報の扱いを利用者へ示す文書です。",
    importance: "公開前",
    parties: "事業者 / 利用者",
    timing: "サービス開始前",
    terms: ["アカウント条件", "禁止事項", "料金と解約", "投稿コンテンツ", "免責", "停止・退会", "個人情報の利用目的"],
    negotiation: ["実際の課金・返金仕様と一致しているか", "ユーザー投稿の削除・利用範囲を決める", "個人情報の取得項目と利用目的を実装に合わせる"],
    practical: "利用規約とプライバシーポリシーは、実際のサービス仕様とずれていると意味が弱くなります。決済、解約、投稿、外部ツール連携、広告利用の有無を棚卸ししてから作ります。",
    redFlags: ["実際には取得している情報が書かれていない", "解約や返金条件が見つからない", "事業者が一方的に何でも変更できる内容になっている"]
  }
};

const els = {
  contractCount: document.querySelector("#contractCount"),
  questionCount: document.querySelector("#questionCount"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilters: document.querySelector("#categoryFilters"),
  contractList: document.querySelector("#contractList"),
  detailCategory: document.querySelector("#detailCategory"),
  detailTitle: document.querySelector("#detailTitle"),
  detailLead: document.querySelector("#detailLead"),
  detailImportance: document.querySelector("#detailImportance"),
  detailParties: document.querySelector("#detailParties"),
  detailTiming: document.querySelector("#detailTiming"),
  detailSummary: document.querySelector("#detailSummary"),
  detailScene: document.querySelector("#detailScene"),
  detailChecklist: document.querySelector("#detailChecklist"),
  detailRisks: document.querySelector("#detailRisks"),
  detailTerms: document.querySelector("#detailTerms"),
  detailNegotiation: document.querySelector("#detailNegotiation"),
  detailPractical: document.querySelector("#detailPractical"),
  detailRedFlags: document.querySelector("#detailRedFlags"),
  detailSources: document.querySelector("#detailSources"),
  startSelectedQuiz: document.querySelector("#startSelectedQuiz"),
  quizScope: document.querySelector("#quizScope"),
  quizSize: document.querySelector("#quizSize"),
  startQuiz: document.querySelector("#startQuiz"),
  resetQuiz: document.querySelector("#resetQuiz"),
  quizStatus: document.querySelector("#quizStatus"),
  quizScore: document.querySelector("#quizScore"),
  quizQuestion: document.querySelector("#quizQuestion"),
  quizOptions: document.querySelector("#quizOptions"),
  quizFeedback: document.querySelector("#quizFeedback"),
  nextQuestion: document.querySelector("#nextQuestion"),
  sourceList: document.querySelector("#sourceList")
};

function sourceById(id) {
  return SOURCES.find((source) => source.id === id);
}

function contractById(id) {
  return CONTRACTS.find((contract) => contract.id === id);
}

function renderCategoryFilters() {
  const categories = ["すべて", ...new Set(CONTRACTS.map((contract) => contract.category))];
  els.categoryFilters.innerHTML = "";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = category;
    button.className = category === state.filteredCategory ? "filter-chip active" : "filter-chip";
    button.addEventListener("click", () => {
      state.filteredCategory = category;
      renderCategoryFilters();
      renderContractList();
    });
    els.categoryFilters.appendChild(button);
  });
}

function contractMatchesSearch(contract, query) {
  const haystack = [
    contract.title,
    contract.category,
    contract.summary,
    contract.scene,
    ...contract.checklist,
    ...contract.risks
  ].join(" ");

  return haystack.toLowerCase().includes(query.toLowerCase());
}

function renderContractList() {
  const query = els.searchInput.value.trim();
  const contracts = CONTRACTS.filter((contract) => {
    const categoryMatch = state.filteredCategory === "すべて" || contract.category === state.filteredCategory;
    const searchMatch = !query || contractMatchesSearch(contract, query);
    return categoryMatch && searchMatch;
  });

  els.contractList.innerHTML = "";

  contracts.forEach((contract) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = contract.id === state.selectedContractId ? "contract-item active" : "contract-item";
    button.setAttribute("aria-pressed", String(contract.id === state.selectedContractId));
    button.innerHTML = `
      <span>${contract.category}</span>
      <strong>${contract.title}</strong>
      <small>詳細を見る</small>
    `;
    button.addEventListener("click", () => {
      state.selectedContractId = contract.id;
      renderContractList();
      renderDetail();
      document.querySelector("#contractDetail").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    els.contractList.appendChild(button);
  });

  if (!contracts.length) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "該当する契約がありません。検索語を変えてください。";
    els.contractList.appendChild(empty);
  }
}

function renderDetail() {
  const contract = contractById(state.selectedContractId);
  const detail = CONTRACT_DETAILS[contract.id];

  els.detailCategory.textContent = contract.category;
  els.detailTitle.textContent = contract.title;
  els.detailLead.textContent = detail.lead;
  els.detailImportance.textContent = detail.importance;
  els.detailParties.textContent = detail.parties;
  els.detailTiming.textContent = detail.timing;
  els.detailSummary.textContent = contract.summary;
  els.detailScene.textContent = contract.scene;

  els.detailChecklist.innerHTML = "";
  contract.checklist.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    els.detailChecklist.appendChild(li);
  });

  els.detailRisks.innerHTML = "";
  contract.risks.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    els.detailRisks.appendChild(li);
  });

  els.detailTerms.innerHTML = "";
  detail.terms.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    els.detailTerms.appendChild(li);
  });

  els.detailNegotiation.innerHTML = "";
  detail.negotiation.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    els.detailNegotiation.appendChild(li);
  });

  els.detailPractical.textContent = detail.practical;

  els.detailRedFlags.innerHTML = "";
  detail.redFlags.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    els.detailRedFlags.appendChild(li);
  });

  els.detailSources.innerHTML = "";
  contract.sourceIds.forEach((sourceId) => {
    const source = sourceById(sourceId);
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = source.name;
    els.detailSources.appendChild(link);
  });
}

function renderQuizScope() {
  els.quizScope.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "すべての契約";
  els.quizScope.appendChild(allOption);

  CONTRACTS.forEach((contract) => {
    const option = document.createElement("option");
    option.value = contract.id;
    option.textContent = contract.title;
    els.quizScope.appendChild(option);
  });
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function startQuiz(scope = els.quizScope.value) {
  const pool = scope === "all" ? QUESTIONS : QUESTIONS.filter((question) => question.contractId === scope);
  const size = Math.min(Number(els.quizSize.value) || 6, pool.length);

  state.quizQuestions = shuffle(pool).slice(0, size);
  state.quizIndex = 0;
  state.quizScore = 0;
  state.answered = false;

  renderQuizQuestion();
  document.querySelector("#quiz").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderQuizQuestion() {
  const total = state.quizQuestions.length;

  if (!total) {
    els.quizStatus.textContent = "未開始";
    els.quizScore.textContent = "0 / 0";
    els.quizQuestion.textContent = "出題範囲と問題数を選んで開始してください。";
    els.quizOptions.innerHTML = "";
    els.quizFeedback.textContent = "";
    els.nextQuestion.disabled = true;
    return;
  }

  if (state.quizIndex >= total) {
    els.quizStatus.textContent = "完了";
    els.quizScore.textContent = `${state.quizScore} / ${total}`;
    els.quizQuestion.textContent = `結果：${total}問中${state.quizScore}問正解`;
    els.quizOptions.innerHTML = "";
    els.quizFeedback.textContent = state.quizScore === total
      ? "全問正解です。次は契約書の実例で、条項ごとの意味を確認してみましょう。"
      : "間違えた契約タイプの詳細ページを読み直すと、判断基準が整理しやすくなります。";
    els.nextQuestion.disabled = true;
    return;
  }

  const current = state.quizQuestions[state.quizIndex];
  const contract = contractById(current.contractId);

  els.quizStatus.textContent = `${state.quizIndex + 1}問目 / ${total}：${contract.title}`;
  els.quizScore.textContent = `${state.quizScore} / ${total}`;
  els.quizQuestion.textContent = current.question;
  els.quizFeedback.textContent = "";
  els.quizOptions.innerHTML = "";
  els.nextQuestion.disabled = true;
  state.answered = false;

  current.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option;
    button.addEventListener("click", () => answerQuestion(index));
    els.quizOptions.appendChild(button);
  });
}

function answerQuestion(index) {
  if (state.answered) return;

  const current = state.quizQuestions[state.quizIndex];
  const buttons = [...els.quizOptions.querySelectorAll("button")];
  const isCorrect = index === current.answer;

  state.answered = true;
  if (isCorrect) state.quizScore += 1;

  buttons.forEach((button, buttonIndex) => {
    if (buttonIndex === current.answer) button.classList.add("correct");
    if (buttonIndex === index && !isCorrect) button.classList.add("incorrect");
    button.disabled = true;
  });

  els.quizScore.textContent = `${state.quizScore} / ${state.quizQuestions.length}`;
  els.quizFeedback.textContent = `${isCorrect ? "正解。" : "不正解。"} ${current.explanation}`;
  els.nextQuestion.disabled = false;
}

function renderSources() {
  els.sourceList.innerHTML = "";

  SOURCES.forEach((source) => {
    const article = document.createElement("article");
    article.className = "source-item";
    article.innerHTML = `
      <h3>${source.name}</h3>
      <p>${source.note}</p>
      <a href="${source.url}" target="_blank" rel="noreferrer">${source.url}</a>
    `;
    els.sourceList.appendChild(article);
  });
}

function resetQuiz() {
  state.quizQuestions = [];
  state.quizIndex = 0;
  state.quizScore = 0;
  renderQuizQuestion();
}

function init() {
  els.contractCount.textContent = CONTRACTS.length;
  els.questionCount.textContent = QUESTIONS.length;
  renderCategoryFilters();
  renderContractList();
  renderDetail();
  renderQuizScope();
  renderSources();
  renderQuizQuestion();

  els.searchInput.addEventListener("input", renderContractList);
  els.startQuiz.addEventListener("click", () => startQuiz());
  els.resetQuiz.addEventListener("click", resetQuiz);
  els.nextQuestion.addEventListener("click", () => {
    state.quizIndex += 1;
    renderQuizQuestion();
  });
  els.startSelectedQuiz.addEventListener("click", () => {
    els.quizScope.value = state.selectedContractId;
    startQuiz(state.selectedContractId);
  });
}

init();
