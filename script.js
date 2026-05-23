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
  { date: "2026-05-02", memo: "スーパー食材", amount: 8420, category: "食費", payer: "妻" },
  { date: "2026-05-04", memo: "家族で外食", amount: 6800, category: "外食費", payer: "夫" },
  { date: "2026-05-06", memo: "ドラッグストア", amount: 3920, category: "日用品", payer: "妻" },
  { date: "2026-05-08", memo: "電気代", amount: 11200, category: "光熱費", payer: "夫" },
  { date: "2026-05-10", memo: "映画と軽食", amount: 5200, category: "娯楽費", payer: "夫" },
  { date: "2026-05-12", memo: "平日ランチ", amount: 1400, category: "外食費", payer: "妻" },
  { date: "2026-05-15", memo: "スマホ料金", amount: 9600, category: "通信費", payer: "夫" },
  { date: "2026-05-20", memo: "お祝いギフト", amount: 12000, category: "臨時出費", payer: "妻" },
];

const modeConfig = {
  couple: {
    label: "夫婦用",
    storageKey: "couple-budget-expenses",
    defaultPayer: "夫",
    hero: "生活費全体を2人で見ながら、外食の使いすぎも逃さない。",
    emptyAdvice: "夫婦どちらが払ったかと金額を残すことを優先しましょう。",
  },
  personal: {
    label: "個人用",
    storageKey: "personal-budget-expenses",
    defaultPayer: "自分",
    hero: "自分の生活費を見ながら、無理なく節約ポイントを見つける。",
    emptyAdvice: "まずはよく使う支出だけを残すと、節約ポイントが見つけやすくなります。",
  },
};

let currentMode = localStorage.getItem("budget-app-mode") || "couple";
let selectedPayer = "夫";
let expenses = loadExpenses();
let budgets = loadBudgets();

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
const receiptInput = document.querySelector("#receiptImage");
const receiptPreview = document.querySelector("#receiptPreview");
const scanStatus = document.querySelector("#scanStatus");
const seedButton = document.querySelector("#seedButton");
const openReceiptButton = document.querySelector("#openReceiptButton");
const modeLabel = document.querySelector("#modeLabel");
const heroTitle = document.querySelector("#heroTitle");
const monthLabel = document.querySelector("#monthLabel");
const monthSelect = document.querySelector("#monthSelect");
const budgetInputs = document.querySelectorAll("[data-budget-key]");
const trendChart = document.querySelector("#trendChart");
const trendSummary = document.querySelector("#trendSummary");
const trendTable = document.querySelector("#trendTable");
const categoryPieChart = document.querySelector("#categoryPieChart");
const categoryPieLegend = document.querySelector("#categoryPieLegend");
let selectedMonthOffset = Number(localStorage.getItem("budget-app-month-offset") || 0);

dateInput.valueAsDate = new Date();

document.querySelectorAll("[data-payer]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedPayer = button.dataset.payer;
    document.querySelectorAll("[data-payer]").forEach((item) => {
      item.classList.toggle("selected", item === button);
    });
  });
});

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => switchMode(button.dataset.mode));
});

window.addEventListener("hashchange", updateViewFromHash);

monthSelect.addEventListener("change", () => {
  selectedMonthOffset = Number(monthSelect.value);
  localStorage.setItem("budget-app-month-offset", String(selectedMonthOffset));
  renderMetrics();
  renderCategories();
  renderExpenses();
  renderAdvice();
  renderMode();
});

budgetInputs.forEach((input) => {
  input.addEventListener("input", () => {
    budgets[input.dataset.budgetKey] = parseMoney(input.value);
    saveBudgets();
    renderMetrics();
    renderCategories();
    renderAdvice();
    renderTrendChart();
    document.querySelector("#monthlyGoal").textContent = yen(budgets.total);
  });

  input.addEventListener("blur", () => {
    input.value = comma(budgets[input.dataset.budgetKey] || 0);
  });
});

openReceiptButton.addEventListener("click", () => {
  window.location.hash = "#receipt";
});

