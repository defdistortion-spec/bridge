import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#0D1117", surface: "#161B22", border: "#21262D",
  gpt: "#10B981", claude: "#D97706", gemini: "#3B82F6",
  unified: "#E2E8F0", muted: "#6B7280", text: "#E2E8F0",
  sidebar: "#0D1117", sidebarHover: "#161B22",
  error: "#EF4444", success: "#10B981",
};

// ===== プロンプト自動最適化エンジン =====
// ユーザーの短い入力を各AIの役割に合わせた最適なプロンプトに変換する

function optimizePrompt(userInput) {
  // ベースプロンプト：質問を構造化する
  return `以下のテーマについて分析してください：「${userInput}」

あなたの回答には必ず以下を含めること：
1. なぜそう判断したかの根拠
2. 2〜3つの選択肢（それぞれのメリット・デメリット付き）
3. ユーザーが次に考えるべき問いを1つ

回答は具体的・実践的に。抽象論は避ける。`;
}

function buildGPTPrompt(optimized) {
  return `あなたは「発散・仮説出し」の専門家です。

${optimized}

【あなたの役割】
- 可能性を広く展開する
- 一般的でない視点・仮説も含める
- 「そういう考え方もある」という多様な方向性を示す
- 断定せず、可能性として提示する

回答は日本語で、具体的に。`;
}

function buildClaudePrompt(optimized, gptResponse) {
  return `あなたは「批判・論理整理」の専門家です。

元の質問への最適化プロンプト：
${optimized}

GPTの回答：
${gptResponse}

【あなたの役割】
- GPTの回答の穴・矛盾・見落としを具体的に指摘する
- 「こっちは大丈夫？」「これ見落としてない？」という視点でフォローする
- 論理的に整理して、本質的な問題を浮き彫りにする
- 選択肢を絞り込む根拠を示す

回答は日本語で、批判的かつ建設的に。`;
}

function buildGeminiPrompt(optimized, gptResponse, claudeResponse) {
  return `あなたは「統合・結論」の専門家です。

元の質問：${optimized}

GPTの回答（発散）：${gptResponse}
Claudeの回答（批判）：${claudeResponse}

【あなたの役割】
- 両者の議論を統合して最終結論を出す
- 「今すぐ取るべきベストDo」を明確にする
- 根拠と共に、最も現実的なアクションプランを提示する
- 使うたびにユーザーが成長できるような気づきを加える

回答は日本語で、実践的・具体的に。`;
}

// GPT APIを呼び出す関数
async function callGPT(prompt, apiKey) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || "回答の取得に失敗しました。";
}

// Claude APIを呼び出す関数（Artifact経由）
async function callClaude(prompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text || "回答の取得に失敗しました。";
}

// GPTモック（APIキーがない場合）
function mockGPT(q) {
  return `【仮説と可能性の展開】\n\n「${q}」について、考えられる主要な視点をまず広げます。\n\n① 最も直接的なアプローチとして、既存のフレームワークを活用する方法があります。実績があり低リスクですが、革新性に欠ける可能性があります。\n\n② より創造的な観点では、問題の前提そのものを疑うことが有効です。「なぜそれが問題なのか」を再定義することで、まったく別の解決策が見えてくることがあります。\n\n③ データドリブンな観点からは、まず現状の定量的な把握から始めることを推奨します。数字で状況を把握することが次のステップの精度を上げます。\n\n選択肢として：A）即効性を重視するなら①、B）根本解決を目指すなら②、C）確実性を優先するなら③。次に考えるべき問い：「この状況で最も避けたいリスクは何か？」`;
}

// Claudeモック（API失敗時のフォールバック）
function mockClaude(q, gptRes) {
  return `【批判的検討と論理整理】\n\nGPTが提示した方向性を批判的に検討します。\n\n▸ 各選択肢の根本的な問題点：どれも「前提条件」が曖昧です。「何を成功とするか」が定義されていない状態では、どの選択肢も評価できません。\n\n▸ 見落としがちな視点：リソース（時間・お金・人）の制約が考慮されていません。理想論ではなく、現実の制約の中で何が可能かを先に確認する必要があります。\n\n▸ 本質的な問い：「${q}」という問い自体が正しいかを疑ってください。問いを変えることで、まったく別の解決策が見えてくる可能性があります。\n\n【整理】まず「成功の定義」と「制約条件」を明確にしてから選択肢を評価する。これが最初のステップです。`;
}

