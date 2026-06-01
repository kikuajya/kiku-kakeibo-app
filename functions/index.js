const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const vision = require("@google-cloud/vision");

admin.initializeApp();
setGlobalOptions({ region: "asia-northeast1", maxInstances: 2 });

const db = admin.firestore();
const visionClient = new vision.ImageAnnotatorClient();
const OCR_MONTHLY_LIMIT = 900;
const MAX_IMAGE_BASE64_LENGTH = 5_000_000;
const ALLOWED_UIDS = new Set([
  "scG6gjxpbzeN9uUPORQmuaei4rd2",
]);
const ALLOWED_EMAILS = new Set([
  "ajyasutacc@gmail.com",
  "minayon@gmail.com",
]);
const ALLOWED_ORIGINS = new Set([
  "http://127.0.0.1:4180",
  "http://localhost:4180",
  "https://kikuajya.github.io",
  "https://kiku-kakeibo.web.app",
  "https://kiku-kakeibo.firebaseapp.com",
]);

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
  外食費: ["外食", "レストラン", "居酒屋", "カフェ", "喫茶", "ランチ", "ディナー", "ラーメン", "寿司", "焼肉", "lunch", "dinner", ...diningStoreKeywords],
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

const storeCategoryRules = [
  { category: "外食費", keywords: diningStoreKeywords },
  { category: "食費", keywords: ["イオン", "西友", "ライフ", "マルエツ", "オーケー", "okストア", "okstore", "成城石井", "コープ", "生協", "業務スーパー", "まいばすけっと", "ヨーク", "イトーヨーカドー", "サミット", "ベルク", "ヤオコー", "ロピア", "スーパー", "青果", "精肉", "鮮魚", "惣菜"] },
  { category: "日用品", keywords: ["マツモトキヨシ", "マツキヨ", "ウエルシア", "サンドラッグ", "ココカラファイン", "スギ薬局", "ツルハ", "ドラッグ", "薬局", "ダイソー", "セリア", "キャンドゥ", "無印良品", "ニトリ"] },
  { category: "娯楽費", keywords: ["映画", "シネマ", "カラオケ", "ゲーム", "ブックオフ", "書店", "チケット"] },
  { category: "交通費", keywords: ["jr", "suica", "pasmo", "タクシー", "駐車", "ガソリン", "eneos", "出光", "apollostation"] },
];

exports.analyzeReceipt = onCall(
  {
    timeoutSeconds: 60,
    memory: "256MiB",
    invoker: "public",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログイン後にOCRを使えます。");
    }
    if (!isAllowedUser(request.auth)) {
      throw new HttpsError("permission-denied", "このアカウントではOCRを使えません。");
    }

    const imageBase64 = request.data?.imageBase64;
    if (typeof imageBase64 !== "string" || !imageBase64) {
      throw new HttpsError("invalid-argument", "画像データがありません。");
    }
    if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
      throw new HttpsError("invalid-argument", "画像が大きすぎます。撮影し直してください。");
    }
    if (!/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
      throw new HttpsError("invalid-argument", "画像データの形式が正しくありません。");
    }

    const usage = await reserveOcrUsage();
    const [result] = await visionClient.documentTextDetection({
      image: { content: imageBase64 },
    });
    const text = result.fullTextAnnotation?.text || result.textAnnotations?.[0]?.description || "";
    const amountCandidates = extractAmountCandidates(text);
    const storeName = guessStoreName(text);
    const category = guessCategory([storeName, text].filter(Boolean).join("\n"));

    return {
      text,
      amountCandidates,
      date: extractReceiptDate(text),
      storeName: storeName || guessMemo(text) || "レシート内容",
      category,
      usage,
    };
  },
);

exports.analyzeReceiptHttp = onRequest(
  {
    timeoutSeconds: 60,
    memory: "256MiB",
    invoker: "public",
  },
  async (request, response) => {
    applyCors(request, response);
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }
    if (request.method !== "POST") {
      sendHttpError(response, 405, "method-not-allowed", "POSTで送信してください。");
      return;
    }

    try {
      const token = getBearerToken(request);
      if (!token) {
        throw new HttpFunctionError(401, "unauthenticated", "ログイン後にOCRを使えます。");
      }
      const decodedToken = await admin.auth().verifyIdToken(token);
      if (!isAllowedUser(decodedToken)) {
        throw new HttpFunctionError(403, "permission-denied", "このアカウントではOCRを使えません。");
      }

      const result = await analyzeReceiptImage(request.body?.imageBase64);
      response.status(200).json(result);
    } catch (error) {
      const knownError = normalizeHttpError(error);
      console.error("analyzeReceiptHttp failed", {
        code: knownError.code,
        message: knownError.message,
      });
      sendHttpError(response, knownError.status, knownError.code, knownError.message);
    }
  },
);