receiptInput.addEventListener("change", async () => {
  const file = receiptInput.files?.[0];
  if (!file) return;

  receiptPreview.src = URL.createObjectURL(file);
  receiptPreview.style.display = "block";
  setScanStatus("warning", "無料OCRを確認中", "この端末のブラウザで使える読み取り機能だけを使います。");
  applyReceiptDraft(await readReceiptDraft(file));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const expense = {
    date: dateInput.value,
    memo: memoInput.value.trim(),
    amount: Number(amountInput.value),
    category: categoryInput.value,
    payer: currentMode === "couple" ? selectedPayer : "自分",
  };

  expenses = [expense, ...expenses];
  saveExpenses();
  form.reset();
  dateInput.valueAsDate = new Date();
  receiptPreview.removeAttribute("src");
  receiptPreview.style.display = "none";
  render();
});

seedButton.addEventListener("click", () => {
  expenses = [...sampleExpenses, ...expenses];
  saveExpenses();
  render();
});

function loadExpenses() {
  const saved = localStorage.getItem(modeConfig[currentMode].storageKey);
  if (!saved) return [];

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveExpenses() {
  localStorage.setItem(modeConfig[currentMode].storageKey, JSON.stringify(expenses));
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
  const localText = await readTextOnDevice(file);
  const sourceText = [localText, fileHint].filter(Boolean).join(" ");
  const amount = extractAmount(sourceText);
  const category = guessCategory(sourceText);

  return {
    amount,
    category,
    memo: guessMemo(sourceText) || "レシート内容",
    confidence: amount && localText ? "ready" : "warning",
    usedOcr: Boolean(localText),
  };
}

async function readTextOnDevice(file) {
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

function extractAmount(text) {
  const normalized = String(text || "").replace(/[,，]/g, "");
  const match = normalized.match(/(?:yen|円|¥)?\s*(\d{2,7})(?:yen|円)?/i);
  return match ? Number(match[1]) : null;
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

  if (draft.usedOcr && draft.amount) {
    setScanStatus("ready", "端末内OCRで候補を入力しました", "写真は外部送信していません。内容を確認して登録できます。");
    return;
  }

  setScanStatus("warning", "無料モードで候補を入力しました", "このブラウザでは端末内OCRが使えないため、金額を手入力してください。カテゴリは店名やメモから推測します。");
}

function guessMemo(text) {
  const cleaned = cleanupMemo(text);
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
    const payerTotals = ["夫", "妻"].map((payer) => ({
      payer,
      total: sumBy((expense) => expense.payer === payer),
    }));
    const difference = Math.abs(payerTotals[0].total - payerTotals[1].total);
    if (difference >= 10000) {
      messages.push({
        level: "normal",
        title: "支払い負担に差があります",
        body: `${payerTotals[0].payer}は${yen(payerTotals[0].total)}、${payerTotals[1].payer}は${yen(payerTotals[1].total)}です。月末精算の目安にできます。`,
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
            <p class="expense-meta">${expense.date}・${expense.category}${currentMode === "couple" ? `・${expense.payer}` : ""}</p>
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
  renderExpenses();
  renderAdvice();
  updateViewFromHash();
}

function switchMode(mode) {
  if (!modeConfig[mode] || mode === currentMode) return;

  currentMode = mode;
  localStorage.setItem("budget-app-mode", currentMode);
  selectedPayer = modeConfig[currentMode].defaultPayer;
  expenses = loadExpenses();
  budgets = loadBudgets();
  form.reset();
  dateInput.valueAsDate = new Date();
  receiptPreview.removeAttribute("src");
  receiptPreview.style.display = "none";
  render();
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

if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

function updateViewFromHash() {
  const view = (window.location.hash || "#dashboard").replace("#", "");
  const views = ["dashboard", "receipt", "budget", "trend", "analysis"];
  const activeView = views.includes(view) ? view : "dashboard";

  views.forEach((item) => {
    document.body.classList.toggle(`view-${item}`, activeView === item);
  });
  document.body.classList.toggle("view-budget", activeView === "budget");
  document.body.classList.toggle("view-trend", activeView === "trend");

  document.querySelectorAll(".nav-list a").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${activeView}`);
  });

  if (activeView === "trend") renderTrendChart();
  requestAnimationFrame(() => {
    document.querySelector(`#${activeView}`)?.scrollIntoView({ block: "start" });
  });
  if (!views.includes(view)) {
    window.location.hash = "#dashboard";
  }
}

render();