// Geminiモック
function mockGemini(q, gptRes, claudeRes) {
  return `【統合・結論】\n\nGPTの多角的な仮説とClaudeの批判的精査を踏まえ、実践的な結論を導きます。\n\n✦ ベストDo（今すぐ取るべきアクション）\n両者の議論から見えてきた最優先事項は「成功の定義を明確にすること」です。目標が固まらなければ、どの選択肢も評価できません。\n\n✦ 推奨アクション（3ステップ）\n1. 「この問いで本当に何を解決したいか」を1文で書く（30分）\n2. Claudeが指摘した見落としポイントを確認リストにする\n3. GPTの3選択肢から、Step1の定義に最も近いものを選ぶ\n\n✦ 気づき\n「${q}」という問い自体の精度を上げることが、最速の解決につながります。問いが変われば、答えも変わる。`;
}

const AI_CONFIG = [
  {
    id: "gpt", name: "GPT", role: "発散・仮説出し",
    color: COLORS.gpt, bg: "#10B98115", border: "#10B98140",
    keyLabel: "OpenAI APIキー", keyPlaceholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "claude", name: "Claude", role: "批判・論理整理",
    color: COLORS.claude, bg: "#D9770615", border: "#D9770640",
    keyLabel: "Anthropic APIキー", keyPlaceholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "gemini", name: "Gemini", role: "統合・結論",
    color: COLORS.gemini, bg: "#3B82F615", border: "#3B82F640",
    keyLabel: "Google AIキー", keyPlaceholder: "AIza...",
    docsUrl: "https://aistudio.google.com/app/apikey",
  },
];

const DEMO_QUESTIONS = ["新しいビジネスを始めるべきか？", "AIは人間の仕事を奪うのか？", "どうすれば創造性を高められるか？"];
const MOCK_HISTORY = {
  starred: [{ id: 1, title: "新しいビジネスを始めるべきか？", date: "今日" }, { id: 2, title: "AIは人間の仕事を奪うのか？", date: "昨日" }],
  recent: [{ id: 3, title: "どうすれば創造性を高められるか？", date: "今日" }, { id: 4, title: "チームのモチベーションを上げるには？", date: "昨日" }, { id: 5, title: "マーケティング戦略の立て方", date: "3日前" }],
};

const STORAGE_KEY = "bridge_api_keys";
function loadKeys() { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : { gpt: "", claude: "", gemini: "" }; } catch { return { gpt: "", claude: "", gemini: "" }; } }
function saveKeys(keys) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(keys)); } catch {} }

function TypingText({ text, speed = 12 }) {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);
  useEffect(() => {
    idx.current = 0; setDisplayed("");
    if (!text) return;
    const timer = setInterval(() => { idx.current += 1; setDisplayed(text.slice(0, idx.current)); if (idx.current >= text.length) clearInterval(timer); }, speed);
    return () => clearInterval(timer);
  }, [text]);
  return <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}>{displayed}{displayed.length < (text?.length || 0) && <span style={{ opacity: 0.6, animation: "blink 1s infinite" }}>▋</span>}</span>;
}

