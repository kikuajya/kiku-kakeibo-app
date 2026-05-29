import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  deleteField,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCUEOBwgYVZVLKqjSbaZSo57r9F9rTWjOQ",
  authDomain: "kiku-kakeibo.firebaseapp.com",
  projectId: "kiku-kakeibo",
  storageBucket: "kiku-kakeibo.firebasestorage.app",
  messagingSenderId: "111629188939",
  appId: "1:111629188939:web:b79bd98cadff307c11f2ce",
  measurementId: "G-D0MF23013X",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const cloudVisionEndpoint = "https://asia-northeast1-kiku-kakeibo.cloudfunctions.net/analyzeReceiptHttp";
const isFilePage = window.location.protocol === "file:";
const tesseractScriptUrl = "https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js";
const receiptAmountOcrLanguage = "eng";
const receiptTextOcrLanguages = ["jpn", "eng"];

const defaultBudgets = {
  income: 0,
  savings: 0,
  total: 0,
  rent: 80000,
  scholarship: 0,
  utilities: 25000,
  communication: 0,
  food: 80000,
  lunch: 0,
  clothingBeauty: 0,
  furnitureAppliances: 0,
  dining: 30000,
  entertainment: 20000,
  special: 20000,
  other: 30000,
};

const categories = [
  "食費",
  "ランチ（外食）",
  "外食費",
  "日用品",
  "衣服・美容",
  "家具家電",
  "娯楽費",
  "キャンプ（娯楽費）",
  "光熱費",
  "通信費",
  "交通費",
  "医療費",
  "家賃",
  "奨学金",
  "臨時出費",
  "その他",
];

const colorByCategory = {
  食費: "#27745c",
  "ランチ（外食）": "#d56a45",
  外食費: "#b9473c",
  日用品: "#2d5f8f",
  "衣服・美容": "#9b5d8f",
  家具家電: "#4f6f8f",
  娯楽費: "#b88428",
  "キャンプ（娯楽費）": "#8a6a2d",
  光熱費: "#7164a3",
  通信費: "#4a7c8a",
  交通費: "#6f7d3c",
  医療費: "#a75374",
  家賃: "#4b5967",
  奨学金: "#5d6f8f",
  臨時出費: "#8f5d2a",
  その他: "#6c6f75",
};

const diningStoreKeywords = [
  "ガスト",
  "ステーキガスト",
  "ジョナサン",
  "バーミヤン",
  "夢庵",
  "藍屋",
  "しゃぶ葉",
  "から好し",
  "すかいらーく",
  "マクドナルド",
  "マック",
  "モス",
  "ケンタッキー",
  "バーガーキング",
  "ロッテリア",
  "すき家",
  "吉野家",
  "松屋",
  "なか卯",
  "丸亀",
  "はなまるうどん",
  "サイゼ",
  "サイゼリヤ",
  "ココス",
  "デニーズ",
  "ロイヤルホスト",
  "びっくりドンキー",
  "大戸屋",
  "やよい軒",
  "餃子の王将",
  "日高屋",
  "幸楽苑",
  "くら寿司",
  "スシロー",
  "はま寿司",
  "かっぱ寿司",
  "牛角",
  "焼肉きんぐ",
  "スターバックス",
  "スタバ",
  "ドトール",
  "タリーズ",
  "コメダ",
  "エクセルシオール",
  "プロント",
  "ミスタードーナツ",
  "ミスド",
  "restaurant",
  "cafe",
  "gusto",
  "skylark",
];

const categoryKeywords = {
  "ランチ（外食）": ["ランチ", "昼食", "lunch"],
  外食費: ["外食", "レストラン", "居酒屋", "カフェ", "喫茶", "ディナー", "ラーメン", "寿司", "焼肉", "dinner", ...diningStoreKeywords],
  食費: ["スーパー", "食材", "食品", "青果", "精肉", "鮮魚", "惣菜", "米", "パン", "牛乳", "イオン", "西友", "ライフ", "マルエツ", "オーケー", "成城石井", "costco", "super"],
  日用品: ["日用品", "洗剤", "ティッシュ", "トイレット", "シャンプー", "ドラッグ", "薬局", "マツキヨ", "ウエルシア", "サンドラッグ", "drug", "daily"],
  "衣服・美容": ["服", "衣服", "衣料", "美容", "美容院", "ヘアカット", "化粧品", "コスメ", "ユニクロ", "gu", "しまむら", "無印良品", "beauty", "cosme"],
  家具家電: ["家具", "家電", "冷蔵庫", "洗濯機", "電子レンジ", "掃除機", "照明", "ニトリ", "ikea", "無印良品", "ヤマダ", "ビックカメラ", "ヨドバシ", "nojima"],
  "キャンプ（娯楽費）": ["キャンプ", "キャンプ場", "camp", "camping"],
  娯楽費: ["映画", "カラオケ", "ゲーム", "本", "漫画", "ライブ", "チケット", "netflix", "spotify", "movie", "game"],
  光熱費: ["電気", "ガス", "水道", "光熱", "東京電力", "東京ガス", "electric", "gas", "water"],
  通信費: ["スマホ", "携帯", "通信", "wifi", "wi-fi", "インターネット", "docomo", "au", "softbank", "rakuten"],
  交通費: ["交通", "電車", "バス", "タクシー", "ガソリン", "駐車", "jr", "suica", "pasmo", "taxi"],
  医療費: ["病院", "クリニック", "薬", "歯科", "眼科", "皮膚科", "medical", "clinic"],
  家賃: ["家賃", "賃料", "管理費", "rent"],
  奨学金: ["奨学金", "返済", "学生支援", "scholarship"],
  臨時出費: ["臨時", "お歳暮", "お中元", "祝い", "香典", "プレゼント", "帰省", "旅行", "修理", "特別", "gift", "special"],
};

const storeCategoryRules = [
  { category: "外食費", keywords: diningStoreKeywords },
  { category: "食費", keywords: ["イオン", "西友", "ライフ", "マルエツ", "オーケー", "okストア", "okstore", "成城石井", "コープ", "生協", "業務スーパー", "まいばすけっと", "ヨーク", "イトーヨーカドー", "サミット", "ベルク", "ヤオコー", "ロピア", "スーパー", "青果", "精肉", "鮮魚", "惣菜"] },
  { category: "日用品", keywords: ["マツモトキヨシ", "マツキヨ", "ウエルシア", "サンドラッグ", "ココカラファイン", "スギ薬局", "ツルハ", "ドラッグ", "薬局", "ダイソー", "セリア", "キャンドゥ", "無印良品", "ニトリ"] },
  { category: "娯楽費", keywords: ["映画", "シネマ", "カラオケ", "ゲーム", "ブックオフ", "書店", "チケット"] },
  { category: "交通費", keywords: ["jr", "suica", "pasmo", "タクシー", "駐車", "ガソリン", "eneos", "出光", "apollostation"] },
];

const sampleExpenses = [
  { date: "2026-05-02", memo: "スーパー食材", amount: 8420, category: "食費", payer: "共有", advancePayer: "" },
  { date: "2026-05-04", memo: "家族で外食", amount: 6800, category: "外食費", payer: "共有", advancePayer: "旦那" },
  { date: "2026-05-06", memo: "ドラッグストア", amount: 3920, category: "日用品", payer: "共有", advancePayer: "妻" },
  { date: "2026-05-08", memo: "電気代", amount: 11200, category: "光熱費", payer: "共有", advancePayer: "" },
  { date: "2026-05-10", memo: "映画と軽食", amount: 5200, category: "娯楽費", payer: "共有", advancePayer: "旦那" },
  { date: "2026-05-12", memo: "平日ランチ", amount: 1400, category: "外食費", payer: "共有", advancePayer: "妻" },
  { date: "2026-05-15", memo: "スマホ料金", amount: 9600, category: "通信費", payer: "共有", advancePayer: "" },
  { date: "2026-05-20", memo: "お祝いギフト", amount: 12000, category: "臨時出費", payer: "共有", advancePayer: "妻" },
];

const modeConfig = {
  couple: {
    label: "夫婦用（共有）",
    storageKey: "couple-budget-expenses",
    defaultPayer: "夫",
    hero: "生活費全体を2人で見ながら、外食の使いすぎも逃さない。",
    emptyAdvice: "夫婦どちらが払ったかと金額を残すことを優先しましょう。",
  },
  personal: {
    label: "個人用（本人のみ）",
    storageKey: "personal-budget-expenses",
    defaultPayer: "自分",
    hero: "自分の生活費を見ながら、無理なく節約ポイントを見つける。",
    emptyAdvice: "まずはよく使う支出だけを残すと、節約ポイントが見つけやすくなります。",
  },
};

const budgetGroupsByMode = {
  couple: {
    fixed: ["rent", "communication"],
    variable: ["utilities", "food", "dining", "furnitureAppliances", "entertainment", "special", "other"],
  },
  personal: {
    fixed: ["scholarship"],
    variable: ["food", "lunch", "dining", "clothingBeauty", "entertainment", "special", "other"],
  },
};

const fixedBudgetItemMap = {
  rent: { category: "家賃", memo: "家賃（固定）" },
  scholarship: { category: "奨学金", memo: "奨学金（固定）" },
  utilities: { category: "光熱費", memo: "光熱費（固定）" },
  communication: { category: "通信費", memo: "通信費（固定）" },
};

const categoryModeMap = {
  "ランチ（外食）": ["personal"],
  "衣服・美容": ["personal"],
  家具家電: ["couple"],
  "キャンプ（娯楽費）": ["couple"],
  奨学金: ["personal"],
};

let currentMode = localStorage.getItem("budget-app-mode") || "couple";
let selectedAdvancePayer = "";
let expenses = loadExpenses();
let budgets = loadBudgets();
let selectedStamp = localStorage.getItem("budget-app-selected-stamp") || "🐱";
let noSpendStamps = loadNoSpendStamps();
let pendingStampDate = "";
let stampSheetScrollPosition = null;
let authUser = null;
let cloudUnsubscribe = null;
let cloudSaveTimer = 0;
let applyingCloudData = false;
const deletedNoSpendStampDates = new Set();

const formatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const form = document.querySelector("#expenseForm");
const dateInput = document.querySelector("#expenseDate");
const memoInput = document.querySelector("#expenseMemo");
const amountInput = document.querySelector("#expenseAmount");
const categoryInput = document.querySelector("#expenseCategory");
const amountPreview = document.querySelector("#amountPreview");
const addSplitButton = document.querySelector("#addSplitButton");
const splitRows = document.querySelector("#splitRows");
const calculatorPad = document.querySelector("#calculatorPad");
const submitButton = document.querySelector(".submit-button");
const cancelEditButton = document.querySelector("#cancelEditButton");
const receiptInput = document.querySelector("#receiptImage");
const receiptPreview = document.querySelector("#receiptPreview");
const scanStatus = document.querySelector("#scanStatus");
const ocrReview = document.querySelector("#ocrReview");
const ocrAmountList = document.querySelector("#ocrAmountList");
const ocrRawText = document.querySelector("#ocrRawText");
const seedButton = document.querySelector("#seedButton");
const openReceiptButton = document.querySelector("#openReceiptButton");
const modeLabel = document.querySelector("#modeLabel");
const viewTitle = document.querySelector("#viewTitle");
const heroTitle = document.querySelector("#heroTitle");
const monthLabel = document.querySelector("#monthLabel");
const monthSelect = document.querySelector("#monthSelect");
const budgetInputs = document.querySelectorAll("[data-budget-key]");
const trendChart = document.querySelector("#trendChart");
const trendSummary = document.querySelector("#trendSummary");
const trendTable = document.querySelector("#trendTable");
const categoryPieChart = document.querySelector("#categoryPieChart");
const categoryPieLegend = document.querySelector("#categoryPieLegend");
const calendarGrid = document.querySelector("#calendarGrid");
const calendarTotal = document.querySelector("#calendarTotal");
const stampPicker = document.querySelector("#stampPicker");
const stampTargetLabel = document.querySelector("#stampTargetLabel");
const closeStampPicker = document.querySelector("#closeStampPicker");
const clearStampButton = document.querySelector("#clearStampButton");
const selectedDateLabel = document.querySelector("#selectedDateLabel");
const selectedDateTotal = document.querySelector("#selectedDateTotal");
const selectedDayExpenses = document.querySelector("#selectedDayExpenses");
const authGate = document.querySelector("#authGate");
const loginForm = document.querySelector("#loginForm");
const loginEmail = document.querySelector("#loginEmail");
const loginPassword = document.querySelector("#loginPassword");
const authMessage = document.querySelector("#authMessage");
const signOutButton = document.querySelector("#signOutButton");
const syncStatus = document.querySelector("#syncStatus");
let editingExpenseId = "";
let selectedMonthOffset = Number(localStorage.getItem("budget-app-month-offset") || 0);
let activeCalcInput = amountInput;
let selectedAdvanceDetail = "";

dateInput.valueAsDate = new Date();

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isFilePage) {
    setAuthMessage("この開き方ではログインできません。http://127.0.0.1:4180/ またはGitHub Pages版で開いてください。");
    return;
  }
  setAuthMessage("ログイン中です...");

  try {
    await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPassword.value);
    loginPassword.value = "";
  } catch (error) {
    setAuthMessage(firebaseAuthErrorMessage(error));
  }
});

signOutButton?.addEventListener("click", async () => {
  await signOut(auth);
});

document.querySelectorAll("[data-advance-payer]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedAdvancePayer = button.dataset.advancePayer;
    syncAdvanceButtons();
  });
});

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => switchMode(button.dataset.mode));
});

document.querySelectorAll(".nav-list a").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const nextView = link.getAttribute("href") || "#dashboard";
    navigateTo(nextView);
  });
});

window.addEventListener("hashchange", updateViewFromHash);
window.addEventListener("popstate", updateViewFromHash);

stampPicker?.addEventListener("click", (event) => {
  if (event.target === stampPicker) {
    closeStampSheet();
    return;
  }

  const stampButton = event.target.closest("[data-stamp]");
  if (!stampButton) return;
  selectedStamp = stampButton.dataset.stamp;
  localStorage.setItem("budget-app-selected-stamp", selectedStamp);
  applyNoSpendStamp(selectedStamp);
  syncStampButtons();
});

closeStampPicker?.addEventListener("click", (event) => {
  event.stopPropagation();
  closeStampSheet();
});
clearStampButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  clearNoSpendStamp();
});

ocrAmountList?.addEventListener("click", (event) => {
  const amountButton = event.target.closest("[data-ocr-amount]");
  if (!amountButton) return;

  amountInput.value = amountButton.dataset.ocrAmount;
  updateAmountPreview(amountInput, amountPreview);
  document.querySelectorAll("[data-ocr-amount]").forEach((button) => {
    button.classList.toggle("selected", button === amountButton);
  });
});

calendarGrid?.addEventListener("pointerdown", (event) => {
  const stampButton = event.target.closest("[data-stamp-date]");
  if (stampButton) {
    stampSheetScrollPosition = { left: window.scrollX, top: window.scrollY };
  }
});

calendarGrid?.addEventListener("click", (event) => {
  const stampButton = event.target.closest("[data-stamp-date]");
  if (stampButton) {
    openStampSheet(stampButton.dataset.stampDate);
    return;
  }

  const dayButton = event.target.closest("[data-calendar-date]");
  if (!dayButton) return;
  openDateForInput(dayButton.dataset.calendarDate);
});

dateInput.addEventListener("change", () => {
  clearEditState(false);
  renderSelectedDay();
});

selectedDayExpenses?.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-expense]");
  if (editButton) {
    startEditExpense(editButton.dataset.editExpense);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-expense]");
  if (deleteButton) {
    deleteExpense(deleteButton.dataset.deleteExpense);
  }
});

cancelEditButton?.addEventListener("click", () => {
  clearEditState();
});

document.querySelector("#advanceSummary")?.addEventListener("click", (event) => {
  const detailButton = event.target.closest("[data-advance-detail]");
  if (!detailButton) return;
  selectedAdvanceDetail = selectedAdvanceDetail === detailButton.dataset.advanceDetail ? "" : detailButton.dataset.advanceDetail;
  renderAdvanceSummary();
});

monthSelect.addEventListener("change", () => {
  selectedMonthOffset = Number(monthSelect.value);
  localStorage.setItem("budget-app-month-offset", String(selectedMonthOffset));
  renderMetrics();
  renderCategories();
  renderCalendar();
  renderExpenses();
  renderSelectedDay();
  renderAdvice();
  renderMode();
});

budgetInputs.forEach((input) => {
  input.addEventListener("input", () => {
    if (input.dataset.budgetKey === "total") return;
    budgets[input.dataset.budgetKey] = parseMoney(input.value);
    syncTotalBudget();
    saveBudgets();
    renderBudgetTotal();
    renderMetrics();
    renderCategories();
    renderCalendar();
    renderAdvice();
    renderTrendChart();
  });

  input.addEventListener("blur", () => {
    input.value = comma(budgets[input.dataset.budgetKey] || 0);
  });
});

document.querySelectorAll("[data-clear-budget]").forEach((button) => {
  button.addEventListener("click", () => {
    const keys = budgetKeysForGroup(button.dataset.clearBudget);
    keys.forEach((key) => {
      budgets[key] = 0;
    });
    syncTotalBudget();
    saveBudgets();
    renderBudgetInputs();
    renderMetrics();
    renderCategories();
    renderCalendar();
    renderExpenses();
    renderSelectedDay();
    renderAdvice();
    renderTrendChart();
  });
});

openReceiptButton.addEventListener("click", () => {
  navigateTo("#receipt");
});

receiptInput.addEventListener("change", async () => {
  const file = receiptInput.files?.[0];
  if (!file) return;

  receiptPreview.src = URL.createObjectURL(file);
  receiptPreview.style.display = "block";
  hideOcrReview();
  setScanStatus("warning", "写真を読み取り中", "Cloud Visionで日付・店舗・金額候補を確認しています。");
  applyReceiptDraft(await readReceiptDraft(file));
});

amountInput.addEventListener("focus", () => {
  activeCalcInput = amountInput;
});

amountInput.addEventListener("input", () => handleAmountInput(amountInput, amountPreview));

addSplitButton?.addEventListener("click", () => {
  addSplitRow();
});

splitRows?.addEventListener("click", (event) => {
  const applyButton = event.target.closest("[data-apply-calc]");
  if (applyButton) {
    event.stopPropagation();
    applyAmountExpression(applyButton.closest(".split-row"));
    return;
  }

  const removeButton = event.target.closest("[data-remove-split]");
  if (!removeButton) return;
  removeButton.closest(".split-row")?.remove();
});

splitRows?.addEventListener("focusin", (event) => {
  const input = event.target.closest(".split-amount");
  if (input) activeCalcInput = input;
});

splitRows?.addEventListener("input", (event) => {
  const input = event.target.closest(".split-amount");
  if (!input) return;
  handleAmountInput(input, input.closest(".split-row")?.querySelector(".split-preview"));
});

calculatorPad?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-calc-key]");
  if (!button) return;
  applyCalculatorKey(button.dataset.calcKey);
});

form.addEventListener("click", (event) => {
  const applyButton = event.target.closest("[data-apply-calc]");
  if (!applyButton) return;
  applyAmountExpression(applyButton.closest(".split-row"));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const submittedDate = dateInput.value;
  const mainAmount = parseAmountExpression(amountInput.value);
  const splitParts = getSplitParts();

  if (!mainAmount || splitParts.some((part) => !part.amount)) {
    window.alert("金額を確認してください。式は 279+118 のように入力できます。");
    return;
  }

  const baseExpense = {
    date: dateInput.value,
    memo: memoInput.value.trim(),
    payer: currentMode === "couple" ? "共有" : "自分",
    advancePayer: currentMode === "couple" ? selectedAdvancePayer : "",
  };
  const entries = [
    { amount: mainAmount, category: categoryForCurrentMode(categoryInput.value) },
    ...splitParts.map((part) => ({ ...part, category: categoryForCurrentMode(part.category) })),
  ];
  const createdExpenses = entries.map((entry, index) => ({
    ...baseExpense,
    id: editingExpenseId && index === 0 ? editingExpenseId : createExpenseId(),
    memo: entries.length > 1 ? `${baseExpense.memo}（${entry.category}）` : baseExpense.memo,
    amount: entry.amount,
    category: entry.category,
  }));

  if (editingExpenseId) {
    expenses = expenses.map((item) => (item.id === editingExpenseId ? createdExpenses[0] : item));
  } else {
    expenses = [...createdExpenses, ...expenses];
  }
  delete noSpendStamps[submittedDate];
  saveExpenses();
  saveNoSpendStamps();
  form.reset();
  dateInput.value = submittedDate;
  clearSplitRows();
  updateAmountPreview(amountInput, amountPreview);
  clearEditState(false);
  receiptPreview.removeAttribute("src");
  receiptPreview.style.display = "none";
  hideOcrReview();
  render();
});

seedButton?.addEventListener("click", () => {
  expenses = normalizeExpenses([...sampleExpenses, ...expenses]);
  saveExpenses();
  render();
});

