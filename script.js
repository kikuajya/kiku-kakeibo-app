import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
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
const tesseractScriptUrl = "https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js";
const receiptOcrLanguage = "eng";

const defaultBudgets = {
  total: 320000,
  rent: 80000,
  utilities: 25000,
  food: 80000,
  dining: 30000,
  entertainment: 20000,
  special: 20000,
  other: 30000,
};

const categories = [
  "食費",
  "外食費",
  "日用品",
  "娯楽費",
  "光熱費",
  "通信費",
  "交通費",
  "医療費",
  "家賃",
  "臨時出費",
  "その他",
];

const colorByCategory = {
  食費: "#27745c",
  外食費: "#b9473c",
  日用品: "#2d5f8f",
  娯楽費: "#b88428",
  光熱費: "#7164a3",
  通信費: "#4a7c8a",
  交通費: "#6f7d3c",
  医療費: "#a75374",
  家賃: "#4b5967",
  臨時出費: "#8f5d2a",
  その他: "#6c6f75",
};

const categoryKeywords = {
  外食費: ["外食", "レストラン", "居酒屋", "カフェ", "喫茶", "ランチ", "ディナー", "マクドナルド", "マック", "ガスト", "サイゼ", "すき家", "吉野家", "丸亀", "ラーメン", "restaurant", "cafe", "lunch", "dinner"],
  食費: ["スーパー", "食材", "食品", "青果", "精肉", "鮮魚", "惣菜", "米", "パン", "牛乳", "イオン", "西友", "ライフ", "マルエツ", "オーケー", "成城石井", "costco", "super"],
  日用品: ["日用品", "洗剤", "ティッシュ", "トイレット", "シャンプー", "ドラッグ", "薬局", "マツキヨ", "ウエルシア", "サンドラッグ", "drug", "daily"],
  娯楽費: ["映画", "カラオケ", "ゲーム", "本", "漫画", "ライブ", "チケット", "netflix", "spotify", "movie", "game"],
  光熱費: ["電気", "ガス", "水道", "光熱", "東京電力", "東京ガス", "electric", "gas", "water"],
  通信費: ["スマホ", "携帯", "通信", "wifi", "wi-fi", "インターネット", "docomo", "au", "softbank", "rakuten"],
  交通費: ["交通", "電車", "バス", "タクシー", "ガソリン", "駐車", "jr", "suica", "pasmo", "taxi"],
  医療費: ["病院", "クリニック", "薬", "歯科", "眼科", "皮膚科", "medical", "clinic"],
  家賃: ["家賃", "賃料", "管理費", "rent"],
  臨時出費: ["臨時", "お歳暮", "お中元", "祝い", "香典", "プレゼント", "帰省", "旅行", "修理", "特別", "gift", "special"],
};

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

let currentMode = localStorage.getItem("budget-app-mode") || "couple";
let selectedAdvancePayer = "";
let expenses = loadExpenses();
let budgets = loadBudgets();
let selectedStamp = localStorage.getItem("budget-app-selected-stamp") || "🐱";
let noSpendStamps = loadNoSpendStamps();
let pendingStampDate = "";
let authUser = null;
let cloudUnsubscribe = null;
let cloudSaveTimer = 0;
let applyingCloudData = false;

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

dateInput.valueAsDate = new Date();

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
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

closeStampPicker?.addEventListener("click", closeStampSheet);
clearStampButton?.addEventListener("click", clearNoSpendStamp);