function AICard({ ai, message, isActive, isDone, isCollapsed }) {
  const [open, setOpen] = useState(false);
  const [showContent, setShowContent] = useState(false);
  useEffect(() => { if (isActive) { const t = setTimeout(() => setShowContent(true), 200); return () => clearTimeout(t); } setShowContent(false); }, [isActive]);

  if (isCollapsed) {
    const summary = message ? message.slice(0, 80).replace(/\n/g, " ") + "..." : "";
    return (
      <div style={{ marginBottom: 8, borderRadius: 10, border: `1px solid ${open ? ai.border : COLORS.border}`, background: open ? ai.bg : COLORS.surface, overflow: "hidden", transition: "all 0.3s ease" }}>
        <div onClick={() => setOpen(v => !v)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", cursor: "pointer", borderBottom: open ? `1px solid ${ai.border}` : "none" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: ai.color, flexShrink: 0 }} />
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: ai.color, letterSpacing: 1, flexShrink: 0 }}>{ai.name}</span>
          <span style={{ fontSize: 13, color: COLORS.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</span>
          <span style={{ fontSize: 11, color: open ? ai.color : COLORS.muted, fontFamily: "monospace", flexShrink: 0, marginLeft: 8 }}>{open ? "▲ 閉じる" : "▼ 全文"}</span>
        </div>
        {open && <div style={{ padding: "16px 20px", animation: "fadeIn 0.25s ease" }}><p style={{ margin: 0, fontSize: 14, color: COLORS.text, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{message}</p></div>}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16, borderRadius: 12, border: `1px solid ${isActive || isDone ? ai.border : COLORS.border}`, background: isActive || isDone ? ai.bg : COLORS.surface, overflow: "hidden", transition: "all 0.4s ease", opacity: isActive || isDone ? 1 : 0.35, transform: isActive ? "scale(1.01)" : "scale(1)", boxShadow: isActive ? `0 0 24px ${ai.color}30` : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: (isActive || isDone) && showContent && message ? `1px solid ${ai.border}` : "none" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: ai.color, boxShadow: isActive ? `0 0 10px ${ai.color}` : "none", transition: "box-shadow 0.3s" }} />
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: ai.color, letterSpacing: 1 }}>{ai.name}</span>
        <span style={{ fontSize: 12, color: COLORS.muted }}>{ai.role}</span>
        {isActive && <span style={{ marginLeft: "auto", fontSize: 11, color: ai.color, fontFamily: "monospace", animation: "pulse 1.5s infinite" }}>● 思考中...</span>}
        {isDone && <span style={{ marginLeft: "auto", fontSize: 11, color: COLORS.muted, fontFamily: "monospace" }}>✓ 完了</span>}
      </div>
      {(isActive || isDone) && showContent && message && (
        <div style={{ padding: "16px 20px" }}>
          <p style={{ margin: 0, fontSize: 14, color: COLORS.text, lineHeight: 1.75 }}>
            {isActive && !isDone ? <TypingText text={message} speed={12} /> : <span style={{ whiteSpace: "pre-wrap" }}>{message}</span>}
          </p>
        </div>
      )}
    </div>
  );
}

function UnifiedAnswer({ text, visible }) {
  const [show, setShow] = useState(false);
  useEffect(() => { if (visible) { const t = setTimeout(() => setShow(true), 300); return () => clearTimeout(t); } setShow(false); }, [visible]);
  if (!visible) return null;
  return (
    <div style={{ marginTop: 16, borderRadius: 12, border: "1px solid #E2E8F040", background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)", overflow: "hidden", opacity: show ? 1 : 0, transition: "opacity 0.6s ease", boxShadow: "0 0 40px #E2E8F010" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F020", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>⚡</span>
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: COLORS.unified, letterSpacing: 1 }}>BRIDGE</span>
        <span style={{ fontSize: 12, color: COLORS.muted }}>統合回答</span>
      </div>
      {show && <div style={{ padding: "18px 20px" }}><p style={{ margin: 0, fontSize: 14, color: COLORS.text, lineHeight: 1.75 }}><TypingText text={text} speed={10} /></p></div>}
    </div>
  );
}