function loadExpenses() {
  const saved = localStorage.getItem(modeConfig[currentMode].storageKey);
  if (!saved) return [];

  try {
    return normalizeExpenses(JSON.parse(saved));
  } catch {
    return [];
  }
}

function normalizeExpenses(items) {
  return (Array.isArray(items) ? items : []).map((expense, index) => ({
    ...expense,
    id: expense.id || `${expense.date || "date"}-${expense.amount || 0}-${index}-${Date.now()}`,
  }));
}

function saveExpenses() {
  localStorage.setItem(modeConfig[currentMode].storageKey, JSON.stringify(expenses));
  queueCloudSave();
}

function createExpenseId() {
  return `expense-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadNoSpendStamps() {
  const saved = localStorage.getItem(`${modeConfig[currentMode].storageKey}-no-spend-stamps`);
  if (!saved) return {};

  try {
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveNoSpendStamps(immediate = false) {
  localStorage.setItem(`${modeConfig[currentMode].storageKey}-no-spend-stamps`, JSON.stringify(noSpendStamps));
  queueCloudSave(immediate);
}

function loadBudgets() {
  const saved = localStorage.getItem(`${modeConfig[currentMode].storageKey}-budgets`);
  if (!saved) return normalizeBudgets(defaultBudgets);

  try {
    return normalizeBudgets({ ...defaultBudgets, ...JSON.parse(saved) });
  } catch {
    return normalizeBudgets(defaultBudgets);
  }
}

function saveBudgets() {
  syncTotalBudget();
  localStorage.setItem(`${modeConfig[currentMode].storageKey}-budgets`, JSON.stringify(budgets));
  queueCloudSave();
}

function normalizeBudgets(source) {
  const normalized = { ...defaultBudgets, ...(source || {}) };
  normalized.total = calculatedTotalBudget(normalized);
  return normalized;
}

function calculatedTotalBudget(source = budgets) {
  return budgetKeysForMode().reduce(
    (sum, key) => sum + (Number(source[key]) || 0),
    0,
  );
}

function syncTotalBudget() {
  budgets.total = calculatedTotalBudget();
}

function budgetKeysForGroup(group, mode = currentMode) {
  return budgetGroupsByMode[mode]?.[group] || [];
}

function budgetKeysForMode(mode = currentMode) {
  return [...budgetKeysForGroup("fixed", mode), ...budgetKeysForGroup("variable", mode)];
}

function renderBudgetTotal() {
  const totalInput = document.querySelector("#budgetTotal");
  if (totalInput) totalInput.value = comma(budgets.total || 0);
  document.querySelector("#monthlyGoal").textContent = yen(budgets.total);
}

function renderBudgetInputs() {
  document.querySelectorAll("[data-budget-modes]").forEach((field) => {
    const modes = field.dataset.budgetModes.split(/\s+/);
    field.hidden = !modes.includes(currentMode);
  });

  budgetInputs.forEach((input) => {
    input.value = comma(budgets[input.dataset.budgetKey] || 0);
  });
  renderBudgetTotal();
}

function blankBudgets() {
  return Object.fromEntries(Object.keys(defaultBudgets).map((key) => [key, 0]));
}

async function resetAllData() {
  const clearedBudgets = blankBudgets();
  const modes = Object.keys(modeConfig);

  modes.forEach((mode) => {
    const storageKey = modeConfig[mode].storageKey;
    localStorage.setItem(storageKey, JSON.stringify([]));
    localStorage.setItem(`${storageKey}-budgets`, JSON.stringify(clearedBudgets));
    localStorage.setItem(`${storageKey}-no-spend-stamps`, JSON.stringify({}));
  });

  expenses = [];
  budgets = { ...clearedBudgets };
  noSpendStamps = {};
  selectedAdvanceDetail = "";
  selectedAdvancePayer = "";
  clearEditState(true);
  syncAdvanceButtons();
  syncBudgetInputs();
  render();
  setSyncStatus("削除を保存中...");

  if (!authUser) {
    setSyncStatus("ローカル削除済み");
    return;
  }

  try {
    await Promise.all(modes.map((mode) => setDoc(
      cloudDataRef(mode),
      {
        expenses: [],
        budgets: clearedBudgets,
        noSpendStamps: {},
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )));
    setSyncStatus("削除済み");
  } catch (error) {
    setSyncStatus("削除を同期できませんでした");
    console.error(error);
  }
}

function writeLocalCache() {
  localStorage.setItem(modeConfig[currentMode].storageKey, JSON.stringify(expenses));
  localStorage.setItem(`${modeConfig[currentMode].storageKey}-budgets`, JSON.stringify(budgets));
  localStorage.setItem(`${modeConfig[currentMode].storageKey}-no-spend-stamps`, JSON.stringify(noSpendStamps));
}

function cloudDataRef(mode = currentMode) {
  if (!authUser) return null;
  if (mode === "couple") return doc(db, "couples", "kiku-kakeibo");
  return doc(db, "users", authUser.uid, "scopes", "personal");
}

function queueCloudSave(immediate = false) {
  if (!authUser || applyingCloudData) return;
  window.clearTimeout(cloudSaveTimer);
  cloudSaveTimer = window.setTimeout(saveCloudData, immediate ? 0 : 500);
}

async function saveCloudData() {
  const ref = cloudDataRef();
  if (!ref) return;

  const deletedStampDates = Array.from(deletedNoSpendStampDates);
  const payload = {
    expenses,
    budgets,
    updatedAt: serverTimestamp(),
  };

  if (deletedStampDates.length) {
    Object.entries(noSpendStamps).forEach(([dateKey, stamp]) => {
      payload[`noSpendStamps.${dateKey}`] = stamp;
    });
    deletedStampDates.forEach((dateKey) => {
      payload[`noSpendStamps.${dateKey}`] = deleteField();
    });
  } else {
    payload.noSpendStamps = noSpendStamps;
  }

  try {
    setSyncStatus("同期中...");
    await setDoc(
      ref,
      payload,
      { merge: true },
    );
    setSyncStatus("同期済み");
  } catch (error) {
    setSyncStatus("同期できませんでした");
    console.error(error);
  }
}

function subscribeCloudData() {
  if (cloudUnsubscribe) cloudUnsubscribe();
  cloudUnsubscribe = null;
  window.clearTimeout(cloudSaveTimer);

  const ref = cloudDataRef();
  if (!ref) {
    setSyncStatus("ログインが必要です");
    return;
  }

  setSyncStatus("クラウド確認中...");
  cloudUnsubscribe = onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        setSyncStatus("初回同期中...");
        queueCloudSave(true);
        return;
      }

      const data = snapshot.data() || {};
      applyingCloudData = true;
      expenses = normalizeExpenses(data.expenses || []);
      budgets = normalizeBudgets(data.budgets || {});
      const incomingStamps = data.noSpendStamps && typeof data.noSpendStamps === "object"
        ? { ...data.noSpendStamps }
        : {};
      deletedNoSpendStampDates.forEach((dateKey) => {
        delete incomingStamps[dateKey];
      });
      noSpendStamps = incomingStamps;
      deletedNoSpendStampDates.forEach((dateKey) => {
        if (!Object.prototype.hasOwnProperty.call(data.noSpendStamps || {}, dateKey)) {
          deletedNoSpendStampDates.delete(dateKey);
        }
      });
      writeLocalCache();
      applyingCloudData = false;
      setSyncStatus(currentMode === "couple" ? "夫婦用を同期済み" : "個人用を同期済み");
      render();
    },
    (error) => {
      setSyncStatus("同期権限を確認してください");
      console.error(error);
    },
  );
}

function setSyncStatus(message) {
  if (syncStatus) syncStatus.textContent = message;
}

function setAuthMessage(message) {
  if (authMessage) authMessage.textContent = message;
}

function firebaseAuthErrorMessage(error) {
  const code = error?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "メールアドレスまたはパスワードが違います。";
  }
  if (code.includes("too-many-requests")) return "ログイン試行が多すぎます。少し待ってから試してください。";
  if (code.includes("network-request-failed")) return "通信できません。ネットワークを確認してください。";
  return "ログインできませんでした。Firebaseの設定を確認してください。";
}

function updateAuthView() {
  document.body.classList.toggle("auth-required", !authUser);
  if (authGate) authGate.hidden = Boolean(authUser);
}

function yen(amount) {
  return formatter.format(amount || 0);
}

function comma(amount) {
  return new Intl.NumberFormat("ja-JP").format(amount || 0);
}

function parseMoney(value) {
  return Number(String(value || "").replace(/[^\d]/g, "")) || 0;
}

function sumBy(predicate) {
  return monthlyExpenses().filter(predicate).reduce((total, expense) => total + expense.amount, 0);
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function guessCategory(text) {
  const source = normalizeText(text);
  if (currentMode === "personal" && ["ランチ", "昼食", "lunch"].some((keyword) => source.includes(normalizeText(keyword)))) {
    return "ランチ（外食）";
  }

  for (const rule of storeCategoryRules) {
    if (rule.keywords.some((keyword) => source.includes(normalizeText(keyword)))) return categoryForCurrentMode(rule.category);
  }

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => source.includes(normalizeText(keyword)))) return categoryForCurrentMode(category);
  }
  return "食費";
}

function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, "");
}

async function readReceiptDraft(file) {
  const fileHint = file.name.replace(/\.[^.]+$/, "");
  try {
    const cloudResult = await readTextWithCloudVision(file);
    return buildReceiptDraftFromText(cloudResult.text, fileHint, {
      amountCandidates: cloudResult.amountCandidates,
      date: cloudResult.date,
      category: cloudResult.category,
      memo: cloudResult.storeName,
      ocrEngine: "cloud-vision",
      usage: cloudResult.usage,
    });
  } catch (error) {
    console.error(error);
    return buildReceiptErrorDraft(error, fileHint);
  }
}

function buildReceiptErrorDraft(error, fileHint) {
  const code = error?.code || "";
  const message = error?.message || "";
  let errorTitle = "Cloud Visionに接続できませんでした";
  let errorBody = "無料OCRには切り替えません。ログイン状態、Functionsのデプロイ、GitHub Pagesへの反映を確認してください。";

  if (code === "functions/resource-exhausted" || code === "resource-exhausted" || message.includes("OCR_MONTHLY_LIMIT")) {
    errorTitle = "今月のOCR上限に達しました";
    errorBody = "安全のため月900回で自動停止しています。今月は手入力で登録してください。";
  } else if (code === "functions/permission-denied" || code === "permission-denied") {
    errorTitle = "このアカウントではOCRを使えません";
    errorBody = "Firebaseに登録済みで、Functions側に許可された家族アカウントでログインしてください。";
  } else if (code === "functions/unauthenticated" || code === "unauthenticated") {
    errorTitle = "ログインが必要です";
    errorBody = "ログイン後にもう一度レシートを撮影してください。";
  } else if (code === "functions/not-found" || code === "not-found") {
    errorTitle = "Cloud Vision OCRが未反映です";
    errorBody = "Functionsのデプロイ、またはGitHub PagesへのPushがまだ反映されていない可能性があります。";
  } else if (code === "internal" || code === "http/500") {
    errorTitle = "Cloud Vision処理でエラーが出ました";
    errorBody = "Vision APIやFunctionsの権限を確認してください。";
  } else if (code) {
    errorBody = `エラーコード: ${code}。Functionsのログを確認してください。`;
  }

  return {
    amount: null,
    amountCandidates: [],
    date: "",
    category: "食費",
    memo: guessMemo(fileHint) || "レシート内容",
    confidence: "warning",
    usedOcr: false,
    ocrEngine: "",
    rawText: "",
    errorTitle,
    errorBody,
  };
}

function buildReceiptDraftFromText(text, fileHint, options = {}) {
  const sourceText = [text, fileHint].filter(Boolean).join("\n");
  const amountCandidates = options.amountCandidates?.length ? options.amountCandidates : extractAmountCandidates(sourceText);
  const amount = amountCandidates[0]?.amount || null;
  const receiptDate = options.date || extractReceiptDate(sourceText);
  const storeName = options.memo || guessStoreName(sourceText, fileHint);
  const category = options.category || guessCategory([storeName, sourceText].filter(Boolean).join("\n"));

  return {
    amount,
    amountCandidates,
    date: receiptDate,
    category,
    memo: storeName || guessMemo(sourceText, fileHint) || "レシート内容",
    confidence: amount && text ? "ready" : "warning",
    usedOcr: Boolean(text),
    ocrEngine: options.ocrEngine || "",
    rawText: text,
    usage: options.usage || null,
    fallback: Boolean(options.fallback),
  };
}

async function readTextWithCloudVision(file) {
  if (!auth.currentUser) throw new Error("ログイン後にOCRを使えます。");

  const imageBase64 = await resizeReceiptForCloudVision(file);
  const idToken = await auth.currentUser.getIdToken();
  const response = await fetch(cloudVisionEndpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageBase64 }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "Cloud Vision OCRに失敗しました。");
    error.code = payload.code || `http/${response.status}`;
    throw error;
  }
  return payload;
}

async function resizeReceiptForCloudVision(file) {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 1400;
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.82).replace(/^data:image\/jpeg;base64,/, "");
}

async function readTextOnDevice(file) {
  const nativeText = await readTextWithNativeDetector(file);
  if (nativeText) {
    return { text: nativeText, engine: "native" };
  }

  const tesseractText = await readTextWithTesseract(file);
  if (tesseractText) {
    return { text: tesseractText, engine: "tesseract" };
  }

  return { text: "", engine: "" };
}

async function readTextWithNativeDetector(file) {
  if (!("TextDetector" in window)) return "";

  try {
    const bitmap = await createImageBitmap(file);
    const detector = new TextDetector();
    const detected = await detector.detect(bitmap);
    return detected.map((item) => item.rawValue).join(" ");
  } catch {
    return "";
  }
}

async function readTextWithTesseract(file) {
  let amountWorker = null;
  let textWorker = null;
  try {
    setScanStatus("warning", "無料OCRを準備中", "写真は外部AIに送らず、ブラウザ内で文字を読み取ります。");
    const { createWorker } = await loadTesseract();
    amountWorker = await createWorker(receiptAmountOcrLanguage, 1, {
      logger: (message) => updateOcrProgress(message),
    });

    await amountWorker.setParameters({
      preserve_interword_spaces: "1",
      tessedit_pageseg_mode: "6",
      tessedit_char_whitelist: "0123456789,.¥￥円YENyenTOTALtotalTax税合計小計税込お会計現計",
      user_defined_dpi: "300",
    });

    const images = await prepareReceiptImages(file);
    const results = [];
    for (const [index, image] of images.entries()) {
      setScanStatus("warning", `レシートを読み取り中 ${index + 1}/${images.length}`, "金額候補を優先して探しています。");
      const {
        data: { text },
      } = await amountWorker.recognize(image.src);
      results.push(`${image.label}\n${text}`);
      if (extractAmountCandidates(results.join("\n")).length >= 3) break;
    }

    await amountWorker.terminate();
    amountWorker = null;

    setScanStatus("warning", "日付と店舗名を読み取り中", "店名からカテゴリも推測します。");
    textWorker = await createWorker(receiptTextOcrLanguages, 1, {
      logger: (message) => updateOcrProgress(message),
    });
    await textWorker.setParameters({
      preserve_interword_spaces: "1",
      tessedit_pageseg_mode: "6",
      user_defined_dpi: "300",
    });
    const textImages = images.filter((image) => image.label !== "白黒補正").slice(0, 2);
    for (const [index, image] of textImages.entries()) {
      setScanStatus("warning", `日付と店舗名を読み取り中 ${index + 1}/${textImages.length}`, "金額候補とは別に文字も確認しています。");
      const {
        data: { text },
      } = await textWorker.recognize(image.src);
      results.push(`${image.label} 文字\n${text}`);
    }

    return results.join("\n").trim();
  } catch (error) {
    console.error(error);
    return "";
  } finally {
    if (amountWorker) await amountWorker.terminate();
    if (textWorker) await textWorker.terminate();
  }
}

function loadTesseract() {
  if (window.Tesseract?.createWorker) return Promise.resolve(window.Tesseract);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`[src="${tesseractScriptUrl}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Tesseract), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = tesseractScriptUrl;
    script.async = true;
    script.onload = () => {
      if (window.Tesseract?.createWorker) {
        resolve(window.Tesseract);
        return;
      }
      reject(new Error("Tesseract.jsを読み込めませんでした。"));
    };
    script.onerror = reject;
    document.head.append(script);
  });
}

