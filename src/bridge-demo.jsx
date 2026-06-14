import { useState, useEffect, useRef } from "react";

// ===== 定数 =====
const COLORS = {
  bg: "#0D1117", surface: "#161B22", border: "#21262D",
  gpt: "#10B981", claude: "#D97706", gemini: "#3B82F6",
  unified: "#E2E8F0", muted: "#6B7280", text: "#E2E8F0",
  sidebar: "#0D1117", sidebarHover: "#161B22",
  error: "#EF4444", accent: "#1A6BB5",
};

const AI_CONFIG = [
  { id: "gpt", name: "GPT", role: { ja: "発散・仮説出し", en: "Diverge & Hypothesize" }, color: COLORS.gpt, bg: "#10B98115", border: "#10B98140", keyLabel: "OpenAI API Key", keyPlaceholder: "sk-...", docsUrl: "https://platform.openai.com/api-keys" },
  { id: "claude", name: "Claude", role: { ja: "批判・論理整理", en: "Critique & Clarify" }, color: COLORS.claude, bg: "#D9770615", border: "#D9770640", keyLabel: "Anthropic API Key", keyPlaceholder: "sk-ant-...", docsUrl: "https://console.anthropic.com/settings/keys" },
  { id: "gemini", name: "Gemini", role: { ja: "統合・結論", en: "Integrate & Conclude" }, color: COLORS.gemini, bg: "#3B82F615", border: "#3B82F640", keyLabel: "Google AI Key", keyPlaceholder: "AIza...", docsUrl: "https://aistudio.google.com/app/apikey" },
];

const T = {
  ja: {
    appName: "BRIDGE", tagline: "3つのAIが議論する",
    subTagline: "GPT・Claude・Geminiが互いの回答を読み、議論して、最良の答えを導く",
    startDebate: "議論開始 →", debating: "議論中...",
    newDebate: "新しい議論を始める", myPage: "マイページ", apiSettings: "APIキー設定", settings: "設定",
    starred: "⭐ スター付き", recent: "🕐 最近の議論",
    inputPlaceholder: "質問を入力してください... (Enter で議論開始)",
    deepMode: "🔍 ディープ", blastMode: "💡 ブレスト",
    deepDesc: "順番に議論・深さ重視", blastDesc: "同時に考える・幅重視",
    changeOrder: "順番を変える", closeOrder: "閉じる",
    optimized: "⚙️ BRIDGEがプロンプトを最適化しました",
    thinking: "● 思考中...", done: "✓ 完了",
    parallelThinking: "💡 3つのAIが並列で思考中...",
    aiAnswers: "▼ 各AIの回答（クリックで全文表示）",
    bridge: "BRIDGE", unifiedAnswer: "統合回答",
    retry: "🔄 再議論", deepen: "🔬 深掘り", share: "🔗 共有",
    save: "💾 保存", savePDF: "📄 PDF保存", newQuestion: "✕ 新しい質問",
    saved: "✓ 保存済み",
    webInfo: "🌐 Web情報（最新）",
    nextQ: "💡 BRIDGEからの次の問い",
    generatingQ: "💭 次の問いを生成中...",
    shareTitle: "議論を共有する",
    shareDesc: "このURLを共有すると、議論の内容を他の人が見られます。",
    copy: "コピー", copied: "✓ コピー済み",
    demoMode: "🎮 デモモード中",
    setApiKey: "APIキーを設定",
    apiKeySettings: "APIキー設定",
    apiKeyDesc: "キーはあなたのブラウザにのみ保存されます",
    secureMsg: "APIキーはBRIDGEのサーバーに送信されません。あなたのブラウザ内にのみ保存されます。",
    howToGet: "取得方法 →",
    tryDemo: "🎮 まずデモモードで試す（APIキー不要）",
    startWithKey: "APIキーで始める",
    cancel: "キャンセル",
    freePlan: "Freeプラン",
    language: "言語",
    langJa: "🇯🇵 日本語",
    langEn: "🇺🇸 English",
    orderLabel: "議論順：",
    setup1: "言語を選択",
    setup1sub: "BRIDGEで使用する言語を選んでください",
    setup2: "APIキーを設定",
    setup2sub: "各AIのAPIキーを入力してください（後から変更可能）",
    next: "次へ →",
    back: "← 戻る",
    starAdd: "スターを追加",
    starRemove: "スターを解除",
    historyEmpty: "まだ議論がありません",
    showAll: "▼ 全文", hideAll: "▲ 閉じる",
    attachImage: "📷 画像",
    attachFile: "📎 ファイル",
    voiceInput: "🎤 音声",
    comingSoon: "（近日公開）",
    roundLabel: "第",
    roundSuffix: "ラウンド",
  },
  en: {
    appName: "BRIDGE", tagline: "3 AIs in Debate",
    subTagline: "GPT, Claude & Gemini read each other's answers, debate, and find the best solution.",
    startDebate: "Start Debate →", debating: "Debating...",
    newDebate: "Start New Debate", myPage: "My Page", apiSettings: "API Key Settings", settings: "Settings",
    starred: "⭐ Starred", recent: "🕐 Recent Debates",
    inputPlaceholder: "Enter your question... (Press Enter to start)",
    deepMode: "🔍 Deep", blastMode: "💡 Brainstorm",
    deepDesc: "Sequential debate, depth-focused", blastDesc: "Parallel thinking, breadth-focused",
    changeOrder: "Change Order", closeOrder: "Close",
    optimized: "⚙️ BRIDGE has optimized your prompt",
    thinking: "● Thinking...", done: "✓ Done",
    parallelThinking: "💡 3 AIs thinking in parallel...",
    aiAnswers: "▼ AI Responses (click to expand)",
    bridge: "BRIDGE", unifiedAnswer: "Unified Answer",
    retry: "🔄 Retry", deepen: "🔬 Dive Deeper", share: "🔗 Share",
    save: "💾 Save", savePDF: "📄 Save PDF", newQuestion: "✕ New Question",
    saved: "✓ Saved",
    webInfo: "🌐 Web Info (Latest)",
    nextQ: "💡 Next Questions from BRIDGE",
    generatingQ: "💭 Generating next questions...",
    shareTitle: "Share this Debate",
    shareDesc: "Share this URL so others can view your debate.",
    copy: "Copy", copied: "✓ Copied",
    demoMode: "🎮 Demo Mode",
    setApiKey: "Set API Key",
    apiKeySettings: "API Key Settings",
    apiKeyDesc: "Keys are stored only in your browser",
    secureMsg: "API keys are never sent to BRIDGE servers. They are stored only in your browser.",
    howToGet: "Get Key →",
    tryDemo: "🎮 Try Demo Mode (No API Key Required)",
    startWithKey: "Start with API Keys",
    cancel: "Cancel",
    freePlan: "Free Plan",
    language: "Language",
    langJa: "🇯🇵 日本語",
    langEn: "🇺🇸 English",
    orderLabel: "Order: ",
    setup1: "Select Language",
    setup1sub: "Choose the language for BRIDGE",
    setup2: "Set API Keys",
    setup2sub: "Enter your API keys (can be changed later)",
    next: "Next →",
    back: "← Back",
    starAdd: "Add Star",
    starRemove: "Remove Star",
    historyEmpty: "No debates yet",
    showAll: "▼ Show All", hideAll: "▲ Close",
    attachImage: "📷 Image",
    attachFile: "📎 File",
    voiceInput: "🎤 Voice",
    comingSoon: "(Coming Soon)",
    roundLabel: "Round ",
    roundSuffix: "",
  }
};

const DEMO_QUESTIONS = {
  ja: ["新しいビジネスを始めるべきか？", "AIは人間の仕事を奪うのか？", "どうすれば創造性を高められるか？"],
  en: ["Should I start a new business?", "Will AI take over human jobs?", "How can I boost my creativity?"],
};

// ===== ストレージ =====
const STORAGE_KEYS = {
  apiKeys: "bridge_api_keys",
  history: "bridge_history",
  starred: "bridge_starred",
  lang: "bridge_lang",
  setup: "bridge_setup_done",
};