function OptimizedPromptBadge({ text }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div style={{ marginBottom: 16, borderRadius: 8, border: `1px solid #6B728040`, background: "#6B728010", overflow: "hidden" }}>
      <div onClick={() => setOpen(v => !v)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", cursor: "pointer" }}>
        <span style={{ fontSize: 11, color: COLORS.muted, fontFamily: "monospace" }}>⚙️ BRIDGEがプロンプトを最適化しました</span>
        <span style={{ fontSize: 10, color: COLORS.muted, marginLeft: "auto" }}>{open ? "▲" : "▼ 確認"}</span>
      </div>
      {open && <div style={{ padding: "8px 14px 12px", borderTop: `1px solid #6B728030` }}><p style={{ margin: 0, fontSize: 12, color: COLORS.muted, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{text}</p></div>}
    </div>
  );
}

function ApiKeyModal({ open, onClose, onSave, initialKeys }) {
  const [keys, setKeys] = useState(initialKeys);
  const [showKeys, setShowKeys] = useState({ gpt: false, claude: false, gemini: false });
  const [saved, setSaved] = useState(false);
  useEffect(() => { setKeys(initialKeys); }, [initialKeys]);
  const handleSave = () => { saveKeys(keys); onSave(keys); setSaved(true); setTimeout(() => { setSaved(false); onClose(); }, 800); };
  const hasAnyKey = Object.values(keys).some(k => k.trim().length > 0);
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, width: "100%", maxWidth: 520, overflow: "hidden", animation: "fadeIn 0.3s ease" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 16, color: COLORS.text, letterSpacing: 1 }}>APIキー設定</div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>キーはあなたのブラウザにのみ保存されます</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18, padding: "2px 6px", borderRadius: 6 }}>✕</button>
        </div>
        <div style={{ margin: "16px 24px 0", padding: "10px 14px", background: "#10B98110", border: "1px solid #10B98130", borderRadius: 8, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>🔒</span>
          <span style={{ fontSize: 12, color: "#10B981", lineHeight: 1.6 }}>APIキーはBRIDGEのサーバーに送信されません。あなたのブラウザ内にのみ保存されます。</span>
        </div>
        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {AI_CONFIG.map(ai => (
            <div key={ai.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: ai.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: ai.color, fontFamily: "monospace" }}>{ai.name}</span>
                  <span style={{ fontSize: 12, color: COLORS.muted }}>{ai.keyLabel}</span>
                </div>
                <a href={ai.docsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: COLORS.muted, textDecoration: "none" }}>取得方法 →</a>
              </div>
              <div style={{ position: "relative" }}>
                <input type={showKeys[ai.id] ? "text" : "password"} value={keys[ai.id] || ""} onChange={e => setKeys(prev => ({ ...prev, [ai.id]: e.target.value }))} placeholder={ai.keyPlaceholder} style={{ width: "100%", background: COLORS.bg, border: `1px solid ${keys[ai.id] ? ai.border : COLORS.border}`, borderRadius: 8, padding: "10px 44px 10px 14px", color: COLORS.text, fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} />
                <button onClick={() => setShowKeys(prev => ({ ...prev, [ai.id]: !prev[ai.id] }))} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>{showKeys[ai.id] ? "🙈" : "👁"}</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "0 24px 24px", display: "flex", gap: 12 }}>
          <button onClick={onClose} style={{ flex: 1, background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px", color: COLORS.muted, fontSize: 13, cursor: "pointer" }}>キャンセル</button>
          <button onClick={handleSave} disabled={!hasAnyKey} style={{ flex: 2, background: hasAnyKey ? `linear-gradient(135deg, ${COLORS.gpt}, ${COLORS.gemini})` : COLORS.border, border: "none", borderRadius: 8, padding: "10px", color: hasAnyKey ? "#000" : COLORS.muted, fontSize: 13, fontWeight: 700, cursor: hasAnyKey ? "pointer" : "not-allowed", fontFamily: "monospace" }}>
            {saved ? "✓ 保存しました" : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ open, onClose, onOpenApiSettings }) {
  const [starredOpen, setStarredOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);
  return (
    <>
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200 }} />}
      <div style={{ position: "fixed", top: 0, left: 0, height: "100vh", width: 280, background: COLORS.sidebar, borderRight: `1px solid ${COLORS.border}`, zIndex: 300, transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px", borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, background: COLORS.sidebar, zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 4 }}>{[COLORS.gpt, COLORS.claude, COLORS.gemini].map((c, i) => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />)}</div>
            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: COLORS.text, letterSpacing: 2 }}>BRIDGE</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18, padding: "2px 6px" }}>✕</button>
        </div>
        <div style={{ padding: "12px 12px 8px" }}>
          <button onClick={onClose} style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 14px", color: COLORS.text, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit" }}>
            <span>＋</span><span>新しい議論を始める</span>
          </button>
        </div>
        <div style={{ padding: "4px 12px" }}>
          {[{ icon: "👤", label: "マイページ" }, { icon: "🔑", label: "APIキー設定", action: onOpenApiSettings }, { icon: "⚙️", label: "設定" }].map(({ icon, label, action }) => (
            <div key={label} onClick={action} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, cursor: "pointer", color: COLORS.muted, fontSize: 13, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = COLORS.sidebarHover; e.currentTarget.style.color = COLORS.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = COLORS.muted; }}
            ><span>{icon}</span><span>{label}</span></div>
          ))}
        </div>
        <div style={{ height: 1, background: COLORS.border, margin: "8px 12px" }} />
        <div style={{ padding: "0 12px" }}>
          <div onClick={() => setStarredOpen(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", cursor: "pointer", color: COLORS.muted, fontSize: 12, fontFamily: "monospace" }}>
            <span>⭐ スター付き</span><span style={{ fontSize: 10 }}>{starredOpen ? "▲" : "▼"}</span>
          </div>
          {starredOpen && MOCK_HISTORY.starred.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.sidebarHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 12 }}>⭐</span>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 13, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>{item.date}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 1, background: COLORS.border, margin: "8px 12px" }} />
        <div style={{ padding: "0 12px", flex: 1 }}>
          <div onClick={() => setRecentOpen(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", cursor: "pointer", color: COLORS.muted, fontSize: 12, fontFamily: "monospace" }}>
            <span>🕐 最近の議論</span><span style={{ fontSize: 10 }}>{recentOpen ? "▲" : "▼"}</span>
          </div>
          {recentOpen && MOCK_HISTORY.recent.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.sidebarHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 12, color: COLORS.muted }}>💬</span>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 13, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>{item.date}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.gpt}, ${COLORS.gemini})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#000" }}>H</div>
            <div><div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>Herald</div><div style={{ fontSize: 11, color: COLORS.muted }}>Freeプラン</div></div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState({ gpt: "", claude: "", gemini: "" });
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState("idle");
  const [activeAI, setActiveAI] = useState(null);
  const [doneAIs, setDoneAIs] = useState([]);
  const [messages, setMessages] = useState({});
  const [showUnified, setShowUnified] = useState(false);
  const [currentQ, setCurrentQ] = useState("");
  const [optimizedPrompt, setOptimizedPrompt] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    const keys = loadKeys();
    setApiKeys(keys);
    const hasKey = Object.values(keys).some(k => k.trim().length > 0);
    if (!hasKey) setTimeout(() => setApiModalOpen(true), 800);
  }, []);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [activeAI, showUnified]);

  const hasKeys = Object.values(apiKeys).some(k => k.trim().length > 0);

  const runDebate = async () => {
    if (!question.trim() || phase === "running") return;
    if (!hasKeys) { setApiModalOpen(true); return; }

    const q = question.trim();
    setCurrentQ(q);
    setPhase("running");
    setActiveAI(null); setDoneAIs([]); setMessages({}); setShowUnified(false); setError("");

    // ===== プロンプト自動最適化 =====
    const optimized = optimizePrompt(q);
    setOptimizedPrompt(optimized);

    try {
      // Step 1: GPT（APIキーがあれば本物、なければモック）
      setActiveAI("gpt");
      await new Promise(r => setTimeout(r, 600));
      let gptRes;
      if (apiKeys.gpt?.trim()) {
        try {
          const gptPrompt = buildGPTPrompt(optimized);
          gptRes = await callGPT(gptPrompt, apiKeys.gpt.trim());
        } catch (e) {
          gptRes = mockGPT(q); // フォールバック
        }
      } else {
        gptRes = mockGPT(q);
        await new Promise(r => setTimeout(r, 2000));
      }
      setMessages(prev => ({ ...prev, gpt: gptRes }));
      setDoneAIs(prev => [...prev, "gpt"]);

      // Step 2: Claude（本物のAPIを使用、失敗したらモック）
      setActiveAI("claude");
      await new Promise(r => setTimeout(r, 400));
      let claudeRes;
      try {
        const claudePrompt = buildClaudePrompt(optimized, gptRes);
        claudeRes = await callClaude(claudePrompt);
      } catch (e) {
        claudeRes = mockClaude(q, gptRes);
      }
      setMessages(prev => ({ ...prev, claude: claudeRes }));
      setDoneAIs(prev => [...prev, "claude"]);

      // Step 3: Gemini（モック）
      setActiveAI("gemini");
      await new Promise(r => setTimeout(r, 400));
      const geminiRes = mockGemini(q, gptRes, claudeRes);
      await new Promise(r => setTimeout(r, 1500));
      setMessages(prev => ({ ...prev, gemini: geminiRes }));
      setDoneAIs(prev => [...prev, "gemini"]);

      setActiveAI(null);
      await new Promise(r => setTimeout(r, 600));

      // 統合回答をClaudeで生成（失敗したらシンプルなまとめ）
      let unifiedRes;
      try {
        const unifiedPrompt = `以下の3つのAIの議論を統合して、最終的なベストDoを日本語で200字以内で簡潔にまとめてください。

元の質問：${q}
GPTの回答：${gptRes.slice(0, 300)}
Claudeの回答：${claudeRes.slice(0, 300)}
Geminiの回答：${geminiRes.slice(0, 300)}

BRIDGEの最終統合回答として、ユーザーが今すぐ取るべきアクションを明確に示してください。`;
        unifiedRes = await callClaude(unifiedPrompt);
      } catch (e) {
        unifiedRes = `3つのAIの議論を統合した結論：\n\n「${q}」について、GPT・Claude・Geminiが異なる視点から検討した結果、共通して浮かび上がったのは「問いの精度が解の質を決める」という点です。\n\nまず「この問いで本当に何を解決したいのか」を1文で書き出してください。それだけで、答えの輪郭が見えてきます。`;
      }
      setMessages(prev => ({ ...prev, unified: unifiedRes }));
      setShowUnified(true);
      setPhase("done");

    } catch (err) {
      setError(`エラーが発生しました：${err.message || "不明なエラー"}`);
      setPhase("idle");
    }
  };

  const reset = () => {
    setPhase("idle"); setQuestion(""); setCurrentQ("");
    setActiveAI(null); setDoneAIs([]); setMessages({});
    setShowUnified(false); setOptimizedPrompt(""); setError("");
  };

  const isRunning = phase === "running";
  const isDone = phase === "done";

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Inter', -apple-system, sans-serif", paddingBottom: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder { color: #4B5563; }
        textarea:focus, input:focus { outline: none; }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0D1117; }
        ::-webkit-scrollbar-thumb { background: #21262D; border-radius: 3px; }
        @media (max-width: 640px) {
          .main-pad { padding: 16px 12px 0 !important; }
          .hero-title { font-size: 26px !important; }
          .ai-status { display: none !important; }
        }
      `}</style>

      <ApiKeyModal open={apiModalOpen} onClose={() => setApiModalOpen(false)} onSave={setApiKeys} initialKeys={apiKeys} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpenApiSettings={() => { setSidebarOpen(false); setTimeout(() => setApiModalOpen(true), 300); }} />

      <div style={{ marginLeft: sidebarOpen ? 280 : 0, transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)", minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, background: COLORS.bg, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", borderRadius: 8, color: COLORS.muted, display: "flex", flexDirection: "column", gap: 5 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 20, height: 2, background: "currentColor", borderRadius: 2 }} />)}
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            {[COLORS.gpt, COLORS.claude, COLORS.gemini].map((c, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: isRunning ? `0 0 8px ${c}` : "none", transition: "box-shadow 0.3s" }} />)}
          </div>
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 18, color: COLORS.text, letterSpacing: 2 }}>BRIDGE</span>
          {!hasKeys ? (
            <button onClick={() => setApiModalOpen(true)} style={{ marginLeft: "auto", background: "#D9770615", border: "1px solid #D9770640", borderRadius: 8, padding: "6px 14px", color: COLORS.claude, fontSize: 12, cursor: "pointer", fontFamily: "monospace", display: "flex", alignItems: "center", gap: 6 }}>🔑 APIキーを設定する</button>
          ) : (
            <button onClick={() => setApiModalOpen(true)} style={{ marginLeft: "auto", background: "transparent", border: "none", color: COLORS.muted, fontSize: 12, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.color = COLORS.text}
              onMouseLeave={e => e.currentTarget.style.color = COLORS.muted}
            >🔑</button>
          )}
        </div>

        {/* Main */}
        <div className="main-pad" style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 0" }}>
          {phase === "idle" && (
            <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeIn 0.6s ease" }}>
              <h1 className="hero-title" style={{ fontSize: 36, fontWeight: 700, margin: "0 0 12px", background: `linear-gradient(135deg, ${COLORS.gpt}, ${COLORS.claude}, ${COLORS.gemini})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1 }}>3つのAIが議論する</h1>
              <p style={{ color: COLORS.muted, fontSize: 15, margin: "0 0 32px" }}>GPT・Claude・Geminiが互いの回答を読み、議論して、最良の答えを導く</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {DEMO_QUESTIONS.map(q => (
                  <button key={q} onClick={() => setQuestion(q)} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "8px 16px", color: COLORS.muted, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.target.style.borderColor = "#3B82F6"; e.target.style.color = COLORS.text; }}
                    onMouseLeave={e => { e.target.style.borderColor = COLORS.border; e.target.style.color = COLORS.muted; }}
                  >{q}</button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{ background: COLORS.surface, border: `1px solid ${isRunning ? "#3B82F640" : COLORS.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 28, transition: "border-color 0.3s", boxShadow: isRunning ? "0 0 20px #3B82F615" : "none" }}>
            <textarea value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runDebate(); } }} placeholder="質問を入力してください... (Enter で議論開始)" rows={3} disabled={isRunning} style={{ width: "100%", background: "transparent", border: "none", padding: "16px 18px", color: COLORS.text, fontSize: 15, fontFamily: "inherit", lineHeight: 1.6 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px", borderTop: `1px solid ${COLORS.border}` }}>
              <div className="ai-status" style={{ display: "flex", gap: 16 }}>
                {AI_CONFIG.map(ai => (
                  <span key={ai.id} style={{ fontSize: 12, color: activeAI === ai.id ? ai.color : doneAIs.includes(ai.id) ? ai.color + "80" : COLORS.muted, fontFamily: "monospace", transition: "color 0.3s" }}>
                    {activeAI === ai.id ? "● " : doneAIs.includes(ai.id) ? "✓ " : "○ "}{ai.name}
                  </span>
                ))}
              </div>
              <button onClick={runDebate} disabled={!question.trim() || isRunning} style={{ background: question.trim() && !isRunning ? `linear-gradient(135deg, ${COLORS.gpt}, ${COLORS.gemini})` : COLORS.border, border: "none", borderRadius: 8, padding: "8px 20px", color: question.trim() && !isRunning ? "#000" : COLORS.muted, fontSize: 13, fontWeight: 600, cursor: question.trim() && !isRunning ? "pointer" : "not-allowed", transition: "all 0.2s", fontFamily: "monospace" }}>
                {isRunning ? "議論中..." : "議論開始 →"}
              </button>
            </div>
          </div>

          {error && <div style={{ marginBottom: 16, padding: "12px 16px", background: "#EF444410", border: "1px solid #EF444440", borderRadius: 8, fontSize: 13, color: "#EF4444" }}>{error}</div>}

          {/* Results */}
          {(isRunning || isDone) && (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              {currentQ && <div style={{ marginBottom: 16, padding: "12px 16px", background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 13, color: COLORS.muted }}><span style={{ color: COLORS.text, fontWeight: 500 }}>Q: </span>{currentQ}</div>}

              <OptimizedPromptBadge text={optimizedPrompt} />

              {isRunning && AI_CONFIG.map(ai => (
                <AICard key={ai.id} ai={ai} message={messages[ai.id]} isActive={activeAI === ai.id} isDone={doneAIs.includes(ai.id)} isCollapsed={false} />
              ))}

              {isDone && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: 11, color: COLORS.muted, margin: "0 0 8px", fontFamily: "monospace" }}>▼ 各AIの回答（クリックで全文表示）</p>
                    {AI_CONFIG.map(ai => <AICard key={ai.id} ai={ai} message={messages[ai.id]} isCollapsed={true} />)}
                  </div>
                  <UnifiedAnswer text={messages.unified || ""} visible={showUnified} />
                </>
              )}
            </div>
          )}

          {isDone && (
            <div style={{ textAlign: "center", marginTop: 28 }}>
              <button onClick={reset} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 24px", color: COLORS.muted, fontSize: 13, cursor: "pointer", fontFamily: "monospace", transition: "all 0.2s" }}
                onMouseEnter={e => { e.target.style.borderColor = COLORS.text; e.target.style.color = COLORS.text; }}
                onMouseLeave={e => { e.target.style.borderColor = COLORS.border; e.target.style.color = COLORS.muted; }}
              >新しい質問をする</button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