function updateOcrProgress(message) {
  if (!message?.status) return;
  const progress = typeof message.progress === "number" ? Math.round(message.progress * 100) : null;
  const suffix = progress !== null && progress > 0 ? ` ${progress}%` : "";
  const statusMap = {
    "loading tesseract core": "OCRエンジンを準備中",
    "initializing tesseract": "OCRエンジンを初期化中",
    "loading language traineddata": "日本語読み取りデータを準備中",
    "initializing api": "読み取り設定を準備中",
    "recognizing text": "レシートを読み取り中",
  };
  setScanStatus("warning", `${statusMap[message.status] || "OCR処理中"}${suffix}`, "初回は時間がかかります。次回以降は少し速くなります。");
}

async function prepareReceiptImages(file) {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 1800;
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const enhanced = enhanceReceiptCanvas(canvas, { threshold: false });
  const threshold = enhanceReceiptCanvas(canvas, { threshold: true });
  const bottomCrop = cropCanvas(enhanced, 0.2, 1);

  return [
    { label: "補正画像", src: enhanced.toDataURL("image/png") },
    { label: "白黒補正", src: threshold.toDataURL("image/png") },
    { label: "下部候補", src: bottomCrop.toDataURL("image/png") },
  ];
}

function enhanceReceiptCanvas(sourceCanvas, options = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(sourceCanvas, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const grayscale = [];

  for (let i = 0; i < pixels.length; i += 4) {
    const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
    grayscale.push(gray);
  }

  const average = grayscale.reduce((sum, value) => sum + value, 0) / Math.max(grayscale.length, 1);

  for (let i = 0; i < pixels.length; i += 4) {
    const gray = grayscale[i / 4];
    let value = Math.max(0, Math.min(255, (gray - 128) * 1.85 + 138));
    if (options.threshold) {
      value = gray > average * 0.92 ? 255 : 0;
    }
    pixels[i] = value;
    pixels[i + 1] = value;
    pixels[i + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function cropCanvas(sourceCanvas, startRatio, endRatio) {
  const y = Math.round(sourceCanvas.height * startRatio);
  const height = Math.max(1, Math.round(sourceCanvas.height * (endRatio - startRatio)));
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(sourceCanvas, 0, y, sourceCanvas.width, height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function extractAmountCandidates(text) {
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const candidates = [];

  lines.forEach((line, index) => {
    extractNumbers(line).forEach((amount) => {
      if (amount < 10 || amount > 999999) return;
      candidates.push({
        amount,
        score: amountLineScore(line, index, lines.length),
        line,
      });
    });
  });

  candidates.sort((a, b) => b.score - a.score || b.amount - a.amount);
  const seen = new Set();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.amount)) return false;
    seen.add(candidate.amount);
    return true;
  }).slice(0, 8);
}

function extractAmount(text) {
  return extractAmountCandidates(text)[0]?.amount || null;
}

function extractReceiptDate(text) {
  const now = new Date();
  const source = String(text || "")
    .replace(/[年月]/g, "/")
    .replace(/[日.]/g, " ")
    .replace(/[（(].*?[）)]/g, " ");
  const patterns = [
    /((?:20)?\d{2})[/-](\d{1,2})[/-](\d{1,2})/,
    /(\d{1,2})[/-](\d{1,2})\s+(?:\d{1,2}:\d{2})?/,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (!match) continue;
    const hasYear = match.length === 4;
    const year = hasYear ? normalizeReceiptYear(Number(match[1])) : now.getFullYear();
    const month = Number(match[hasYear ? 2 : 1]);
    const day = Number(match[hasYear ? 3 : 2]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return formatDateLocal(date);
    }
  }

  return "";
}

function normalizeReceiptYear(year) {
  if (year < 100) return 2000 + year;
  return year;
}

function extractNumbers(line) {
  const normalized = String(line || "")
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[，,]/g, "")
    .replace(/(\d)[.．]\s*(\d{3})\b/g, "$1$2")
    .replace(/[Oo]/g, "0")
    .replace(/[Il|]/g, "1")
    .replace(/[Ss]/g, "5");
  const matches = normalized.match(/(?:¥|円)?\s*\d{2,7}\s*(?:円|yen)?/gi) || [];
  return matches.map((match) => Number(match.replace(/[^\d]/g, ""))).filter(Boolean);
}

function amountLineScore(line, index, lineCount) {
  const source = normalizeText(line);
  let score = 0;
  if (/総合計|合計|お買上合計|お会計|現計|請求額|total|ttl/.test(source)) score += 300;
  if (/クレジット|カード|電子マネー|paypay|支払/.test(source)) score += 120;
  if (/税込|金額|amount|yen/.test(source)) score += 60;
  if (/小計|税|消費税|内税|対象|tax/.test(source)) score -= 70;
  if (/補正画像|白黒補正|下部候補/.test(line)) score += 6;
  if (/お預|預り|釣|お釣|釣銭|ポイント|会員|電話|tel|no\.|番号/.test(source)) score -= 80;
  if (/\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}:\d{2}/.test(line)) score -= 60;
  score += Math.round((index / Math.max(lineCount - 1, 1)) * 10);
  return score;
}