function ls(key, def) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : def; } catch { return def; } }
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

function loadKeys() { return ls(STORAGE_KEYS.apiKeys, { gpt: "", claude: "", gemini: "" }); }
function saveKeys(keys) { lsSet(STORAGE_KEYS.apiKeys, keys); }
function loadHistory() { return ls(STORAGE_KEYS.history, []); }
function saveHistory(h) { lsSet(STORAGE_KEYS.history, h.slice(0, 50)); }
function loadStarred() { return ls(STORAGE_KEYS.starred, []); }
function saveStarred(s) { lsSet(STORAGE_KEYS.starred, s); }
function loadLang() { return ls(STORAGE_KEYS.lang, "ja"); }
function saveLang(l) { lsSet(STORAGE_KEYS.lang, l); }
function loadSetupDone() { return ls(STORAGE_KEYS.setup, false); }
function saveSetupDone() { lsSet(STORAGE_KEYS.setup, true); }

function addToHistory(item) {
  const h = loadHistory();
  const exists = h.find(x => x.id === item.id);
  if (exists) { saveHistory([item, ...h.filter(x => x.id !== item.id)]); }
  else { saveHistory([item, ...h]); }
}

// ===== プロンプト最適化 =====
function optimizePrompt(q, lang) {
  if (lang === "en") return `Analyze the following topic: "${q}"\n\nYour response must include:\n1. The reasoning behind your judgment\n2. 2-3 options with pros and cons\n3. One key question for the user to consider next\n\nBe specific and practical. Avoid abstract theory.`;
  return `以下のテーマについて分析してください：「${q}」\n\nあなたの回答には必ず以下を含めること：\n1. なぜそう判断したかの根拠\n2. 2〜3つの選択肢（それぞれのメリット・デメリット付き）\n3. ユーザーが次に考えるべき問いを1つ\n\n回答は具体的・実践的に。抽象論は避ける。`;
}

function buildGPTPrompt(optimized, lang) {
  if (lang === "en") return `You are a "Diverge & Hypothesize" expert.\n\n${optimized}\n\nYour role: Expand possibilities widely, include unconventional perspectives, present options rather than conclusions.\n\nRespond in English, concretely.`;
  return `あなたは「発散・仮説出し」の専門家です。\n\n${optimized}\n\n【あなたの役割】\n- 可能性を広く展開する\n- 一般的でない視点・仮説も含める\n- 断定せず、可能性として提示する\n\n回答は日本語で、具体的に。`;
}

function buildClaudePrompt(optimized, gptRes, lang) {
  if (lang === "en") return `You are a "Critique & Clarify" expert.\n\nOriginal question: ${optimized}\nGPT's response: ${gptRes}\n\nYour role: Point out flaws and oversights in GPT's response. Ask "Is this really okay?" and "What are we missing?" Distill the core issue.\n\nRespond in English, critically but constructively.`;
  return `あなたは「批判・論理整理」の専門家です。\n\n元の質問：${optimized}\nGPTの回答：${gptRes}\n\n【あなたの役割】\n- GPTの回答の穴・矛盾・見落としを具体的に指摘する\n- 「こっちは大丈夫？」という視点でフォローする\n- 本質的な問題を浮き彫りにする\n\n回答は日本語で。`;
}

function buildGeminiPrompt(optimized, gptRes, claudeRes, lang) {
  if (lang === "en") return `You are an "Integrate & Conclude" expert.\n\nOriginal: ${optimized}\nGPT: ${gptRes}\nClaude: ${claudeRes}\n\nYour role: Synthesize both perspectives and deliver the best actionable conclusion.\n\nRespond in English, practically.`;
  return `あなたは「統合・結論」の専門家です。\n\n元の質問：${optimized}\nGPT：${gptRes}\nClaude：${claudeRes}\n\n両者の議論を統合して今すぐ取るべきベストDoを明確に。日本語で。`;
}

// ===== API =====
async function callGPT(prompt, apiKey) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.choices?.[0]?.message?.content || "";
}

async function callClaude(prompt) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text || "";
}

// ===== モック（言語対応） =====
function mockGPT(q, lang) {
  if (lang === "en") return `[Hypotheses & Possibilities]\n\nRegarding "${q}", here are the main perspectives:\n\n① Use existing frameworks: Low risk with proven track record, but may lack innovation.\n\n② Question the premise: Redefining "why is this a problem?" can reveal entirely different solutions.\n\n③ Data-driven approach: Start by quantifying the current situation to improve precision.\n\nOptions: A) Speed → ①, B) Root cause → ②, C) Certainty → ③. Next question: "What risk do you most want to avoid?"`;
  return `【仮説と可能性の展開】\n\n「${q}」について、考えられる主要な視点をまず広げます。\n\n① 既存のフレームワークを活用する方法：実績があり低リスクですが、革新性に欠ける可能性があります。\n\n② 問題の前提そのものを疑う：「なぜそれが問題なのか」を再定義することで、まったく別の解決策が見えてきます。\n\n③ データドリブンなアプローチ：まず現状の定量的な把握から始めることで次のステップの精度が上がります。\n\n選択肢：A）即効性重視なら①、B）根本解決なら②、C）確実性優先なら③。次に考えるべき問い：「この状況で最も避けたいリスクは何か？」`;
}

function mockClaude(q, lang) {
  if (lang === "en") return `[Critical Analysis]\n\nCritiquing GPT's three directions:\n\n▸ Framework approach: "Proven = correct" is dangerous. Context changes everything.\n\n▸ Questioning premises: Good direction, but don't make "questioning" the goal itself.\n\n▸ Data-driven: Beware of "analysis paralysis" — waiting for perfect data can cost opportunities.\n\n[Key Insight] First clarify "what does success look like?" Without this, no option can be properly evaluated.`;
  return `【批判的検討と論理整理】\n\nGPTが提示した方向性を批判的に検討します。\n\n▸ 各選択肢の問題点：「何を成功とするか」が定義されていない状態では、どの選択肢も評価できません。\n\n▸ 見落としがちな視点：リソース（時間・お金・人）の制約が考慮されていません。\n\n▸ 本質的な問い：「${q}」という問い自体が正しいかを疑ってください。\n\n【整理】まず「成功の定義」と「制約条件」を明確にしてから選択肢を評価する。これが最初のステップです。`;
}

function mockGemini(q, lang) {
  if (lang === "en") return `[Integration & Conclusion]\n\n✦ Best Action Now\nThe top priority: define what "success" means. Without this, no option can be evaluated.\n\n✦ 3-Step Plan\n1. Write in one sentence: "What do I really want to solve?" (30 min)\n2. Check Claude's flagged blind spots as a checklist\n3. Choose the option from GPT that best matches Step 1\n\n✦ Insight\nRaising the precision of the question itself leads to the fastest solution.`;
  return `【統合・結論】\n\nGPTの多角的な仮説とClaudeの批判的精査を踏まえ、実践的な結論を導きます。\n\n✦ ベストDo（今すぐ取るべきアクション）\n最優先事項は「成功の定義を明確にすること」です。\n\n✦ 推奨アクション（3ステップ）\n1. 「この問いで本当に何を解決したいか」を1文で書く（30分）\n2. Claudeが指摘した見落としポイントを確認する\n3. GPTの選択肢から定義に最も近いものを選ぶ\n\n✦ 気づき\n問いの精度を上げることが、最速の解決につながります。`;
}

// ===== ユーティリティ =====
async function searchAndSummarize(q, lang) {
  try {
    const prompt = lang === "en"
      ? `Summarize the latest information about "${q}" in under 100 characters, including recent trends, stats, or examples.`
      : `以下のトピックについて最新情報を100字以内でまとめてください：「${q}」最新トレンド・統計・事例を含めて。`;
    return await callClaude(prompt);
  } catch { return null; }
}

