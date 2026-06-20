export const SUPABASE_URL = "https://bglhtmxxtnmbxndjindo.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbGh0bXh4dG5tYnhuZGppbmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzM1MjMsImV4cCI6MjA5NTAwOTUyM30.-GgMJInhWBK2v9P4UBvBcPYFvHjlx9ZQ4XSMH-0I7n8";

export const C = {
  bg: "#0f0e17", card: "#1a1929", cardBorder: "rgba(255,255,255,0.08)",
  text: "#fffffe", sub: "rgba(255,255,255,0.6)", faint: "rgba(255,255,255,0.3)",
  teal: "#4ECDC4", yellow: "#FFE66D", purple: "#C3A6FF", red: "#FF6B6B",
  green: "#A8E6CF", blue: "#0ea5e9",
};

export const INDUSTRIES = [
  "出版・編集","マスコミ・メディア","広告","エンタメ",
  "コンサル・シンクタンク","IT・通信","金融","商社",
  "デベロッパー・不動産","ゼネコン・建設","人材・サービス",
  "小売・流通","インフラ・エネルギー","メーカー","官公庁・公社","その他",
];

export const NAV = [
  { id: "dashboard", label: "ホーム", icon: "🧭" },
  { id: "tasks", label: "タスク", icon: "📋" },
  { id: "log", label: "ログ", icon: "🔥" },
  { id: "deadlines", label: "締切", icon: "🗓️" },
  { id: "companies", label: "企業", icon: "🏢" },
  { id: "ob", label: "OB訪問", icon: "🤝" },
  { id: "vault", label: "保管庫", icon: "📚" },
  { id: "rewards", label: "ご褒美", icon: "🎁" },
  { id: "ideas", label: "保留箱", icon: "💭" },
  { id: "interview", label: "面接Lab", icon: "🎙️" },
  { id: "study", label: "Study", icon: "🎯" },
  { id: "links", label: "リンク集", icon: "🔗" },
];

export const STAGES = ["気になる","プレエントリー済","インターン応募済","インターン選考中","インターン参加済","ES提出済","一次選考","二次選考以降","最終選考","結果待ち","通過","不合格"];
export const TIER_COLORS = { S: "#FFE66D", A: "#C3A6FF", B: "#4ECDC4", C: "#A8E6CF" };

export const TIERS = [
  { id: "S", label: "S 本命", color: "#FF6B6B" },
  { id: "A", label: "A 志望", color: "#FFE66D" },
  { id: "B", label: "B 検討", color: "#4ECDC4" },
  { id: "C", label: "C 様子見", color: "#888" },
];
export const TIER_COLOR = (t) => (TIERS.find((x) => x.id === t) || TIERS[2]).color;
export const POINT_PRESETS = [
  { label: "SPI 10問", points: 1, category: "SPI対策" },
  { label: "ケース1問", points: 2, category: "ケース・フェルミ" },
  { label: "ES骨子完成", points: 2, category: "ES作成" },
  { label: "ES完成提出", points: 3, category: "ES作成" },
  { label: "面接練習 1回", points: 1, category: "面接準備" },
  { label: "GD練習", points: 2, category: "GD練習" },
  { label: "企業研究 30分", points: 1, category: "企業研究" },
];

export const CATEGORIES = [
  { id: "SPI対策", icon: "🧮", color: "#4ECDC4" },
  { id: "ケース・フェルミ", icon: "🧩", color: "#C3A6FF" },
  { id: "ES作成", icon: "📝", color: "#FFE66D" },
  { id: "企業研究", icon: "🔍", color: "#4ECDC4" },
  { id: "面接準備", icon: "🎤", color: "#FF6B6B" },
  { id: "GD練習", icon: "💬", color: "#A8E6CF" },
  { id: "業界研究", icon: "📊", color: "#0ea5e9" },
  { id: "その他", icon: "⭐", color: "#888" },
];
export const PRIORITY_COLORS = { 高: "#FF6B6B", 中: "#FFE66D", 低: "#888" };

export const PRESET_LINKS = [
  { category: "OB・OG訪問", emoji: "🎓", title: "ビズリーチ・キャンパス", url: "https://br-campus.jp/" },
  { category: "求人・情報収集", emoji: "⭐", title: "ワンキャリア", url: "https://one-career.jp/" },
  { category: "求人・情報収集", emoji: "📋", title: "マイナビ", url: "https://job.mynavi.jp/" },
  { category: "求人・情報収集", emoji: "💼", title: "リクナビ", url: "https://job.rikunabi.com/" },
  { category: "求人・情報収集", emoji: "🔍", title: "外資就活", url: "https://gaishishukatsu.com/" },
  { category: "求人・情報収集", emoji: "📰", title: "Wantedly", url: "https://www.wantedly.com/" },
  { category: "選考対策", emoji: "🧮", title: "SPI対策（玉手箱）", url: "https://spi.js88.com/" },
  { category: "選考対策", emoji: "📝", title: "就活の教科書", url: "https://reashu.com/" },
  { category: "業界研究", emoji: "📊", title: "業界地図（東洋経済）", url: "https://toyokeizai.net/articles/-/362992" },
  { category: "ES・面接", emoji: "✍️", title: "Unistyle", url: "https://unistyleinc.com/" },
];
export const LINK_CATS = ["OB・OG訪問", "求人・情報収集", "選考対策", "業界研究", "ES・面接", "その他"];
export const STUDY_CATEGORIES = ["SPI非言語","SPI言語","TG-WEB","玉手箱","フェルミ","ケース","GD","フレームワーク","ビジネス知識"];
export const QA_TAG_PRESETS = ["志望動機","ガクチカ","自己PR","強み・弱み","逆質問","その他"];
export const DEADLINE_KINDS = [
  { id: "インターン応募", icon: "🎓", color: "#4ECDC4" },
  { id: "プレエントリー", icon: "📝", color: "#A8E6CF" },
  { id: "ES・書類", icon: "📄", color: "#FFE66D" },
  { id: "ES提出", icon: "📤", color: "#FFE66D" },
  { id: "適性検査", icon: "🧮", color: "#4ECDC4" },
  { id: "一次面接", icon: "🎤", color: "#C3A6FF" },
  { id: "二次面接以降", icon: "🎤", color: "#C3A6FF" },
  { id: "最終面接", icon: "🏆", color: "#FF6B6B" },
  { id: "内定承諾", icon: "✅", color: "#A8E6CF" },
  { id: "その他", icon: "📌", color: "rgba(255,255,255,0.4)" },
];

export const ANTHROPIC_KEY_STORAGE = "compass_anthropic_key";
export const OPENAI_KEY_STORAGE = "compass_openai_key";

export function getAnthropicKey() {
  try { return localStorage.getItem(ANTHROPIC_KEY_STORAGE) || ""; } catch { return ""; }
}
export function getOpenAIKey() {
  try { return localStorage.getItem(OPENAI_KEY_STORAGE) || ""; } catch { return ""; }
}

export function todayStr() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export function daysUntil(iso) {
  if (!iso) return null;
  const now = new Date();
  const target = new Date(iso);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((targetMidnight - todayMidnight) / 86400000);
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function calcLevel(totalXP) {
  let level = 1, remaining = totalXP;
  while (remaining >= level * 10) { remaining -= level * 10; level++; }
  return { level, remaining, needed: level * 10, totalXP };
}