function cleanupMemo(text) {
  return String(text || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]?\d{2,7}(円|yen)?/gi, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function guessStoreName(text, fallback = "") {
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => cleanupStoreLine(line))
    .filter(Boolean);

  const known = lines.find((line) =>
    storeCategoryRules.some((rule) => rule.keywords.some((keyword) => normalizeText(line).includes(normalizeText(keyword)))),
  );
  if (known) return known;

  const candidate = lines.find((line) => {
    if (line.length < 2 || line.length > 24) return false;
    if (/補正画像|白黒補正|下部候補|文字|合計|小計|税込|税|対象|領収|レシート|電話|tel|登録|担当|現計|釣|預|ポイント|円|¥|total|tax/i.test(line)) return false;
    if (/^\d+$/.test(line)) return false;
    if (/\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}|\d{1,2}:\d{2}/.test(line)) return false;
    return /[ぁ-んァ-ン一-龥a-zA-Z]/.test(line);
  });
  if (candidate) return candidate;

  return cleanupStoreLine(fallback);
}

function cleanupStoreLine(line) {
  return String(line || "")
    .replace(/[|｜]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s:：・*.\-]+|[\s:：・*.\-]+$/g, "")
    .trim();
}

function applyReceiptDraft(draft) {
  if (draft.date) dateInput.value = draft.date;
  memoInput.value = draft.memo;
  categoryInput.value = categoryForCurrentMode(draft.category);
  if (draft.amount) amountInput.value = draft.amount;
  updateAmountPreview(amountInput, amountPreview);
  renderOcrReview(draft);

  if (draft.errorTitle) {
    setScanStatus("warning", draft.errorTitle, draft.errorBody);
    return;
  }

  if (draft.usedOcr && draft.amount) {
    const engineLabel = draft.ocrEngine === "cloud-vision" ? "Cloud Vision" : draft.ocrEngine === "tesseract" ? "無料OCR" : "端末内OCR";
    const dateText = draft.date ? "日付も入力しました。" : "日付は読み取れなければ今日のままです。";
    const usageText = draft.usage ? ` 今月${draft.usage.count}/${draft.usage.limit}回。` : "";
    setScanStatus("ready", `${engineLabel}で候補を出しました`, `${dateText} 店舗名からカテゴリも推測しています。内容を確認して登録してください。${usageText}`);
    return;
  }

  if (draft.usedOcr) {
    const engineLabel = draft.ocrEngine === "cloud-vision" ? "Cloud Vision" : "OCR";
    setScanStatus("warning", `${engineLabel}で文字は読めました`, "金額候補が弱いです。読み取った文字を開いて確認し、金額は手入力してください。");
    return;
  }

  setScanStatus("warning", "写真を読み取れませんでした", "Cloud Visionが未デプロイ、または通信に失敗した可能性があります。金額は手入力できます。");
}

function renderOcrReview(draft) {
  if (!ocrReview || !ocrAmountList || !ocrRawText) return;
  const candidates = draft.amountCandidates || [];
  const hasText = Boolean(draft.rawText);
  ocrReview.hidden = !candidates.length && !hasText;
  ocrRawText.textContent = draft.rawText || "読み取った文字はありません。";

  if (!candidates.length) {
    ocrAmountList.innerHTML = `<p class="expense-meta">金額候補が見つかりませんでした。金額欄に手入力してください。</p>`;
    return;
  }

  ocrAmountList.innerHTML = candidates
    .map(
      (candidate, index) => `
        <button class="${index === 0 ? "selected" : ""}" type="button" data-ocr-amount="${candidate.amount}">
          <strong>${yen(candidate.amount)}</strong>
          <span>${candidate.line}</span>
        </button>
      `,
    )
    .join("");
}

function hideOcrReview() {
  if (ocrReview) ocrReview.hidden = true;
  if (ocrAmountList) ocrAmountList.innerHTML = "";
  if (ocrRawText) ocrRawText.textContent = "";
}

function addSplitRow(data = {}) {
  if (!splitRows) return;
  const row = document.createElement("div");
  row.className = "split-row";
  row.innerHTML = `
    <input class="split-amount calc-input" type="text" inputmode="text" pattern="[0-9+-]*" autocomplete="off" placeholder="118+290" value="${escapeAttribute(data.amount || "")}" />
    <select class="split-category">
      ${categoryOptionsHtml(data.category || "日用品")}
    </select>
    <button class="calc-apply-button" type="button" data-apply-calc aria-label="計算する">＝</button>
    <button class="icon-button" type="button" data-remove-split aria-label="内訳を削除">×</button>
    <small class="split-preview">半角数字と+-だけ使えます</small>
  `;
  splitRows.append(row);
  const input = row.querySelector(".split-amount");
  activeCalcInput = input;
  input.focus();
}

function clearSplitRows() {
  if (splitRows) splitRows.innerHTML = "";
}

function getSplitParts() {
  if (!splitRows) return [];
  return [...splitRows.querySelectorAll(".split-row")]
    .map((row) => {
      const rawAmount = row.querySelector(".split-amount")?.value || "";
      const amount = parseAmountExpression(rawAmount);
      const category = row.querySelector(".split-category")?.value || "その他";
      return { amount, category, rawAmount };
    })
    .filter((part) => part.rawAmount.trim())
    .map(({ amount, category }) => ({ amount, category }));
}

function categoryOptionsHtml(selectedCategory) {
  return visibleCategories()
    .map((category) => `<option value="${category}"${category === selectedCategory ? " selected" : ""}>${category}</option>`)
    .join("");
}

function visibleCategories(mode = currentMode) {
  return categories.filter((category) => {
    const modes = categoryModeMap[category];
    return !modes || modes.includes(mode);
  });
}

function categoryForCurrentMode(category) {
  if (visibleCategories().includes(category)) return category;
  if (category === "ランチ（外食）") return "外食費";
  if (category === "衣服・美容" || category === "家具家電") return "日用品";
  if (category === "キャンプ（娯楽費）") return "娯楽費";
  if (category === "奨学金") return "その他";
  return visibleCategories()[0] || "その他";
}

function renderCategoryOptions() {
  document.querySelectorAll(".split-category").forEach((select) => {
    const selected = categoryForCurrentMode(select.value);
    select.innerHTML = categoryOptionsHtml(selected);
    select.value = selected;
  });
}

function parseAmountExpression(value) {
  const source = sanitizeAmountExpression(value);
  if (!source) return 0;
  if (!/^\d+(?:[+\-]\d+)*$/.test(source)) return 0;
  const total = source.match(/[+\-]?\d+/g).reduce((sum, item) => sum + Number(item), 0);
  return Number.isFinite(total) && total > 0 ? total : 0;
}

function sanitizeAmountExpression(value) {
  return String(value || "").replace(/[^0-9+-]/g, "");
}

function handleAmountInput(input, preview) {
  const sanitized = sanitizeAmountExpression(input.value);
  if (input.value !== sanitized) input.value = sanitized;
  updateAmountPreview(input, preview);
}

function updateAmountPreview(input, preview) {
  if (!input || !preview) return;
  const amount = parseAmountExpression(input.value);
  preview.textContent = amount ? `= ${yen(amount)}` : "半角数字と+-だけ使えます";
}

function applyAmountExpression(row) {
  const input = row?.querySelector(".calc-input");
  if (!input) return;
  const amount = parseAmountExpression(input.value);
  if (amount) input.value = String(amount);
  updateAmountPreview(input, row.querySelector(".amount-preview, .split-preview"));
  input.focus();
}

function applyCalculatorKey(key) {
  const input = activeCalcInput || amountInput;
  if (!input) return;
  if (key === "clear") {
    input.value = "";
  } else if (key === "back") {
    input.value = input.value.slice(0, -1);
  } else if (key === "apply") {
    const amount = parseAmountExpression(input.value);
    if (amount) input.value = String(amount);
  } else {
    input.value = `${input.value || ""}${key}`;
  }
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.focus();
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatShortDate(dateKey) {
  const [, month, day] = String(dateKey || "").match(/^\d{4}-(\d{2})-(\d{2})$/) || [];
  return month && day ? `${Number(month)}/${Number(day)}` : dateKey;
}

function guessMemo(text, fallback = "") {
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => cleanupMemo(line))
    .filter((line) => line.length >= 2 && line.length <= 24);
  const line = lines.find((item) => !/合計|小計|税込|税|領収|レシート|電話|tel|登録|担当|円|¥|\d{2,}/i.test(item));
  if (line) return line;

  const cleaned = cleanupMemo(fallback || text);
  const words = cleaned.split(/\s+/).filter((word) => word && !/^\d+$/.test(word));
  return words.slice(0, 3).join(" ");
}

function setScanStatus(level, title, body) {
  scanStatus.className = `scan-status ${level}`;
  scanStatus.innerHTML = `<strong>${title}</strong><span>${body}</span>`;
}

function categoryTotals() {
  return visibleCategories().map((category) => ({
    category,
    total: categoryTotal(category),
    budget: budgetForCategory(category),
  }));
}