async function generateNextQuestions(q, unified, lang) {
  try {
    const prompt = lang === "en"
      ? `Based on this debate, suggest 3 follow-up questions for deeper thinking.\n\nQuestion: ${q}\nConclusion: ${unified?.slice(0, 300)}\n\nReturn JSON only: {"questions": ["q1", "q2", "q3"]}`
      : `以下の議論を踏まえて、ユーザーがさらに深く考えるべき「次の問い」を3つ提案してください。\n\n元の質問：${q}\n統合回答：${unified?.slice(0, 300)}\n\nJSONのみ返してください：{"questions": ["問い1", "問い2", "問い3"]}`;
    const res = await callClaude(prompt);
    const clean = res.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return parsed.questions || [];
  } catch {
    return lang === "en"
      ? ["What is the root cause of this issue?", "Where do you want to be in 3 months?", "What's the smallest action you can take right now?"]
      : ["この問題の根本原因は何か？", "3ヶ月後にどうなっていたいか？", "今すぐできる最小のアクションは？"];
  }
}

function exportAsPDF(q, msgs, unified, mode, round, lang) {
  const t = T[lang];
  const date = new Date().toLocaleString(lang === "ja" ? "ja-JP" : "en-US");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>BRIDGE</title><style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1a1a1a;line-height:1.7}h1{color:#1A6BB5;border-bottom:3px solid #1A6BB5;padding-bottom:10px}.meta{color:#888;font-size:13px;margin-bottom:24px}.q{background:#f5f5f5;padding:16px;border-radius:8px;border-left:4px solid #1A6BB5;margin-bottom:24px;font-weight:600}.ai{margin-bottom:20px;padding:16px;border-radius:8px;border:1px solid #eee}.gpt{border-left:4px solid #10B981}.claude{border-left:4px solid #D97706}.gemini{border-left:4px solid #3B82F6}.label{font-size:13px;font-weight:700;margin-bottom:8px}.glabel{color:#10B981}.clabel{color:#D97706}.gemlabel{color:#3B82F6}.unified{background:#1E293B;color:#E2E8F0;padding:20px;border-radius:8px;margin-top:24px}.content{white-space:pre-wrap;font-size:14px}.footer{margin-top:40px;color:#888;font-size:12px;text-align:center;border-top:1px solid #eee;padding-top:16px}</style></head><body>
  <h1>⚡ BRIDGE${round > 1 ? ` ${t.roundLabel}${round}${t.roundSuffix}` : ""}</h1>
  <div class="meta">${date} | ${mode === "deep" ? t.deepMode : t.blastMode}</div>
  <div class="q">Q: ${q}</div>
  ${AI_CONFIG.map(ai => msgs[ai.id] ? `<div class="ai ${ai.id}"><div class="label ${ai.id}label">${ai.name}</div><div class="content">${msgs[ai.id].replace(/</g,"&lt;")}</div></div>` : "").join("")}
  <div class="unified"><h2>⚡ ${t.bridge} ${t.unifiedAnswer}</h2><div class="content">${(unified||"").replace(/</g,"&lt;")}</div></div>
  <div class="footer">Generated by BRIDGE — AIを、仲間に。</div>
  </body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `BRIDGE_${Date.now()}.html`; a.click(); URL.revokeObjectURL(url);
}

function exportAsText(q, msgs, unified, mode, round, lang) {
  const t = T[lang];
  const date = new Date().toLocaleString();
  let text = `BRIDGE${round > 1 ? ` ${t.roundLabel}${round}${t.roundSuffix}` : ""}\n${date}\n${"─".repeat(40)}\n\nQ: ${q}\n\n${"─".repeat(40)}\n\n`;
  AI_CONFIG.forEach(ai => { if (msgs[ai.id]) text += `[${ai.name}]\n${msgs[ai.id]}\n\n`; });
  text += `${"─".repeat(40)}\n\n[${t.bridge} ${t.unifiedAnswer}]\n${unified || ""}\n`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `BRIDGE_${Date.now()}.txt`; a.click(); URL.revokeObjectURL(url);
}

function generateShareUrl(q, msgs, unified) {
  try {
    const data = { q, m: { gpt: msgs.gpt?.slice(0,500), claude: msgs.claude?.slice(0,500), gemini: msgs.gemini?.slice(0,500), unified: unified?.slice(0,500) } };
    return `${window.location.origin}${window.location.pathname}?share=${btoa(encodeURIComponent(JSON.stringify(data)))}`;
  } catch { return window.location.href; }
}

// ===== コンポーネント =====
function TypingText({ text, speed = 12 }) {
  const [d, setD] = useState(""); const idx = useRef(0);
  useEffect(() => { idx.current = 0; setD(""); if (!text) return; const t = setInterval(() => { idx.current++; setD(text.slice(0, idx.current)); if (idx.current >= text.length) clearInterval(t); }, speed); return () => clearInterval(t); }, [text]);
  return <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}>{d}{d.length < (text?.length||0) && <span style={{ opacity: 0.6, animation: "blink 1s infinite" }}>▋</span>}</span>;
}

function AICard({ ai, message, isActive, isDone, isCollapsed, lang }) {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);
  const t = T[lang];
  useEffect(() => { if (isActive) { const x = setTimeout(() => setShow(true), 200); return () => clearTimeout(x); } setShow(false); }, [isActive]);
  if (isCollapsed) {
    const sum = message ? message.replace(/\n/g, " ").slice(0, 80) + "..." : "";
    return (
      <div style={{ marginBottom: 8, borderRadius: 10, border: `1px solid ${open ? ai.border : COLORS.border}`, background: open ? ai.bg : COLORS.surface, overflow: "hidden", transition: "all 0.3s" }}>
        <div onClick={() => setOpen(v => !v)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", cursor: "pointer", borderBottom: open ? `1px solid ${ai.border}` : "none" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: ai.color, flexShrink: 0 }} />
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: ai.color, flexShrink: 0 }}>{ai.name}</span>
          <span style={{ fontSize: 13, color: COLORS.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sum}</span>
          <span style={{ fontSize: 11, color: open ? ai.color : COLORS.muted, fontFamily: "monospace", flexShrink: 0, marginLeft: 8 }}>{open ? t.hideAll : t.showAll}</span>
        </div>
        {open && <div style={{ padding: "16px 20px", animation: "fadeIn 0.25s" }}><p style={{ margin: 0, fontSize: 14, color: COLORS.text, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{message}</p></div>}
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 16, borderRadius: 12, border: `1px solid ${isActive || isDone ? ai.border : COLORS.border}`, background: isActive || isDone ? ai.bg : COLORS.surface, overflow: "hidden", transition: "all 0.4s", opacity: isActive || isDone ? 1 : 0.35, transform: isActive ? "scale(1.01)" : "scale(1)", boxShadow: isActive ? `0 0 24px ${ai.color}30` : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: (isActive || isDone) && show && message ? `1px solid ${ai.border}` : "none" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: ai.color, boxShadow: isActive ? `0 0 10px ${ai.color}` : "none" }} />
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: ai.color }}>{ai.name}</span>
        <span style={{ fontSize: 12, color: COLORS.muted }}>{ai.role[lang]}</span>
        {isActive && <span style={{ marginLeft: "auto", fontSize: 11, color: ai.color, fontFamily: "monospace", animation: "pulse 1.5s infinite" }}>{t.thinking}</span>}
        {isDone && <span style={{ marginLeft: "auto", fontSize: 11, color: COLORS.muted, fontFamily: "monospace" }}>{t.done}</span>}
      </div>
      {(isActive || isDone) && show && message && (
        <div style={{ padding: "16px 20px" }}>
          <p style={{ margin: 0, fontSize: 14, color: COLORS.text, lineHeight: 1.75 }}>
            {isActive && !isDone ? <TypingText text={message} speed={12} /> : <span style={{ whiteSpace: "pre-wrap" }}>{message}</span>}
          </p>
        </div>
      )}
    </div>
  );
}