ocrAmountList?.addEventListener("click", (event) => {
  const amountButton = event.target.closest("[data-ocr-amount]");
  if (!amountButton) return;

  amountInput.value = amountButton.dataset.ocrAmount;
  document.querySelectorAll("[data-ocr-amount]").forEach((button) => {
    button.classList.toggle("selected", button === amountButton);
  });
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
    budgets[input.dataset.budgetKey] = parseMoney(input.value);
    saveBudgets();
    renderMetrics();
    renderCategories();
    renderCalendar();
    renderAdvice();
    renderTrendChart();
    document.querySelector("#monthlyGoal").textContent = yen(budgets.total);
  });

  input.addEventListener("blur", () => {
    input.value = comma(budgets[input.dataset.budgetKey] || 0);
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
  setScanStatus("warning", "写真を読み取り中", "初回は無料OCRの準備に少し時間がかかります。画面を閉じずにお待ちください。");
  applyReceiptDraft(await readReceiptDraft(file));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const submittedDate = dateInput.value;

  const expense = {
    id: editingExpenseId || createExpenseId(),
    date: dateInput.value,
    memo: memoInput.value.trim(),
    amount: Number(amountInput.value),
    category: categoryInput.value,
    payer: currentMode === "couple" ? "共有" : "自分",
    advancePayer: currentMode === "couple" ? selectedAdvancePayer : "",
  };

  if (editingExpenseId) {
    expenses = expenses.map((item) => (item.id === editingExpenseId ? expense : item));
  } else {
    expenses = [expense, ...expenses];
  }
  delete noSpendStamps[expense.date];
  saveExpenses();
  saveNoSpendStamps();
  form.reset();
  dateInput.value = submittedDate;
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

function saveNoSpendStamps() {
  localStorage.setItem(`${modeConfig[currentMode].storageKey}-no-spend-stamps`, JSON.stringify(noSpendStamps));
  queueCloudSave();
}

function loadBudgets() {
  const saved = localStorage.getItem(`${modeConfig[currentMode].storageKey}-budgets`);
  if (!saved) return { ...defaultBudgets };

  try {
    return { ...defaultBudgets, ...JSON.parse(saved) };
  } catch {
    return { ...defaultBudgets };
  }
}

function saveBudgets() {
  localStorage.setItem(`${modeConfig[currentMode].storageKey}-budgets`, JSON.stringify(budgets));
  queueCloudSave();
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

  try {
    setSyncStatus("同期中...");
    await setDoc(
      ref,
      {
        expenses,
        budgets,
        noSpendStamps,
        updatedAt: serverTimestamp(),
      },
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
      budgets = { ...defaultBudgets, ...(data.budgets || {}) };
      noSpendStamps = data.noSpendStamps && typeof data.noSpendStamps === "object" ? data.noSpendStamps : {};
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
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => source.includes(normalizeText(keyword)))) return category;
  }
  return "食費";
}

function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, "");
}