function buildAdvice(total, food, dining) {
  const messages = [];
  const diningRate = percent(dining, food);
  const totalRate = percent(total, budgets.total);

  if (!monthlyExpenses().length) {
    return [
      { level: "normal", title: "まずは1週間だけ記録", body: `完璧な分類より、${modeConfig[currentMode].emptyAdvice}` },
      { level: "normal", title: "外食費は独立カテゴリ", body: "食費に混ぜず外食費として登録すると、節約ポイントがかなり見つけやすくなります。" },
    ];
  }

  if (dining > budgets.dining) {
    messages.push({
      level: "warning",
      title: "外食費が予算を超えています",
      body: `今月の外食費は${yen(dining)}、予算は${yen(budgets.dining)}です。週1回だけ自炊に寄せる日を作ると効果が出やすいです。`,
    });
  } else if (diningRate >= 35) {
    messages.push({
      level: "warning",
      title: "食費の中で外食比率が高めです",
      body: `外食が食費の${diningRate}%を占めています。ランチ、カフェ、夕食のどこが多いか次に分けて見るのがおすすめです。`,
    });
  } else {
    messages.push({
      level: "normal",
      title: "外食費は管理できています",
      body: `外食比率は食費の${diningRate}%です。この水準なら、日用品や光熱費の見直しも並行できます。`,
    });
  }

  if (totalRate >= 85) {
    messages.push({
      level: "warning",
      title: "月末前に生活費が膨らんでいます",
      body: `生活費予算の${totalRate}%まで使っています。今週は娯楽費と日用品の追加購入を一度確認しましょう。`,
    });
  }

  const utilities = sumBy((expense) => expense.category === "光熱費");
  if (utilities >= 25000) {
    messages.push({
      level: "normal",
      title: "光熱費の固定的な見直し余地",
      body: "電気・ガスの契約プラン、待機電力、エアコン設定を一度見直すと毎月の節約につながります。",
    });
  }

  const entertainment = sumBy((expense) => expense.category === "娯楽費");
  if (budgets.entertainment && entertainment > budgets.entertainment) {
    messages.push({
      level: "warning",
      title: "娯楽費が予算を超えています",
      body: `娯楽費は${yen(entertainment)}です。今月は無料で楽しめる予定を混ぜると調整しやすいです。`,
    });
  }

  const other = sumBy((expense) => expense.category === "その他");
  if (budgets.other && other > budgets.other) {
    messages.push({
      level: "warning",
      title: "その他の支出が膨らんでいます",
      body: "その他が多い月は、あとから分類を見直すだけで節約ポイントが見えやすくなります。",
    });
  }

  const special = sumBy((expense) => expense.category === "臨時出費");
  if (budgets.special && special > budgets.special) {
    messages.push({
      level: "warning",
      title: "臨時出費が予算を超えています",
      body: `臨時出費は${yen(special)}です。お歳暮、帰省、修理などは専用枠に入れると普段の生活費と分けて見られます。`,
    });
  }

  if (currentMode === "couple") {
    const payerTotals = ["旦那", "妻"].map((payer) => ({
      payer,
      total: sumBy((expense) => advancePayerFor(expense) === payer),
    }));
    const difference = Math.abs(payerTotals[0].total - payerTotals[1].total);
    const advanceTotal = payerTotals[0].total + payerTotals[1].total;
    if (advanceTotal) {
      messages.push({
        level: "normal",
        title: difference >= 10000 ? "立替負担に差があります" : "立替を記録できています",
        body: `旦那立替は${yen(payerTotals[0].total)}、妻立替は${yen(payerTotals[1].total)}です。共有クレカ以外の精算目安にできます。`,
      });
    }
  }

  return messages.slice(0, 4);
}

function renderMetrics() {
  const total = currentTotalSpend();
  const diningCategories = ["外食費", "ランチ（外食）"];
  const food = sumBy((expense) => expense.category === "食費" || diningCategories.includes(expense.category));
  const dining = sumBy((expense) => diningCategories.includes(expense.category));
  const diningCount = monthlyExpenses().filter((expense) => diningCategories.includes(expense.category)).length;
  const remaining = budgets.total - total;
  const savingCandidate = budgets.income ? (budgets.income || 0) - total : 0;
  const savingGap = (budgets.savings || 0) - savingCandidate;

  document.querySelector("#totalSpend").textContent = yen(total);
  document.querySelector("#foodSpend").textContent = yen(food);
  document.querySelector("#diningSpend").textContent = yen(dining);
  document.querySelector("#diningCount").textContent = `${diningCount}回`;
  document.querySelector("#remainingBudget").textContent = yen(remaining);
  document.querySelector("#savingCandidate").textContent = yen(savingCandidate);
  document.querySelector("#actualSavings").textContent = yen(budgets.savings || 0);
  document.querySelector("#foodShare").textContent = `生活費の${percent(food, total)}%`;
  document.querySelector("#diningShare").textContent = `食費の${percent(dining, food)}%`;
  document.querySelector("#totalTrend").textContent = total ? `予算の${percent(total, budgets.total)}%を使用` : "データを入力してください";
  document.querySelector("#budgetStatus").textContent = remaining >= 0 ? "予算内" : "予算超過";
  document.querySelector("#savingCandidateNote").textContent = budgets.income ? `手取り${yen(budgets.income)}から差引` : "手取りを予算に入力";
  document.querySelector("#savingStatus").textContent = !budgets.income
    ? "手取りを予算に入力"
    : budgets.savings
      ? savingGap >= 0
        ? `候補より${yen(savingGap)}多め`
        : `候補まであと${yen(Math.abs(savingGap))}`
      : savingCandidate < 0
        ? `手取りより${yen(Math.abs(savingCandidate))}超過`
        : "貯金額を予算に入力";
}

function renderAdvanceSummary() {
  const summary = document.querySelector("#advanceSummary");
  if (!summary) return;

  summary.hidden = currentMode !== "couple";
  if (currentMode !== "couple") return;

  const totals = advanceTotals();
  document.querySelector("#husbandAdvance").textContent = yen(totals.husband);
  document.querySelector("#wifeAdvance").textContent = yen(totals.wife);
  document.querySelector("#advanceTotal").textContent = yen(totals.total);
  renderAdvanceDetail();

  if (!totals.total) {
    document.querySelector("#advanceSettlement").textContent = "なし";
    document.querySelector("#advanceNote").textContent = "この月は旦那・妻の立替登録がありません。";
    return;
  }

  if (!totals.difference) {
    document.querySelector("#advanceSettlement").textContent = "差額なし";
    document.querySelector("#advanceNote").textContent = "旦那と妻の立替額は同額です。";
    return;
  }

  const receiver = totals.husband > totals.wife ? "旦那" : "妻";
  const payer = totals.husband > totals.wife ? "妻" : "旦那";
  document.querySelector("#advanceSettlement").textContent = `${payer} → ${receiver} ${yen(totals.settlement)}`;
  document.querySelector("#advanceNote").textContent = `差額は${yen(totals.difference)}です。夫婦で半分ずつ負担するなら、${payer}が${receiver}へ${yen(totals.settlement)}渡す目安です。`;
}