function UnifiedAnswer({ text, visible, lang }) {
  const [show, setShow] = useState(false);
  const t = T[lang];
  useEffect(() => { if (visible) { const x = setTimeout(() => setShow(true), 300); return () => clearTimeout(x); } setShow(false); }, [visible]);
  if (!visible) return null;
  return (
    <div style={{ marginTop: 16, borderRadius: 12, border: "1px solid #E2E8F040", background: "linear-gradient(135deg,#1E293B,#0F172A)", overflow: "hidden", opacity: show ? 1 : 0, transition: "opacity 0.6s", boxShadow: "0 0 40px #E2E8F010" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F020", display: "flex", alignItems: "center", gap: 10 }}>
        <span>⚡</span>
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: COLORS.unified }}>{t.bridge}</span>
        <span style={{ fontSize: 12, color: COLORS.muted }}>{t.unifiedAnswer}</span>
      </div>
      {show && <div style={{ padding: "18px 20px" }}><p style={{ margin: 0, fontSize: 14, color: COLORS.text, lineHeight: 1.75 }}><TypingText text={text} speed={10} /></p></div>}
    </div>
  );
}

function NextQuestions({ questions, onSelect, loading, lang }) {
  const t = T[lang];
  if (loading) return <div style={{ marginTop: 16, padding: "14px 18px", borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.surface }}><span style={{ fontSize: 12, color: COLORS.muted, fontFamily: "monospace", animation: "pulse 1.5s infinite" }}>{t.generatingQ}</span></div>;
  if (!questions?.length) return null;
  return (
    <div style={{ marginTop: 16, borderRadius: 10, border: `1px solid ${COLORS.accent}30`, background: `${COLORS.accent}08`, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${COLORS.accent}20` }}><span style={{ fontSize: 12, color: COLORS.accent, fontFamily: "monospace", fontWeight: 600 }}>{t.nextQ}</span></div>
      <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {questions.map((q, i) => (
          <button key={i} onClick={() => onSelect(q)} style={{ padding: "10px 14px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 13, cursor: "pointer", textAlign: "left", lineHeight: 1.5, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.background = `${COLORS.accent}10`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.background = COLORS.bg; }}
          ><span style={{ color: COLORS.accent, marginRight: 8, fontFamily: "monospace" }}>{i+1}.</span>{q}</button>
        ))}
      </div>
    </div>
  );
}

function ShareModal({ open, url, onClose, lang }) {
  const [copied, setCopied] = useState(false);
  const t = T[lang];
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, width: "100%", maxWidth: 480, overflow: "hidden", animation: "fadeIn 0.3s" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 16, color: COLORS.text }}>{t.shareTitle}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 12 }}>{t.shareDesc}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input readOnly value={url} style={{ flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 14px", color: COLORS.text, fontSize: 12, fontFamily: "monospace", outline: "none" }} onClick={e => e.target.select()} />
            <button onClick={() => { navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }} style={{ padding: "10px 16px", background: copied ? "#10B98120" : `linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})`, border: `1px solid ${copied ? COLORS.gpt : "transparent"}`, borderRadius: 8, color: copied ? COLORS.gpt : "#000", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
              {copied ? t.copied : t.copy}
            </button>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <a href={`https://twitter.com/intent/tweet?text=BRIDGE&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "8px", background: "#000", borderRadius: 8, color: "#fff", fontSize: 12, textAlign: "center", textDecoration: "none", fontWeight: 600 }}>X でシェア</a>
            <a href={`https://line.me/R/msg/text/?${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "8px", background: "#06C755", borderRadius: 8, color: "#fff", fontSize: 12, textAlign: "center", textDecoration: "none", fontWeight: 600 }}>LINE でシェア</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeSelector({ mode, setMode, order, setOrder, lang }) {
  const [showOrder, setShowOrder] = useState(false);
  const t = T[lang];
  const orders = [["gpt","claude","gemini"],["claude","gpt","gemini"],["gemini","claude","gpt"],["gpt","gemini","claude"],["claude","gemini","gpt"],["gemini","gpt","claude"]];
  return (
    <div style={{ marginBottom: 16, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.surface, overflow: "hidden" }}>
      <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}` }}>
        {[{id:"deep",label:t.deepMode,desc:t.deepDesc},{id:"blast",label:t.blastMode,desc:t.blastDesc}].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{ flex: 1, padding: "10px 16px", background: mode===m.id ? "#1A6BB520" : "transparent", border: "none", borderRight: m.id==="deep" ? `1px solid ${COLORS.border}` : "none", cursor: "pointer" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: mode===m.id ? COLORS.accent : COLORS.muted }}>{m.label}</div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{m.desc}</div>
          </button>
        ))}
      </div>
      {mode === "deep" && (
        <div style={{ padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: COLORS.muted }}>{t.orderLabel}{order.map(id => AI_CONFIG.find(a=>a.id===id)?.name).join(" → ")}</span>
            <button onClick={() => setShowOrder(v=>!v)} style={{ fontSize: 11, color: COLORS.accent, background: "none", border: "none", cursor: "pointer" }}>{showOrder ? t.closeOrder : t.changeOrder}</button>
          </div>
          {showOrder && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {orders.map((o, i) => (
                <button key={i} onClick={() => { setOrder(o); setShowOrder(false); }} style={{ padding: "7px 12px", background: JSON.stringify(order)===JSON.stringify(o) ? "#1A6BB520" : COLORS.bg, border: `1px solid ${JSON.stringify(order)===JSON.stringify(o) ? COLORS.accent : COLORS.border}`, borderRadius: 6, color: JSON.stringify(order)===JSON.stringify(o) ? COLORS.accent : COLORS.muted, fontSize: 12, cursor: "pointer", fontFamily: "monospace", textAlign: "left" }}>
                  {o.map(id => AI_CONFIG.find(a=>a.id===id)?.name).join(" → ")}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ApiKeyModal({ open, onClose, onSave, initialKeys, lang }) {
  const [keys, setKeys] = useState(initialKeys);
  const [showKeys, setShowKeys] = useState({gpt:false,claude:false,gemini:false});
  const [saved, setSaved] = useState(false);
  const t = T[lang];
  useEffect(() => setKeys(initialKeys), [initialKeys]);
  const handleSave = () => { saveKeys(keys); onSave(keys); setSaved(true); setTimeout(() => { setSaved(false); onClose(); }, 800); };
  const hasKey = Object.values(keys).some(k=>k.trim().length>0);
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, width: "100%", maxWidth: 520, overflow: "hidden", animation: "fadeIn 0.3s" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 16, color: COLORS.text }}>{t.apiKeySettings}</div><div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{t.apiKeyDesc}</div></div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ margin: "16px 24px 0", padding: "10px 14px", background: "#10B98110", border: "1px solid #10B98130", borderRadius: 8, display: "flex", gap: 10 }}>
          <span>🔒</span><span style={{ fontSize: 12, color: "#10B981", lineHeight: 1.6 }}>{t.secureMsg}</span>
        </div>
        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {AI_CONFIG.map(ai => (
            <div key={ai.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: ai.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: ai.color, fontFamily: "monospace" }}>{ai.name}</span>
                </div>
                <a href={ai.docsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: COLORS.muted, textDecoration: "none" }}>{t.howToGet}</a>
              </div>
              <div style={{ position: "relative" }}>
                <input type={showKeys[ai.id]?"text":"password"} value={keys[ai.id]||""} onChange={e=>setKeys(p=>({...p,[ai.id]:e.target.value}))} placeholder={ai.keyPlaceholder} style={{ width: "100%", background: COLORS.bg, border: `1px solid ${keys[ai.id]?ai.border:COLORS.border}`, borderRadius: 8, padding: "10px 44px 10px 14px", color: COLORS.text, fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} />
                <button onClick={() => setShowKeys(p=>({...p,[ai.id]:!p[ai.id]}))} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>{showKeys[ai.id]?"🙈":"👁"}</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "0 24px 8px" }}>
          <button onClick={onClose} style={{ width: "100%", padding: "10px", background: "#6B728010", border: `1px solid #6B728030`, borderRadius: 8, color: COLORS.muted, fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}>{t.tryDemo}</button>
        </div>
        <div style={{ padding: "8px 24px 24px" }}>
          <button onClick={handleSave} disabled={!hasKey} style={{ width: "100%", background: hasKey ? `linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})` : COLORS.border, border: "none", borderRadius: 8, padding: "10px", color: hasKey?"#000":COLORS.muted, fontSize: 13, fontWeight: 700, cursor: hasKey?"pointer":"not-allowed", fontFamily: "monospace" }}>
            {saved?"✓":""}  {t.startWithKey}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== マイページ =====
function MyPage({ open, onClose, lang, setLang, apiKeys, onOpenApiSettings, history, starred }) {
  const t = T[lang];
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column", animation: "fadeIn 0.3s" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 16, color: COLORS.text }}>{t.myPage}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {/* アバター */}
          <div style={{ padding: "24px", display: "flex", alignItems: "center", gap: 16, borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#000" }}>H</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>Herald</div>
              <div style={{ fontSize: 13, color: COLORS.muted }}>{t.freePlan}</div>
            </div>
          </div>

          {/* 統計 */}
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", gap: 16 }}>
              {[
                { label: lang==="ja"?"議論数":"Debates", value: history.length },
                { label: lang==="ja"?"スター":"Starred", value: starred.length },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, padding: "14px", background: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.accent }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 言語設定 */}
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>{t.language}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{id:"ja",label:t.langJa},{id:"en",label:t.langEn}].map(l => (
                <button key={l.id} onClick={() => { setLang(l.id); saveLang(l.id); }} style={{ flex: 1, padding: "10px", background: lang===l.id ? "#1A6BB520" : COLORS.bg, border: `1px solid ${lang===l.id ? COLORS.accent : COLORS.border}`, borderRadius: 8, color: lang===l.id ? COLORS.accent : COLORS.muted, fontSize: 13, cursor: "pointer", fontWeight: lang===l.id ? 600 : 400 }}>{l.label}</button>
              ))}
            </div>
          </div>

          {/* APIキー */}
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>{t.apiKeySettings}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {AI_CONFIG.map(ai => (
                <div key={ai.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: COLORS.bg, borderRadius: 8, border: `1px solid ${apiKeys[ai.id] ? ai.border : COLORS.border}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: apiKeys[ai.id] ? ai.color : COLORS.border }} />
                  <span style={{ fontSize: 13, color: apiKeys[ai.id] ? ai.color : COLORS.muted, fontFamily: "monospace", fontWeight: 600 }}>{ai.name}</span>
                  <span style={{ fontSize: 11, color: COLORS.muted, marginLeft: "auto" }}>{apiKeys[ai.id] ? "✓ 設定済み" : "未設定"}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { onClose(); setTimeout(onOpenApiSettings, 300); }} style={{ width: "100%", marginTop: 10, padding: "10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.muted, fontSize: 13, cursor: "pointer" }}>
              🔑 {t.apiKeySettings}を変更
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== 初回セットアップ =====
function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [lang, setLangState] = useState("ja");
  const [keys, setKeys] = useState({ gpt: "", claude: "", gemini: "" });
  const [showKeys, setShowKeys] = useState({gpt:false,claude:false,gemini:false});
  const t = T[lang];

  const handleComplete = (skipKeys = false) => {
    saveLang(lang);
    if (!skipKeys) saveKeys(keys);
    saveSetupDone();
    onComplete(lang, skipKeys ? loadKeys() : keys);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: COLORS.bg, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 480, animation: "fadeIn 0.5s" }}>
        {/* ロゴ */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
            {[COLORS.gpt, COLORS.claude, COLORS.gemini].map((c,i) => <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c, boxShadow: `0 0 12px ${c}` }} />)}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 40, fontWeight: 700, color: COLORS.text, letterSpacing: 4 }}>BRIDGE</div>
          {/* ステップインジケーター */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 }}>
            {[1,2].map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: step>=s ? COLORS.accent : COLORS.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: step>=s ? "#fff" : COLORS.muted }}>{s}</div>
                {s < 2 && <div style={{ width: 40, height: 2, background: step>s ? COLORS.accent : COLORS.border }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: 言語選択 */}
        {step === 1 && (
          <div style={{ animation: "fadeIn 0.3s" }}>
            <h2 style={{ textAlign: "center", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 8px" }}>{t.setup1}</h2>
            <p style={{ textAlign: "center", fontSize: 14, color: COLORS.muted, margin: "0 0 32px" }}>{t.setup1sub}</p>
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              {[{id:"ja",label:"🇯🇵 日本語"},{id:"en",label:"🇺🇸 English"}].map(l => (
                <button key={l.id} onClick={() => setLangState(l.id)} style={{ flex: 1, padding: "20px", background: lang===l.id ? "#1A6BB520" : COLORS.surface, border: `2px solid ${lang===l.id ? COLORS.accent : COLORS.border}`, borderRadius: 12, color: lang===l.id ? COLORS.accent : COLORS.muted, fontSize: 16, cursor: "pointer", fontWeight: lang===l.id ? 700 : 400, transition: "all 0.2s" }}>{l.label}</button>
              ))}
            </div>
            <button onClick={() => setStep(2)} style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})`, border: "none", borderRadius: 10, color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}>{T[lang].next}</button>
          </div>
        )}

        {/* Step 2: APIキー */}
        {step === 2 && (
          <div style={{ animation: "fadeIn 0.3s" }}>
            <h2 style={{ textAlign: "center", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 8px" }}>{T[lang].setup2}</h2>
            <p style={{ textAlign: "center", fontSize: 14, color: COLORS.muted, margin: "0 0 24px" }}>{T[lang].setup2sub}</p>
            <div style={{ background: "#10B98110", border: "1px solid #10B98130", borderRadius: 8, padding: "10px 14px", marginBottom: 20, display: "flex", gap: 8 }}>
              <span>🔒</span><span style={{ fontSize: 12, color: "#10B981", lineHeight: 1.6 }}>{T[lang].secureMsg}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              {AI_CONFIG.map(ai => (
                <div key={ai.id}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: ai.color }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: ai.color, fontFamily: "monospace" }}>{ai.name}</span>
                    </div>
                    <a href={ai.docsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: COLORS.muted, textDecoration: "none" }}>{T[lang].howToGet}</a>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input type={showKeys[ai.id]?"text":"password"} value={keys[ai.id]||""} onChange={e=>setKeys(p=>({...p,[ai.id]:e.target.value}))} placeholder={ai.keyPlaceholder} style={{ width: "100%", background: COLORS.surface, border: `1px solid ${keys[ai.id]?ai.border:COLORS.border}`, borderRadius: 8, padding: "10px 44px 10px 14px", color: COLORS.text, fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} />
                    <button onClick={() => setShowKeys(p=>({...p,[ai.id]:!p[ai.id]}))} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>{showKeys[ai.id]?"🙈":"👁"}</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => handleComplete(false)} disabled={!Object.values(keys).some(k=>k.trim())} style={{ width: "100%", padding: "14px", background: Object.values(keys).some(k=>k.trim()) ? `linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})` : COLORS.border, border: "none", borderRadius: 10, color: Object.values(keys).some(k=>k.trim())?"#000":COLORS.muted, fontSize: 15, fontWeight: 700, cursor: Object.values(keys).some(k=>k.trim())?"pointer":"not-allowed", fontFamily: "monospace" }}>{T[lang].startWithKey}</button>
              <button onClick={() => handleComplete(true)} style={{ width: "100%", padding: "12px", background: "#6B728010", border: `1px solid #6B728030`, borderRadius: 10, color: COLORS.muted, fontSize: 13, cursor: "pointer" }}>{T[lang].tryDemo}</button>
              <button onClick={() => setStep(1)} style={{ width: "100%", padding: "10px", background: "transparent", border: "none", color: COLORS.muted, fontSize: 13, cursor: "pointer" }}>{T[lang].back}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Sidebar({ open, onClose, onOpenApiSettings, onOpenMyPage, lang, history, starred, onToggleStar, onSelectHistory }) {
  const [starredOpen, setStarredOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);
  const t = T[lang];
  const starredItems = history.filter(h => starred.includes(h.id));
  return (
    <>
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200 }} />}
      <div style={{ position: "fixed", top: 0, left: 0, height: "100vh", width: 280, background: COLORS.sidebar, borderRight: `1px solid ${COLORS.border}`, zIndex: 300, transform: open?"translateX(0)":"translateX(-100%)", transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px", borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, background: COLORS.sidebar, zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 4 }}>{[COLORS.gpt,COLORS.claude,COLORS.gemini].map((c,i)=><div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />)}</div>
            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: COLORS.text, letterSpacing: 2 }}>{t.appName}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: "12px 12px 8px" }}>
          <button onClick={onClose} style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 14px", color: COLORS.text, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit" }}>
            <span>＋</span><span>{t.newDebate}</span>
          </button>
        </div>
        <div style={{ padding: "4px 12px" }}>
          {[
            { icon: "👤", label: t.myPage, action: () => { onClose(); setTimeout(onOpenMyPage, 300); } },
            { icon: "🔑", label: t.apiSettings, action: () => { onClose(); setTimeout(onOpenApiSettings, 300); } },
            { icon: "⚙️", label: t.settings },
          ].map(({icon,label,action}) => (
            <div key={label} onClick={action} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, cursor: "pointer", color: COLORS.muted, fontSize: 13, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = COLORS.sidebarHover; e.currentTarget.style.color = COLORS.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = COLORS.muted; }}
            ><span>{icon}</span><span>{label}</span></div>
          ))}
        </div>
        <div style={{ height: 1, background: COLORS.border, margin: "8px 12px" }} />

        {/* スター付き */}
        <div style={{ padding: "0 12px" }}>
          <div onClick={() => setStarredOpen(v=>!v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", cursor: "pointer", color: COLORS.muted, fontSize: 12, fontFamily: "monospace" }}>
            <span>{t.starred}</span><span style={{ fontSize: 10 }}>{starredOpen?"▲":"▼"}</span>
          </div>
          {starredOpen && (starredItems.length === 0 ? (
            <div style={{ padding: "8px 10px", fontSize: 12, color: COLORS.border }}>{t.historyEmpty}</div>
          ) : starredItems.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.sidebarHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span onClick={() => onToggleStar(item.id)} style={{ fontSize: 12, cursor: "pointer" }}>⭐</span>
              <div onClick={() => onSelectHistory(item)} style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 13, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.question}</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>{item.date}</div>
              </div>
            </div>
          )))}
        </div>
        <div style={{ height: 1, background: COLORS.border, margin: "8px 12px" }} />

        {/* 最近の議論 */}
        <div style={{ padding: "0 12px", flex: 1 }}>
          <div onClick={() => setRecentOpen(v=>!v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", cursor: "pointer", color: COLORS.muted, fontSize: 12, fontFamily: "monospace" }}>
            <span>{t.recent}</span><span style={{ fontSize: 10 }}>{recentOpen?"▲":"▼"}</span>
          </div>
          {recentOpen && (history.length === 0 ? (
            <div style={{ padding: "8px 10px", fontSize: 12, color: COLORS.border }}>{t.historyEmpty}</div>
          ) : history.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.sidebarHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span onClick={() => onToggleStar(item.id)} style={{ fontSize: 12, cursor: "pointer", opacity: starred.includes(item.id) ? 1 : 0.3 }}>⭐</span>
              <div onClick={() => onSelectHistory(item)} style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 13, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.question}</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>{item.date}</div>
              </div>
            </div>
          )))}
        </div>

        <div style={{ padding: "12px 16px", borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#000" }}>H</div>
            <div><div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>Herald</div><div style={{ fontSize: 11, color: COLORS.muted }}>{t.freePlan}</div></div>
          </div>
        </div>
      </div>
    </>
  );
}