async function analyzeReceiptImage(imageBase64) {
  validateImageBase64(imageBase64);

  const usage = await reserveOcrUsage();
  const [result] = await visionClient.documentTextDetection({
    image: { content: imageBase64 },
  });
  const text = result.fullTextAnnotation?.text || result.textAnnotations?.[0]?.description || "";
  const amountCandidates = extractAmountCandidates(text);
  const storeName = guessStoreName(text);
  const category = guessCategory([storeName, text].filter(Boolean).join("\n"));

  return {
    text,
    amountCandidates,
    date: extractReceiptDate(text),
    storeName: storeName || guessMemo(text) || "レシート内容",
    category,
    usage,
  };
}

function validateImageBase64(imageBase64) {
  if (typeof imageBase64 !== "string" || !imageBase64) {
    throw new HttpsError("invalid-argument", "画像データがありません。");
  }
  if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    throw new HttpsError("invalid-argument", "画像が大きすぎます。撮影し直してください。");
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
    throw new HttpsError("invalid-argument", "画像データの形式が正しくありません。");
  }
}

function applyCors(request, response) {
  const origin = request.get("origin");
  if (ALLOWED_ORIGINS.has(origin)) {
    response.set("Access-Control-Allow-Origin", origin);
    response.set("Vary", "Origin");
  }
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.set("Access-Control-Max-Age", "3600");
}

function getBearerToken(request) {
  const authorization = request.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function isAllowedUser(authData) {
  const uid = authData?.uid;
  const email = String(authData?.token?.email || authData?.email || "").toLowerCase();
  return Boolean((uid && ALLOWED_UIDS.has(uid)) || (email && ALLOWED_EMAILS.has(email)));
}

class HttpFunctionError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function normalizeHttpError(error) {
  if (error instanceof HttpFunctionError) return error;
  if (error instanceof HttpsError || error?.code) {
    const code = normalizeHttpsCode(error.code);
    return new HttpFunctionError(statusFromCode(code), code, error.message || "OCRに失敗しました。");
  }
  return new HttpFunctionError(500, "internal", "OCR処理中にエラーが発生しました。");
}

function normalizeHttpsCode(code) {
  return String(code || "internal").replace(/^functions\//, "");
}

function statusFromCode(code) {
  if (code === "unauthenticated") return 401;
  if (code === "permission-denied") return 403;
  if (code === "invalid-argument") return 400;
  if (code === "resource-exhausted") return 429;
  return 500;
}

function sendHttpError(response, status, code, message) {
  response.status(status).json({ code, message });
}

async function reserveOcrUsage() {
  const monthKey = tokyoMonthKey();
  const usageRef = db.collection("system").doc(`ocr-${monthKey}`);
  let nextCount = 0;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(usageRef);
    const currentCount = snapshot.exists ? Number(snapshot.data().count || 0) : 0;
    if (currentCount >= OCR_MONTHLY_LIMIT) {
      throw new HttpsError("resource-exhausted", "OCR_MONTHLY_LIMIT_REACHED");
    }
    nextCount = currentCount + 1;
    transaction.set(
      usageRef,
      {
        count: nextCount,
        limit: OCR_MONTHLY_LIMIT,
        monthKey,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  return { count: nextCount, limit: OCR_MONTHLY_LIMIT, monthKey };
}

function tokyoMonthKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
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
  return candidates
    .filter((candidate) => {
      if (seen.has(candidate.amount)) return false;
      seen.add(candidate.amount);
      return true;
    })
    .slice(0, 8)
    .map(({ amount, line }) => ({ amount, line }));
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
  if (/お預|預り|釣|お釣|釣銭|ポイント|会員|電話|tel|no\.|番号/.test(source)) score -= 80;
  if (/\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}:\d{2}/.test(line)) score -= 60;
  score += Math.round((index / Math.max(lineCount - 1, 1)) * 10);
  return score;
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

function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function guessCategory(text) {
  const source = normalizeText(text);
  for (const rule of storeCategoryRules) {
    if (rule.keywords.some((keyword) => source.includes(normalizeText(keyword)))) return rule.category;
  }

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => source.includes(normalizeText(keyword)))) return category;
  }
  return "食費";
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
    if (/合計|小計|税込|税|対象|領収|レシート|電話|tel|登録|担当|現計|釣|預|ポイント|円|¥|total|tax/i.test(line)) return false;
    if (/^\d+$/.test(line)) return false;
    if (/\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}|\d{1,2}:\d{2}/.test(line)) return false;
    return /[ぁ-んァ-ン一-龥a-zA-Z]/.test(line);
  });
  if (candidate) return candidate;

  return cleanupStoreLine(fallback);
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

function cleanupStoreLine(line) {
  return String(line || "")
    .replace(/[|｜]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s:：・*.\-]+|[\s:：・*.\-]+$/g, "")
    .trim();
}

function cleanupMemo(text) {
  return String(text || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]?\d{2,7}(円|yen)?/gi, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, "");
}