function renderAdvanceDetail() {
  const detail = document.querySelector("#advanceDetail");
  if (!detail) return;

  document.querySelectorAll("[data-advance-detail]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.advanceDetail === selectedAdvanceDetail);
  });

  const allItems = monthlyExpenses().filter((expense) => advancePayerFor(expense));
  if (!allItems.length) {
    detail.hidden = true;
    detail.innerHTML = "";
    return;
  }

  const items = selectedAdvanceDetail
    ? allItems.filter((expense) => advancePayerFor(expense) === selectedAdvanceDetail)
    : allItems;
  detail.hidden = false;
  if (!items.length) {
    detail.innerHTML = `
      <div class="advance-detail-head">
        <strong>${selectedAdvanceDetail}立替の内訳</strong>
        <span>0件</span>
      </div>
      <p>${selectedAdvanceDetail}立替の登録はありません。</p>
    `;
    return;
  }

  const total = items.reduce((sum, expense) => sum + expense.amount, 0);
  const heading = selectedAdvanceDetail ? `${selectedAdvanceDetail}立替の内訳` : "立替登録の内訳";
  detail.innerHTML = `
    <div class="advance-detail-head">
      <strong>${heading}</strong>
      <span>${items.length}件・${yen(total)}</span>
    </div>
    <div class="advance-detail-list">
      ${items.map((expense) => `
        <div class="advance-detail-row">
          <span>${formatShortDate(expense.date)} ${escapeHtml(expense.memo || "メモなし")}</span>
          <small>${advancePayerFor(expense)} / ${expense.category}</small>
          <strong>${yen(expense.amount)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderCategories() {
  const list = document.querySelector("#categoryList");
  const totals = sortCategoryTotals(categoryTotals());
  const maxTotal = Math.max(...totals.map((item) => item.total), 1);
  renderCategoryPieChart(totals);

  list.innerHTML = totals
    .map((item) => {
      const width = Math.max(4, Math.round((item.total / maxTotal) * 100));
      const budgetText = item.budget ? ` / 予算${yen(item.budget)}・${percent(item.total, item.budget)}%` : "";
      return `
        <div class="category-row">
          <span class="category-name">${item.category}</span>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill" style="width: ${width}%; background: ${colorByCategory[item.category]}"></div>
          </div>
          <span class="category-amount">${yen(item.total)}${budgetText}</span>
        </div>
      `;
    })
    .join("");
}

function renderCalendar() {
  if (!calendarGrid || !calendarTotal) return;

  const { start } = currentMonthRange(selectedMonthOffset);
  const year = start.getFullYear();
  const month = start.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const expensesByDate = dailyExpenseMap();
  const total = Array.from(expensesByDate.values()).reduce((sum, day) => sum + day.total, 0);
  const todayKey = formatDateLocal(new Date());
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  calendarTotal.textContent = yen(total);
  calendarGrid.innerHTML = Array.from({ length: cellCount }, (_, index) => {
    const day = index - firstWeekday + 1;
    if (day < 1 || day > daysInMonth) {
      return `<div class="calendar-day empty" aria-hidden="true"></div>`;
    }

    const date = new Date(year, month, day);
    const dateKey = formatDateLocal(date);
    const dayData = expensesByDate.get(dateKey);
    const stamp = !dayData ? noSpendStamps[dateKey] : "";
    const weekday = date.getDay();
    const classes = [
      "calendar-day",
      dayData ? "has-expense" : "",
      stamp ? "has-stamp" : "",
      dateKey === todayKey ? "today" : "",
      weekday === 0 ? "sunday" : "",
      weekday === 6 ? "saturday" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const amount = dayData ? `<strong>${compactYen(dayData.total)}</strong>` : "";
    const isFluffyStamp = stamp === "青もふ";
    const stampTextClass = stamp && Array.from(stamp).length > 1 && !isFluffyStamp ? "is-text-stamp" : "";
    const stampFluffyClass = isFluffyStamp ? "is-fluffy-stamp" : "";
    const stampContent = isFluffyStamp ? `<span class="fluffy-face" aria-hidden="true"></span>` : stamp || "＋";
    const stampButton = !dayData
      ? `<button class="calendar-stamp-button ${stamp ? "is-stamped" : "add-stamp"} ${stampTextClass} ${stampFluffyClass}" type="button" data-stamp-date="${dateKey}" aria-label="${day}日に支出なしスタンプ">${stampContent}</button>`
      : "";

    return `
      <div class="${classes}" aria-label="${day}日 ${dayData ? yen(dayData.total) : stamp ? `支出なし ${stamp}` : "支出なし"}">
        <button class="calendar-date-button" type="button" data-calendar-date="${dateKey}">
          <span>${day}</span>
          ${amount}
        </button>
        ${stampButton}
      </div>
    `;
  }).join("");
}

function dailyExpenseMap() {
  const map = new Map();
  const visibleExpenses = [...monthlyExpenses(), ...fixedMonthlyExpenses()];

  visibleExpenses.forEach((expense) => {
    const dateKey = expense.date;
    const day = map.get(dateKey) || { total: 0, categories: new Map() };
    day.total += expense.amount;
    day.categories.set(expense.category, (day.categories.get(expense.category) || 0) + expense.amount);
    map.set(dateKey, day);
  });

  return map;
}

function compactYen(amount) {
  if (amount >= 10000) {
    const value = Math.round(amount / 1000) / 10;
    return `¥${value}万`;
  }
  return `¥${comma(amount)}`;
}

function openDateForInput(dateKey) {
  dateInput.value = dateKey;
  clearEditState(false);
  renderSelectedDay();
  navigateTo("#receipt");
}

function openStampSheet(dateKey) {
  if (dailyExpenseMap().has(dateKey)) {
    return;
  }

  stampSheetScrollPosition ||= { left: window.scrollX, top: window.scrollY };
  pendingStampDate = dateKey;
  const date = new Date(`${dateKey}T00:00:00`);
  stampTargetLabel.textContent = `${date.getMonth() + 1}月${date.getDate()}日`;
  if (clearStampButton) clearStampButton.dataset.clearStampDate = dateKey;
  stampPicker.hidden = false;
  document.body.classList.add("stamp-sheet-open");
  syncStampButtons();
}

function applyNoSpendStamp(stamp) {
  const stampDate = pendingStampDate;
  if (!stampDate) return;

  deletedNoSpendStampDates.delete(stampDate);
  noSpendStamps[stampDate] = stamp;
  saveNoSpendStamps();
  closeStampSheet();
  renderCalendar();
}

function clearNoSpendStamp() {
  const stampDate = pendingStampDate || clearStampButton?.dataset.clearStampDate;
  if (!stampDate) return;

  const scrollPosition = stampSheetScrollPosition || { left: window.scrollX, top: window.scrollY };
  deletedNoSpendStampDates.add(stampDate);
  delete noSpendStamps[stampDate];
  saveNoSpendStamps(true);
  closeStampSheet();
  renderCalendar();
  restoreScrollPosition(scrollPosition);
}

function closeStampSheet() {
  const scrollPosition = stampSheetScrollPosition;
  pendingStampDate = "";
  if (clearStampButton) delete clearStampButton.dataset.clearStampDate;
  stampPicker.hidden = true;
  document.body.classList.remove("stamp-sheet-open");
  stampSheetScrollPosition = null;
  if (scrollPosition) restoreScrollPosition(scrollPosition);
}

function restoreScrollPosition({ left, top }) {
  const restore = () => window.scrollTo({ left, top });
  requestAnimationFrame(() => {
    restore();
    window.setTimeout(restore, 0);
    window.setTimeout(restore, 120);
  });
}

function navigateTo(nextView) {
  if (window.location.hash !== nextView) {
    history.pushState(null, "", nextView);
  }
  updateViewFromHash();
}

function startEditExpense(id) {
  const expense = expenses.find((item) => item.id === id);
  if (!expense) return;

  editingExpenseId = id;
  dateInput.value = expense.date;
  memoInput.value = expense.memo;
  amountInput.value = expense.amount;
  renderCategoryOptions();
  categoryInput.value = categoryForCurrentMode(expense.category);
  clearSplitRows();
  updateAmountPreview(amountInput, amountPreview);
  selectedAdvancePayer = currentMode === "couple" ? advancePayerFor(expense) : "";
  syncAdvanceButtons();
  submitButton.textContent = "更新する";
  cancelEditButton.hidden = false;
  renderSelectedDay();
  memoInput.focus();
}

function deleteExpense(id) {
  const expense = expenses.find((item) => item.id === id);
  if (!expense) return;
  const ok = window.confirm(`${expense.memo}（${yen(expense.amount)}）を削除しますか？`);
  if (!ok) return;

  expenses = expenses.filter((item) => item.id !== id);
  if (editingExpenseId === id) clearEditState(false);
  saveExpenses();
  render();
}

function clearEditState(resetForm = true) {
  editingExpenseId = "";
  if (resetForm) {
    form.reset();
    dateInput.valueAsDate = new Date();
    clearSplitRows();
    updateAmountPreview(amountInput, amountPreview);
    selectedAdvancePayer = "";
    syncAdvanceButtons();
  }
  submitButton.textContent = "登録する";
  cancelEditButton.hidden = true;
  renderSelectedDay();
}

function syncAdvanceButtons() {
  document.querySelectorAll("[data-advance-payer]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.advancePayer === selectedAdvancePayer);
  });
}

function renderSelectedDay() {
  if (!selectedDateLabel || !selectedDateTotal || !selectedDayExpenses) return;

  const dateKey = dateInput.value || formatDateLocal(new Date());
  const entries = expenses
    .filter((expense) => expense.date === dateKey)
    .sort((a, b) => b.amount - a.amount);
  const fixed = dateKey === formatDateLocal(currentMonthRange(selectedMonthOffset).start) ? fixedMonthlyExpenses() : [];
  const total = [...entries, ...fixed].reduce((sum, expense) => sum + expense.amount, 0);
  const date = new Date(`${dateKey}T00:00:00`);
  selectedDateLabel.textContent = `${date.getMonth() + 1}月${date.getDate()}日の登録`;
  selectedDateTotal.textContent = yen(total);

  if (!entries.length && !fixed.length) {
    selectedDayExpenses.innerHTML = `<p class="expense-meta">この日はまだ登録がありません。</p>`;
    return;
  }

  selectedDayExpenses.innerHTML = [
    ...fixed.map(
      (expense) => `
        <article class="selected-day-item fixed">
          <div>
            <strong>${expense.memo}</strong>
            <span>${expense.category}</span>
          </div>
          <b>${yen(expense.amount)}</b>
        </article>
      `,
    ),
    ...entries.map(
      (expense) => `
        <article class="selected-day-item ${expense.id === editingExpenseId ? "editing" : ""}">
          <div class="selected-day-main">
            <strong>${expense.memo}</strong>
            <span>${expense.category}${currentMode === "couple" ? `・${paymentLabel(expense)}` : ""}</span>
          </div>
          <b>${yen(expense.amount)}</b>
          <div class="selected-day-actions" aria-label="操作">
            <button class="icon-button" type="button" data-edit-expense="${expense.id}" aria-label="編集" title="編集">✎</button>
            <button class="icon-button danger" type="button" data-delete-expense="${expense.id}" aria-label="削除" title="削除">×</button>
          </div>
        </article>
      `,
    ),
  ].join("");
}

function sortCategoryTotals(totals) {
  const fixedOrder = { 光熱費: 1, 家賃: 2 };
  return [...totals].sort((a, b) => {
    const aFixed = fixedOrder[a.category] || 0;
    const bFixed = fixedOrder[b.category] || 0;
    if (aFixed || bFixed) {
      if (aFixed && bFixed) return aFixed - bFixed;
      return aFixed ? 1 : -1;
    }
    return b.total - a.total;
  });
}

function renderCategoryPieChart(totals) {
  if (!categoryPieChart) return;

  const ctx = categoryPieChart.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const size = Math.min(categoryPieChart.clientWidth || 320, 320);
  categoryPieChart.width = size * ratio;
  categoryPieChart.height = size * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const data = totals.filter((item) => item.total > 0);
  const total = data.reduce((sum, item) => sum + item.total, 0);
  renderCategoryPieLegend(data, total);
  const center = size / 2;
  const radius = Math.max(80, size / 2 - 16);

  if (!total) {
    ctx.fillStyle = "#ece8df";
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6c6f75";
    ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("データなし", center, center);
    return;
  }

  let startAngle = -Math.PI / 2;
  data.forEach((item) => {
    const angle = (item.total / total) * Math.PI * 2;
    const endAngle = startAngle + angle;
    ctx.fillStyle = colorByCategory[item.category] || "#6c6f75";
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
    drawPiePercent(ctx, percent(item.total, total), startAngle, endAngle, center, radius);
    startAngle = endAngle;
  });

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(center, center, radius * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#202124";
  ctx.font = "700 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(yen(total), center, center - 6);
  ctx.fillStyle = "#6c6f75";
  ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText("カテゴリ合計", center, center + 16);
}

function drawPiePercent(ctx, value, startAngle, endAngle, center, radius) {
  if (value < 5) return;

  const midAngle = (startAngle + endAngle) / 2;
  const labelRadius = radius * 0.72;
  const x = center + Math.cos(midAngle) * labelRadius;
  const y = center + Math.sin(midAngle) * labelRadius;
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = 3;
  ctx.font = "800 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeText(`${value}%`, x, y);
  ctx.fillText(`${value}%`, x, y);
  ctx.restore();
}

function renderCategoryPieLegend(data, total) {
  if (!categoryPieLegend) return;

  if (!total) {
    categoryPieLegend.innerHTML = `<div class="pie-legend-item"><span class="pie-legend-color" style="background: #ece8df"></span><span>なし</span></div>`;
    return;
  }

  categoryPieLegend.innerHTML = data
    .map(
      (item) => `
        <div class="pie-legend-item">
          <span class="pie-legend-color" style="background: ${colorByCategory[item.category] || "#6c6f75"}"></span>
          <span>${item.category}</span>
        </div>
      `,
    )
    .join("");
}

function renderExpenses() {
  const list = document.querySelector("#expenseList");
  if (!list) return;
  const fixedExpenses = fixedMonthlyExpenses();
  const visible = [...fixedExpenses, ...monthlyExpenses()].slice(0, 8);

  if (!visible.length) {
    list.innerHTML = `<p class="expense-meta">今月はまだ登録がありません。サンプル投入かレシート登録から始められます。</p>`;
    return;
  }

  list.innerHTML = visible
    .map(
      (expense) => `
        <article class="expense-item">
          <div>
            <p class="expense-title">${expense.memo}</p>
            <p class="expense-meta">${expense.date}・${expense.category}${currentMode === "couple" ? `・${paymentLabel(expense)}` : ""}</p>
          </div>
          <span class="expense-amount">${yen(expense.amount)}</span>
        </article>
      `,
    )
    .join("");
}

function renderAdvice() {
  const total = currentTotalSpend();
  const food = sumBy((expense) => expense.category === "食費" || expense.category === "外食費");
  const dining = sumBy((expense) => expense.category === "外食費");
  const advice = buildAdvice(total, food, dining);

  document.querySelector("#adviceList").innerHTML = advice
    .map(
      (item) => `
        <article class="advice-item ${item.level}">
          <strong>${item.title}</strong>
          <span>${item.body}</span>
        </article>
      `,
    )
    .join("");
}

function render() {
  const scrollPosition = { left: window.scrollX, top: window.scrollY };
  renderMode();
  renderMetrics();
  renderAdvanceSummary();
  renderTrendChart();
  renderCategories();
  renderCalendar();
  renderExpenses();
  renderSelectedDay();
  renderAdvice();
  updateViewFromHash({ scroll: false });
  restoreScrollPosition(scrollPosition);
}

function switchMode(mode) {
  if (!modeConfig[mode] || mode === currentMode) return;

  const activeHash = window.location.hash || "#dashboard";
  currentMode = mode;
  localStorage.setItem("budget-app-mode", currentMode);
  selectedAdvancePayer = "";
  expenses = loadExpenses();
  budgets = loadBudgets();
  noSpendStamps = loadNoSpendStamps();
  form.reset();
  dateInput.valueAsDate = new Date();
  clearEditState(false);
  receiptPreview.removeAttribute("src");
  receiptPreview.style.display = "none";
  hideOcrReview();
  render();
  subscribeCloudData();
  if (window.location.hash !== activeHash) {
    history.replaceState(null, "", activeHash);
  }
  updateViewFromHash();
}

function renderMode() {
  const config = modeConfig[currentMode];
  document.body.classList.toggle("personal-mode", currentMode === "personal");
  modeLabel.textContent = config.label;
  heroTitle.textContent = config.hero;
  monthLabel.textContent = currentMonthLabel();
  renderMonthOptions();
  renderCategoryOptions();
  renderBudgetInputs();

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.mode === currentMode);
  });
  syncStampButtons();
}