// ===== メインアプリ =====
export default function App() {
  const [setupDone, setSetupDone] = useState(loadSetupDone());
  const [lang, setLang] = useState(loadLang());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [myPageOpen, setMyPageOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState(loadKeys());
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState("idle");
  const [activeAI, setActiveAI] = useState(null);
  const [doneAIs, setDoneAIs] = useState([]);
  const [messages, setMessages] = useState({});
  const [showUnified, setShowUnified] = useState(false);
  const [currentQ, setCurrentQ] = useState("");
  const [optimizedPrompt, setOptimizedPrompt] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("deep");
  const [order, setOrder] = useState(["gpt","claude","gemini"]);
  const [round, setRound] = useState(1);
  const [exportDone, setExportDone] = useState(false);
  const [nextQuestions, setNextQuestions] = useState([]);
  const [nextQLoading, setNextQLoading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [webSearchInfo, setWebSearchInfo] = useState("");
  const [history, setHistory] = useState(loadHistory());
  const [starred, setStarred] = useState(loadStarred());
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const t = T[lang];

  useEffect(() => { if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" }); }, [activeAI, showUnified]);

  const hasKeys = Object.values(apiKeys).some(k=>k.trim().length>0);

  const handleSetupComplete = (selectedLang, selectedKeys) => {
    setLang(selectedLang);
    setApiKeys(selectedKeys);
    setSetupDone(true);
  };

  const toggleStar = (id) => {
    const s = starred.includes(id) ? starred.filter(x=>x!==id) : [...starred, id];
    setStarred(s); saveStarred(s);
  };

  const handleSelectHistory = (item) => {
    setSidebarOpen(false);
    setCurrentQ(item.question);
    setMessages(item.messages);
    setShowUnified(true);
    setPhase("done");
    setOptimizedPrompt("");
    setNextQuestions([]);
    setWebSearchInfo("");
    setRound(item.round || 1);
  };

  const runDebate = async (q, isRetry=false, isDeepen=false) => {
    if (!q.trim() || phase === "running") return;
    setCurrentQ(q); setPhase("running");
    setActiveAI(null); setDoneAIs([]); setMessages({}); setShowUnified(false); setError("");
    setNextQuestions([]); setWebSearchInfo("");

    const optimized = isDeepen
      ? (lang==="ja" ? `前回の議論を踏まえてさらに深掘りしてください。\n元の質問：「${q}」\n\nより具体的・実践的な視点で、前回より深いレベルで分析してください。` : `Dive deeper based on the previous debate.\nOriginal question: "${q}"\n\nProvide a more specific and practical analysis at a deeper level.`)
      : optimizePrompt(q, lang);
    setOptimizedPrompt(optimized);

    const allMsgs = {};
    try {
      if (mode === "deep") {
        let prevRes = {};
        for (let i=0; i<order.length; i++) {
          const aiId = order[i];
          setActiveAI(aiId);
          await new Promise(r=>setTimeout(r,400));
          let res;
          if (aiId==="gpt") {
            res = apiKeys.gpt?.trim() ? await callGPT(buildGPTPrompt(optimized,lang), apiKeys.gpt.trim()).catch(()=>mockGPT(q,lang)) : (await new Promise(r=>setTimeout(r,1500)), mockGPT(q,lang));
          } else if (aiId==="claude") {
            res = await callClaude(buildClaudePrompt(optimized, prevRes[order[i-1]]||"", lang)).catch(()=>mockClaude(q,lang));
          } else {
            res = mockGemini(q,lang); await new Promise(r=>setTimeout(r,1500));
          }
          prevRes[aiId]=res; allMsgs[aiId]=res;
          setMessages(p=>({...p,[aiId]:res})); setDoneAIs(p=>[...p,aiId]);
        }
        setActiveAI(null); await new Promise(r=>setTimeout(r,400));
        let unified;
        try {
          const uPrompt = lang==="en"
            ? `Synthesize this debate and provide the best actionable conclusion in under 150 words.\n\nQuestion: ${q}\n${Object.entries(prevRes).map(([id,r])=>`${id}: ${r.slice(0,200)}`).join("\n")}`
            : `以下の議論を統合して、最終的なベストDoを200字以内でまとめてください。\n\n元の質問：${q}\n${Object.entries(prevRes).map(([id,r])=>`${AI_CONFIG.find(a=>a.id===id)?.name}：${r.slice(0,200)}`).join("\n")}`;
          unified = await callClaude(uPrompt);
        } catch {
          unified = lang==="en" ? `Synthesis: The key to answering "${q}" is first clarifying what success looks like. Write it in one sentence — that alone will make the answer clear.` : `3つのAIの議論を統合した結論：「${q}」について、まず「本当に何を解決したいのか」を1文で書き出してください。それだけで、答えの輪郭が見えてきます。`;
        }
        allMsgs.unified = unified;
        setMessages(p=>({...p, unified}));
      } else {
        setActiveAI("all"); await new Promise(r=>setTimeout(r,400));
        const [gptRes, claudeRes, geminiRes] = await Promise.all([
          apiKeys.gpt?.trim() ? callGPT(buildGPTPrompt(optimized,lang), apiKeys.gpt.trim()).catch(()=>mockGPT(q,lang)) : Promise.resolve(mockGPT(q,lang)),
          callClaude(buildClaudePrompt(optimized, lang==="en"?"(parallel mode - independent analysis)":"（並列モード：独立して分析）", lang)).catch(()=>mockClaude(q,lang)),
          Promise.resolve(mockGemini(q,lang)),
        ]);
        setActiveAI(null);
        allMsgs.gpt=gptRes; allMsgs.claude=claudeRes; allMsgs.gemini=geminiRes;
        setMessages({gpt:gptRes,claude:claudeRes,gemini:geminiRes}); setDoneAIs(["gpt","claude","gemini"]);
        await new Promise(r=>setTimeout(r,400));
        let unified;
        try {
          const uPrompt = lang==="en" ? `Synthesize these 3 independent analyses:\nGPT: ${gptRes.slice(0,200)}\nClaude: ${claudeRes.slice(0,200)}\nGemini: ${geminiRes.slice(0,200)}\n\nProvide the best unified conclusion in under 150 words.` : `以下の3つのAIが独立して分析した結果を統合してください：\nGPT：${gptRes.slice(0,200)}\nClaude：${claudeRes.slice(0,200)}\nGemini：${geminiRes.slice(0,200)}\n\n共通点・相違点を踏まえて200字以内でベストDoを出してください。`;
          unified = await callClaude(uPrompt);
        } catch {
          unified = lang==="en" ? `All three AIs highlighted the importance of clarifying your definition of success first.` : `3つのAIが共通して指摘したのは「成功の定義を先に決めること」の重要性です。`;
        }
        allMsgs.unified = unified;
        setMessages(p=>({...p,unified}));
      }

      setShowUnified(true); setPhase("done");

      // 履歴に保存
      const histItem = { id: Date.now(), question: q, messages: allMsgs, mode, round, date: new Date().toLocaleDateString(lang==="ja"?"ja-JP":"en-US") };
      addToHistory(histItem);
      setHistory(loadHistory());

      // 深掘り提案
      setNextQLoading(true);
      generateNextQuestions(q, allMsgs.unified, lang).then(qs => { setNextQuestions(qs); setNextQLoading(false); });

      // Web検索
      searchAndSummarize(q, lang).then(info => { if (info) setWebSearchInfo(info); });

    } catch (err) {
      setError(`Error: ${err.message || "Unknown error"}`); setPhase("idle");
    }
  };

  const handleStart = () => runDebate(question);
  const handleRetry = () => { setRound(r=>r+1); setNextQuestions([]); setWebSearchInfo(""); runDebate(currentQ, true); };
  const handleDeepen = () => { setRound(r=>r+1); setNextQuestions([]); setWebSearchInfo(""); runDebate(currentQ, false, true); };
  const handleSelectNextQ = (q) => { setQuestion(q); setRound(1); setNextQuestions([]); setWebSearchInfo(""); runDebate(q); };
  const handleExport = (type) => { type==="pdf" ? exportAsPDF(currentQ,messages,messages.unified,mode,round,lang) : exportAsText(currentQ,messages,messages.unified,mode,round,lang); setExportDone(true); setTimeout(()=>setExportDone(false),2000); };
  const handleShare = () => { setShareUrl(generateShareUrl(currentQ,messages,messages.unified)); setShareModalOpen(true); };
  const reset = () => { setPhase("idle"); setQuestion(""); setCurrentQ(""); setActiveAI(null); setDoneAIs([]); setMessages({}); setShowUnified(false); setOptimizedPrompt(""); setError(""); setRound(1); setNextQuestions([]); setWebSearchInfo(""); };

  const isRunning = phase==="running", isDone = phase==="done";

  if (!setupDone) return <SetupWizard onComplete={handleSetupComplete} />;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Inter',-apple-system,sans-serif", paddingBottom: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder,textarea::placeholder { color: #4B5563; }
        textarea:focus,input:focus { outline: none; }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0D1117; }
        ::-webkit-scrollbar-thumb { background: #21262D; border-radius: 3px; }
        @media (max-width: 640px) { .main-pad { padding: 16px 12px 0 !important; } .hero-title { font-size: 26px !important; } .ai-status { display: none !important; } }
      `}</style>

      <ApiKeyModal open={apiModalOpen} onClose={()=>setApiModalOpen(false)} onSave={(k)=>{saveKeys(k);setApiKeys(k);}} initialKeys={apiKeys} lang={lang} />
      <ShareModal open={shareModalOpen} url={shareUrl} onClose={()=>setShareModalOpen(false)} lang={lang} />
      <MyPage open={myPageOpen} onClose={()=>setMyPageOpen(false)} lang={lang} setLang={setLang} apiKeys={apiKeys} onOpenApiSettings={()=>setApiModalOpen(true)} history={history} starred={starred} />
      <Sidebar open={sidebarOpen} onClose={()=>setSidebarOpen(false)} onOpenApiSettings={()=>setApiModalOpen(true)} onOpenMyPage={()=>setMyPageOpen(true)} lang={lang} history={history} starred={starred} onToggleStar={toggleStar} onSelectHistory={handleSelectHistory} />

      <div style={{ marginLeft: sidebarOpen?280:0, transition: "margin-left 0.3s cubic-bezier(0.4,0,0.2,1)", minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, background: COLORS.bg, zIndex: 100 }}>
          <button onClick={()=>setSidebarOpen(v=>!v)} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", borderRadius: 8, color: COLORS.muted, display: "flex", flexDirection: "column", gap: 5 }}>
            {[0,1,2].map(i=><div key={i} style={{ width: 20, height: 2, background: "currentColor", borderRadius: 2 }} />)}
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            {[COLORS.gpt,COLORS.claude,COLORS.gemini].map((c,i)=><div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: isRunning?`0 0 8px ${c}`:"none", transition: "box-shadow 0.3s" }} />)}
          </div>
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 18, color: COLORS.text, letterSpacing: 2 }}>{t.appName}</span>
          {round > 1 && <span style={{ fontSize: 11, color: COLORS.muted, fontFamily: "monospace" }}>{t.roundLabel}{round}{t.roundSuffix}</span>}
          {!hasKeys ? (
            <button onClick={()=>setApiModalOpen(true)} style={{ marginLeft: "auto", background: "#6B728015", border: "1px solid #6B728040", borderRadius: 8, padding: "6px 14px", color: COLORS.muted, fontSize: 12, cursor: "pointer", fontFamily: "monospace", display: "flex", alignItems: "center", gap: 6 }}>
              {t.demoMode} <span style={{ color: COLORS.accent }}>{t.setApiKey}</span>
            </button>
          ) : (
            <button onClick={()=>setApiModalOpen(true)} style={{ marginLeft: "auto", background: "transparent", border: "none", color: COLORS.muted, fontSize: 12, cursor: "pointer" }}>🔑</button>
          )}
        </div>

        {/* Main */}
        <div className="main-pad" style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 0" }}>
          {phase==="idle" && (
            <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeIn 0.6s" }}>
              <h1 className="hero-title" style={{ fontSize: 36, fontWeight: 700, margin: "0 0 12px", background: `linear-gradient(135deg,${COLORS.gpt},${COLORS.claude},${COLORS.gemini})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1 }}>{t.tagline}</h1>
              <p style={{ color: COLORS.muted, fontSize: 15, margin: "0 0 32px" }}>{t.subTagline}</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {DEMO_QUESTIONS[lang].map(q=>(
                  <button key={q} onClick={()=>setQuestion(q)} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "8px 16px", color: COLORS.muted, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e=>{e.target.style.borderColor="#3B82F6";e.target.style.color=COLORS.text;}}
                    onMouseLeave={e=>{e.target.style.borderColor=COLORS.border;e.target.style.color=COLORS.muted;}}
                  >{q}</button>
                ))}
              </div>
            </div>
          )}

          {!isRunning && <ModeSelector mode={mode} setMode={setMode} order={order} setOrder={setOrder} lang={lang} />}

          {/* Input */}
          <div style={{ background: COLORS.surface, border: `1px solid ${isRunning?"#3B82F640":COLORS.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 28, transition: "border-color 0.3s", boxShadow: isRunning?"0 0 20px #3B82F615":"none" }}>
            <textarea value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleStart();}}} placeholder={t.inputPlaceholder} rows={3} disabled={isRunning} style={{ width: "100%", background: "transparent", border: "none", padding: "16px 18px", color: COLORS.text, fontSize: 15, fontFamily: "inherit", lineHeight: 1.6 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px", borderTop: `1px solid ${COLORS.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* プラスボタン */}
                <div style={{ position: "relative" }}>
                  <button onClick={()=>setAttachMenuOpen(v=>!v)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "4px 8px", color: COLORS.muted, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center" }}>＋</button>
                  {attachMenuOpen && (
                    <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 8, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden", minWidth: 180, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", animation: "fadeIn 0.2s", zIndex: 50 }}>
                      {[
                        { label: t.attachImage, action: ()=>imageInputRef.current?.click(), soon: false },
                        { label: t.attachFile, action: ()=>fileInputRef.current?.click(), soon: false },
                        { label: t.voiceInput, action: null, soon: true },
                      ].map(({label,action,soon})=>(
                        <div key={label} onClick={()=>{if(!soon&&action){action();setAttachMenuOpen(false);}}} style={{ padding: "10px 16px", fontSize: 13, color: soon?COLORS.border:COLORS.text, cursor: soon?"default":"pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${COLORS.border}` }}
                          onMouseEnter={e=>{if(!soon)e.currentTarget.style.background=COLORS.sidebarHover;}}
                          onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}
                        >
                          <span>{label}</span>
                          {soon && <span style={{ fontSize: 10, color: COLORS.border }}>{t.comingSoon}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e=>{ if(e.target.files?.[0]) { setQuestion(q=>q+(q?" ":"")+`[画像: ${e.target.files[0].name}]`); setAttachMenuOpen(false); }}} />
                <input ref={fileInputRef} type="file" accept=".pdf,.txt,.doc,.docx" style={{ display: "none" }} onChange={e=>{ if(e.target.files?.[0]) { setQuestion(q=>q+(q?" ":"")+`[ファイル: ${e.target.files[0].name}]`); setAttachMenuOpen(false); }}} />
                <div className="ai-status" style={{ display: "flex", gap: 12 }}>
                  {AI_CONFIG.map(ai=>(
                    <span key={ai.id} style={{ fontSize: 12, color: activeAI===ai.id||activeAI==="all"?ai.color:doneAIs.includes(ai.id)?ai.color+"80":COLORS.muted, fontFamily: "monospace", transition: "color 0.3s" }}>
                      {activeAI===ai.id||activeAI==="all"?"● ":doneAIs.includes(ai.id)?"✓ ":"○ "}{ai.name}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={handleStart} disabled={!question.trim()||isRunning} style={{ background: question.trim()&&!isRunning?`linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})`:COLORS.border, border: "none", borderRadius: 8, padding: "8px 20px", color: question.trim()&&!isRunning?"#000":COLORS.muted, fontSize: 13, fontWeight: 600, cursor: question.trim()&&!isRunning?"pointer":"not-allowed", transition: "all 0.2s", fontFamily: "monospace" }}>
                {isRunning?t.debating:t.startDebate}
              </button>
            </div>
          </div>

          {error && <div style={{ marginBottom: 16, padding: "12px 16px", background: "#EF444410", border: "1px solid #EF444440", borderRadius: 8, fontSize: 13, color: "#EF4444" }}>{error}</div>}

          {/* Results */}
          {(isRunning||isDone) && (
            <div style={{ animation: "fadeIn 0.4s" }}>
              {currentQ && (
                <div style={{ marginBottom: 16, padding: "12px 16px", background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 13, color: COLORS.muted, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: COLORS.text, fontWeight: 500 }}>Q: </span>
                  <span style={{ flex: 1 }}>{currentQ}</span>
                  <span style={{ fontSize: 11, color: COLORS.muted, fontFamily: "monospace", flexShrink: 0 }}>{mode==="deep"?`🔍 ${order.map(id=>AI_CONFIG.find(a=>a.id===id)?.name).join("→")}`:t.blastMode}</span>
                  {isDone && (
                    <button onClick={()=>toggleStar(history[0]?.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "2px 4px" }}
                      title={starred.includes(history[0]?.id)?t.starRemove:t.starAdd}
                    >{starred.includes(history[0]?.id)?"⭐":"☆"}</button>
                  )}
                </div>
              )}

              {optimizedPrompt && (
                <div style={{ marginBottom: 16, borderRadius: 8, border: "1px solid #6B728040", background: "#6B728010", overflow: "hidden" }}>
                  <div style={{ padding: "8px 14px", fontSize: 11, color: COLORS.muted, fontFamily: "monospace" }}>{t.optimized}</div>
                </div>
              )}

              {isRunning && (
                mode==="blast" ? (
                  <div style={{ marginBottom: 16, padding: "14px 20px", borderRadius: 12, border: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
                    <div style={{ fontSize: 13, color: COLORS.muted, fontFamily: "monospace", marginBottom: 12 }}>{t.parallelThinking}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {AI_CONFIG.map(ai=>(
                        <div key={ai.id} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${ai.border}`, background: ai.bg, display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: ai.color, animation: "pulse 1.5s infinite" }} />
                          <span style={{ fontSize: 12, color: ai.color, fontFamily: "monospace" }}>{ai.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : AI_CONFIG.map(ai=><AICard key={ai.id} ai={ai} message={messages[ai.id]} isActive={activeAI===ai.id} isDone={doneAIs.includes(ai.id)} isCollapsed={false} lang={lang} />)
              )}

              {isDone && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: 11, color: COLORS.muted, margin: "0 0 8px", fontFamily: "monospace" }}>{t.aiAnswers}</p>
                    {AI_CONFIG.map(ai=><AICard key={ai.id} ai={ai} message={messages[ai.id]} isCollapsed={true} lang={lang} />)}
                  </div>
                  <UnifiedAnswer text={messages.unified||""} visible={showUnified} lang={lang} />

                  {webSearchInfo && (
                    <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 8, border: `1px solid ${COLORS.gemini}30`, background: `${COLORS.gemini}08` }}>
                      <div style={{ fontSize: 11, color: COLORS.gemini, fontFamily: "monospace", marginBottom: 6 }}>{t.webInfo}</div>
                      <p style={{ margin: 0, fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{webSearchInfo}</p>
                    </div>
                  )}

                  {/* アクションボタン */}
                  <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
                    {[
                      { label: t.retry, action: handleRetry, hoverColor: COLORS.gpt },
                      { label: t.deepen, action: handleDeepen, hoverColor: COLORS.claude },
                      { label: t.share, action: handleShare, hoverColor: COLORS.gemini },
                      { label: exportDone?t.saved:t.save, action: ()=>handleExport("text"), hoverColor: COLORS.gpt },
                      { label: t.savePDF, action: ()=>handleExport("pdf"), hoverColor: COLORS.unified },
                      { label: t.newQuestion, action: reset, hoverColor: COLORS.text },
                    ].map(({label,action,hoverColor})=>(
                      <button key={label} onClick={action} style={{ flex: 1, minWidth: 80, padding: "9px 8px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.muted, fontSize: 11, cursor: "pointer", fontFamily: "monospace", transition: "all 0.2s" }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=hoverColor;e.currentTarget.style.color=hoverColor;}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=COLORS.border;e.currentTarget.style.color=COLORS.muted;}}
                      >{label}</button>
                    ))}
                  </div>

                  <NextQuestions questions={nextQuestions} onSelect={handleSelectNextQ} loading={nextQLoading} lang={lang} />
                </>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