async function readReceiptDraft(file) {
  const fileHint = file.name.replace(/\.[^.]+$/, "");
  const ocrResult = await readTextOnDevice(file);
  const localText = ocrResult.text;
  const sourceText = [localText, fileHint].filter(Boolean).join("\n");
  const amountCandidates = extractAmountCandidates(sourceText);
  const amount = amountCandidates[0]?.amount || null;
  const category = guessCategory(sourceText);

  return {
    amount,
    amountCandidates,
    category,
    memo: guessMemo(sourceText, fileHint) || "レシート内容",
    confidence: amount && localText ? "ready" : "warning",
    usedOcr: Boolean(localText),
    ocrEngine: ocrResult.engine,
    rawText: localText,
  };
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
  let worker = null;
  try {
    setScanStatus("warning", "無料OCRを準備中", "写真は外部AIに送らず、ブラウザ内で文字を読み取ります。");
    const { createWorker } = await loadTesseract();
    worker = await createWorker(receiptOcrLanguage, 1, {
      logger: (message) => updateOcrProgress(message),
    });

    await worker.setParameters({
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
      } = await worker.recognize(image.src);
      results.push(`${image.label}\n${text}`);
      if (extractAmountCandidates(results.join("\n")).length >= 3) break;
    }
    return results.join("\n").trim();
  } catch (error) {
    console.error(error);
    return "";
  } finally {
    if (worker) await worker.terminate();
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

function extractNumbers(line) {
  const normalized = String(line || "")
    .replace(/[，,]/g, "")
    .replace(/[Oo]/g, "0")
    .replace(/[Il|]/g, "1")
    .replace(/[Ss]/g, "5");
  const matches = normalized.match(/(?:¥|円)?\s*\d{2,7}\s*(?:円|yen)?/gi) || [];
  return matches.map((match) => Number(match.replace(/[^\d]/g, ""))).filter(Boolean);
}

function amountLineScore(line, index, lineCount) {
  const source = normalizeText(line);
  let score = 0;
  if (/合計|総合計|税込|お買上|お会計|現計|請求|金額|total|amount|yen|ttl/.test(source)) score += 100;
  if (/小計|税|消費税|内税|tax/.test(source)) score += 20;
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

function applyReceiptDraft(draft) {
  memoInput.value = draft.memo;
  categoryInput.value = draft.category;
  if (draft.amount) amountInput.value = draft.amount;
  renderOcrReview(draft);

  if (draft.usedOcr && draft.amount) {
    const engineLabel = draft.ocrEngine === "tesseract" ? "無料OCR" : "端末内OCR";
    setScanStatus("ready", `${engineLabel}で金額候補を出しました`, "下の候補から正しい金額を選び、内容を確認してから登録してください。");
    return;
  }

  if (draft.usedOcr) {
    setScanStatus("warning", "文字は読めましたが金額候補が弱いです", "読み取った文字を開いて確認できます。金額は手入力してください。");
    return;
  }

  setScanStatus("warning", "写真を読み取れませんでした", "無料OCRではこの写真の文字を拾えませんでした。明るい場所で、レシートを画面いっぱいにまっすぐ撮ると改善します。");
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
  return categories.map((category) => ({
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
  const food = sumBy((expense) => expense.category === "食費" || expense.category === "外食費");
  const dining = sumBy((expense) => expense.category === "外食費");
  const remaining = budgets.total - total;

  document.querySelector("#totalSpend").textContent = yen(total);
  document.querySelector("#foodSpend").textContent = yen(food);
  document.querySelector("#diningSpend").textContent = yen(dining);
  document.querySelector("#remainingBudget").textContent = yen(remaining);
  document.querySelector("#foodShare").textContent = `生活費の${percent(food, total)}%`;
  document.querySelector("#diningShare").textContent = `食費の${percent(dining, food)}%`;
  document.querySelector("#totalTrend").textContent = total ? `予算の${percent(total, budgets.total)}%を使用` : "データを入力してください";
  document.querySelector("#budgetStatus").textContent = remaining >= 0 ? "予算内" : "予算超過";
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
  const visibleExpenses = [...monthlyExpenses(), ...(budgets.rent ? [fixedRentExpense()] : [])];

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

  pendingStampDate = dateKey;
  const date = new Date(`${dateKey}T00:00:00`);
  stampTargetLabel.textContent = `${date.getMonth() + 1}月${date.getDate()}日`;
  stampPicker.hidden = false;
  document.body.classList.add("stamp-sheet-open");
  syncStampButtons();
}

function applyNoSpendStamp(stamp) {
  if (!pendingStampDate) return;

  noSpendStamps[pendingStampDate] = stamp;
  saveNoSpendStamps();
  closeStampSheet();
  renderCalendar();
}

function clearNoSpendStamp() {
  if (!pendingStampDate) return;

  delete noSpendStamps[pendingStampDate];
  saveNoSpendStamps();
  closeStampSheet();
  renderCalendar();
}

function closeStampSheet() {
  pendingStampDate = "";
  stampPicker.hidden = true;
  document.body.classList.remove("stamp-sheet-open");
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
  categoryInput.value = expense.category;
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
  const fixed = budgets.rent && dateKey === formatDateLocal(currentMonthRange(selectedMonthOffset).start) ? [fixedRentExpense()] : [];
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
  const fixedExpenses = budgets.rent ? [fixedRentExpense()] : [];
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
  renderMode();
  renderMetrics();
  renderTrendChart();
  renderCategories();
  renderCalendar();
  renderExpenses();
  renderSelectedDay();
  renderAdvice();
  updateViewFromHash();
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
  document.querySelector("#monthlyGoal").textContent = yen(budgets.total);

  budgetInputs.forEach((input) => {
    input.value = comma(budgets[input.dataset.budgetKey] || 0);
  });

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
  if (category === "家賃") return budgets.rent;
  if (category === "光熱費") return budgets.utilities;
  if (category === "食費") return budgets.food;
  if (category === "外食費") return budgets.dining;
  if (category === "娯楽費") return budgets.entertainment;
  if (category === "臨時出費") return budgets.special;
  if (category === "その他") return budgets.other;
  return 0;
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

function fixedRentExpense() {
  return {
    date: formatDateLocal(currentMonthRange(selectedMonthOffset).start),
    memo: "家賃（固定）",
    amount: budgets.rent || 0,
    category: "家賃",
    payer: currentMode === "couple" ? "共通" : "自分",
  };
}

function advancePayerFor(expense) {
  if (expense.advancePayer) return expense.advancePayer;
  if (expense.payer === "夫") return "旦那";
  if (expense.payer === "妻") return "妻";
  return "";
}

function paymentLabel(expense) {
  const advancePayer = advancePayerFor(expense);
  return advancePayer ? `${advancePayer}立替` : "共有クレカ";
}

function categoryTotal(category) {
  const entered = sumBy((expense) => expense.category === category);
  return category === "家賃" ? entered + (budgets.rent || 0) : entered;
}

function currentTotalSpend() {
  return sumBy(() => true) + (budgets.rent || 0);
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
      total: enteredTotal + (budgets.rent || 0),
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

function updateViewFromHash() {
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
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0 });
  });
  if (!views.includes(view)) {
    history.replaceState(null, "", "#dashboard");
    updateViewFromHash();
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
    setAuthMessage("Firebaseに登録済みの家族アカウントでログインしてください。");
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