function syncStampButtons() {
  document.querySelectorAll("[data-stamp]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.stamp === selectedStamp);
  });
}

function budgetForCategory(category) {
  const map = {
    家賃: "rent",
    奨学金: "scholarship",
    光熱費: "utilities",
    通信費: "communication",
    食費: "food",
    "ランチ（外食）": "lunch",
    外食費: "dining",
    "衣服・美容": "clothingBeauty",
    家具家電: "furnitureAppliances",
    娯楽費: "entertainment",
    "キャンプ（娯楽費）": "entertainment",
    臨時出費: "special",
    その他: "other",
  };
  const key = map[category];
  return key ? budgets[key] || 0 : 0;
}

function monthlyExpenses() {
  const { start, end } = currentMonthRange(selectedMonthOffset);
  return expenses
    .filter((expense) => {
      const date = new Date(`${expense.date}T00:00:00`);
      return date >= start && date <= end;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function currentMonthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function monthRangeFor(offsetFromCurrent) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetFromCurrent, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetFromCurrent + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function fixedMonthlyExpense(category, memo, amount) {
  return {
    date: formatDateLocal(currentMonthRange(selectedMonthOffset).start),
    memo,
    amount,
    category,
    payer: currentMode === "couple" ? "共通" : "自分",
    fixed: true,
  };
}

function fixedMonthlyExpenses() {
  return budgetKeysForGroup("fixed")
    .map((key) => {
      const item = fixedBudgetItemMap[key];
      if (!item) return null;
      return fixedMonthlyExpense(item.category, item.memo, budgets[key] || 0);
    })
    .filter((expense) => expense && expense.amount > 0);
}

function advancePayerFor(expense) {
  if (expense.advancePayer) return expense.advancePayer;
  if (expense.payer === "夫") return "旦那";
  if (expense.payer === "妻") return "妻";
  return "";
}

function advanceTotals() {
  const totals = monthlyExpenses().reduce(
    (result, expense) => {
      const advancePayer = advancePayerFor(expense);
      if (advancePayer === "旦那") result.husband += expense.amount;
      if (advancePayer === "妻") result.wife += expense.amount;
      return result;
    },
    { husband: 0, wife: 0 },
  );
  const difference = Math.abs(totals.husband - totals.wife);

  return {
    ...totals,
    total: totals.husband + totals.wife,
    difference,
    settlement: Math.round(difference / 2),
  };
}

function paymentLabel(expense) {
  const advancePayer = advancePayerFor(expense);
  return advancePayer ? `${advancePayer}立替` : "共有クレカ";
}

function categoryTotal(category) {
  const entered = sumBy((expense) => expense.category === category);
  const fixed = fixedMonthlyExpenses()
    .filter((expense) => expense.category === category)
    .reduce((sum, expense) => sum + expense.amount, 0);
  return entered + fixed;
}

function currentTotalSpend() {
  const fixed = fixedMonthlyExpenses().reduce((sum, expense) => sum + expense.amount, 0);
  return sumBy(() => true) + fixed;
}

function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthLabel() {
  const { start, end } = currentMonthRange(selectedMonthOffset);
  return `${start.getFullYear()}年${start.getMonth() + 1}月 1日-${end.getDate()}日締め`;
}

function renderMonthOptions() {
  monthSelect.innerHTML = Array.from({ length: 12 }, (_, index) => {
    const offset = -index;
    const { start } = currentMonthRange(offset);
    const label = `${start.getFullYear()}年${start.getMonth() + 1}月`;
    return `<option value="${offset}" ${offset === selectedMonthOffset ? "selected" : ""}>${label}</option>`;
  }).join("");
}

function monthlyTrendData() {
  return Array.from({ length: 12 }, (_, index) => {
    const offset = index - 11;
    const { start, end } = monthRangeFor(offset);
    const monthExpenses = expenses.filter((expense) => {
      const date = new Date(`${expense.date}T00:00:00`);
      return date >= start && date <= end;
    });
    const enteredTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const diningTotal = monthExpenses
      .filter((expense) => expense.category === "外食費")
      .reduce((sum, expense) => sum + expense.amount, 0);

    return {
      label: `${start.getMonth() + 1}月`,
      total: enteredTotal + fixedMonthlyExpenses().reduce((sum, expense) => sum + expense.amount, 0),
      dining: diningTotal,
    };
  });
}

function renderTrendChart() {
  if (!trendChart) return;

  const data = monthlyTrendData();
  const ctx = trendChart.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = trendChart.clientWidth || 900;
  const height = trendChart.clientHeight || 320;
  trendChart.width = width * ratio;
  trendChart.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const padding = { top: 20, right: 18, bottom: 42, left: 58 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.flatMap((item) => [item.total, item.dining]), budgets.total, 1);
  const yMax = Math.ceil(maxValue / 50000) * 50000;

  drawChartGrid(ctx, data, padding, plotWidth, plotHeight, yMax);
  drawLine(ctx, data, "total", "#2d5f8f", padding, plotWidth, plotHeight, yMax);
  drawLine(ctx, data, "dining", "#b9473c", padding, plotWidth, plotHeight, yMax);
  renderTrendSummary(data);
}

function drawChartGrid(ctx, data, padding, plotWidth, plotHeight, yMax) {
  ctx.strokeStyle = "#e6dfd4";
  ctx.fillStyle = "#6c6f75";
  ctx.lineWidth = 1;
  ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let i = 0; i <= 4; i += 1) {
    const value = (yMax / 4) * i;
    const y = padding.top + plotHeight - (plotHeight * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + plotWidth, y);
    ctx.stroke();
    ctx.fillText(`${Math.round(value / 10000)}万`, padding.left - 8, y);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  data.forEach((item, index) => {
    const x = padding.left + (plotWidth * index) / Math.max(data.length - 1, 1);
    ctx.fillText(item.label, x, padding.top + plotHeight + 14);
  });
}

function drawLine(ctx, data, key, color, padding, plotWidth, plotHeight, yMax) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  data.forEach((item, index) => {
    const x = padding.left + (plotWidth * index) / Math.max(data.length - 1, 1);
    const y = padding.top + plotHeight - (plotHeight * item[key]) / yMax;
    if (index === 0) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      return;
    }
    ctx.lineTo(x, y);
  });
  ctx.stroke();

  data.forEach((item, index) => {
    const x = padding.left + (plotWidth * index) / Math.max(data.length - 1, 1);
    const y = padding.top + plotHeight - (plotHeight * item[key]) / yMax;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderTrendSummary(data) {
  const latest = data[data.length - 1];
  const previous = data[data.length - 2] || latest;
  trendSummary.innerHTML = `
    <article>
      <span>今月の全体 / 前月比</span>
      <strong>${yen(latest.total)}（${yen(latest.total - previous.total)}）</strong>
    </article>
    <article>
      <span>今月の外食費 / 前月比</span>
      <strong>${yen(latest.dining)}（${yen(latest.dining - previous.dining)}）</strong>
    </article>
  `;
  trendTable.innerHTML = data
    .map(
      (item) => `
        <article class="trend-month">
          <strong>${item.label}</strong>
          <span>全体 ${yen(item.total)}</span>
          <span>外食 ${yen(item.dining)}</span>
        </article>
      `,
    )
    .join("");
}

window.addEventListener("resize", renderTrendChart);

function updateViewFromHash({ scroll = true } = {}) {
  const view = (window.location.hash || "#dashboard").replace("#", "");
  const views = ["dashboard", "receipt", "budget", "trend", "analysis"];
  const viewLabels = {
    dashboard: "今月",
    receipt: "入力",
    budget: "予算",
    trend: "グラフ",
    analysis: "分析",
  };
  const activeView = views.includes(view) ? view : "dashboard";

  views.forEach((item) => {
    document.body.classList.toggle(`view-${item}`, activeView === item);
  });
  document.body.classList.toggle("view-budget", activeView === "budget");
  document.body.classList.toggle("view-trend", activeView === "trend");

  document.querySelectorAll(".nav-list a").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${activeView}`);
  });

  if (viewTitle) viewTitle.textContent = viewLabels[activeView];
  if (activeView === "trend") renderTrendChart();
  if (scroll) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0 });
    });
  }
  if (!views.includes(view)) {
    history.replaceState(null, "", "#dashboard");
    updateViewFromHash({ scroll });
  }
}

if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

onAuthStateChanged(auth, (user) => {
  authUser = user;
  updateAuthView();

  if (!user) {
    if (cloudUnsubscribe) cloudUnsubscribe();
    cloudUnsubscribe = null;
    setSyncStatus("ログインが必要です");
    setAuthMessage(
      isFilePage
        ? "この開き方ではログインできません。http://127.0.0.1:4180/ またはGitHub Pages版で開いてください。"
        : "Firebaseに登録済みの家族アカウントでログインしてください。",
    );
    return;
  }

  setAuthMessage("");
  expenses = loadExpenses();
  budgets = loadBudgets();
  noSpendStamps = loadNoSpendStamps();
  render();
  subscribeCloudData();
});

render();
