import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#0D1117", surface: "#161B22", border: "#21262D",
  gpt: "#10B981", claude: "#D97706", gemini: "#3B82F6",
  unified: "#E2E8F0", muted: "#6B7280", text: "#E2E8F0",
  sidebar: "#0D1117", sidebarHover: "#161B22", accent: "#1A6BB5",
};

const AI_CONFIG = [
  { id: "gpt", name: "GPT", color: COLORS.gpt, bg: "#10B98115", border: "#10B98140", keyPlaceholder: "sk-...", docsUrl: "https://platform.openai.com/api-keys" },
  { id: "claude", name: "Claude", color: COLORS.claude, bg: "#D9770615", border: "#D9770640", keyPlaceholder: "sk-ant-...", docsUrl: "https://console.anthropic.com/settings/keys" },
  { id: "gemini", name: "Gemini", color: COLORS.gemini, bg: "#3B82F615", border: "#3B82F640", keyPlaceholder: "AIza...", docsUrl: "https://aistudio.google.com/app/apikey" },
];

const ROLES = {
  ja: {
    diverge: "発散・仮説出し",
    critique: "批判・深掘り",
    integrate: "統合・結論",
    wildcard: "自由思考",
  },
  en: {
    diverge: "Diverge & Hypothesize",
    critique: "Critique & Deepen",
    integrate: "Integrate & Conclude",
    wildcard: "Free Thinking",
  }
};

const STORAGE_KEYS = {
  apiKeys: "bridge_api_keys",
  history: "bridge_history",
  starred: "bridge_starred",
  lang: "bridge_lang",
  setup: "bridge_setup_done",
  selectedAIs: "bridge_selected_ais",
  aiRoles: "bridge_ai_roles",
  debateMode: "bridge_debate_mode",
};

function ls(key, def) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : def; } catch { return def; } }
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

const DEMO_QUESTIONS = {
  ja: ["新しいビジネスを始めるべきか？", "AIは人間の仕事を奪うのか？", "どうすれば創造性を高められるか？"],
  en: ["Should I start a new business?", "Will AI take over human jobs?", "How can I boost my creativity?"],
};

// ===== API =====
async function callGPT(messages, apiKey) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 800, messages }),
  });
  const d = await r.json();
  if (d.error) {
    const code = d.error.code || "";
    const type = d.error.type || "";
    const msg = d.error.message || "";
    if (code === "insufficient_quota" || type === "insufficient_quota" || msg.includes("quota") || msg.includes("credit") || r.status === 429) {
      throw new Error("CREDIT_EMPTY");
    }
    if (code === "invalid_api_key" || r.status === 401) {
      throw new Error("INVALID_KEY");
    }
    throw new Error(msg || "GPT API Error");
  }
  if (!d.choices?.[0]?.message?.content) throw new Error("GPT_EMPTY");
  return d.choices[0].message.content;
}

async function callClaude(messages) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 800, messages }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text || "";
}

// 汎用AI呼び出し（どのAIでも同じインターフェースで呼べる）
async function callAI(aiId, messages, apiKeys) {
  if (aiId === "claude") {
    return await callClaude(messages);
  } else if (aiId === "gpt" && apiKeys.gpt?.trim()) {
    return await callGPT(messages, apiKeys.gpt.trim());
  } else if (aiId === "gemini" && apiKeys.gemini?.trim()) {
    // Gemini は現在API移行期のためモックにフォールバック
    throw new Error("Gemini API transitioning");
  }
  throw new Error("No API key");
}

// ===== モック（話し言葉版） =====
function getMockResponse(aiId, role, q, prevMessages, lang, round) {
  const isJa = lang === "ja";
  const prevText = prevMessages.length > 0 ? prevMessages[prevMessages.length - 1].content : "";
  const prevName = prevMessages.length > 0 ? prevMessages[prevMessages.length - 1].name : "";

  if (round === 1) {
    // 第1ラウンド：役割に応じた初回回答
    if (role === "diverge") {
      return isJa
        ? `「${q}」について考えてみると、まずいくつかの可能性が浮かびます。\n\n① 既存の方法を活用するアプローチ。リスクは低いですが、新しさには欠けるかもしれません。\n\n② 前提そのものを疑うやり方。「そもそもなぜそれが必要なのか」を問い直すことで、全く別の答えが見えてくることがあります。\n\n③ データから始める方法。まず現状を数字で把握することで、次の一手が明確になります。\n\nどの方向性も一長一短ありますが、個人的には②が最も面白いと思っています。あなたはどう思いますか？`
        : `Thinking about "${q}", a few possibilities come to mind.\n\n① Leverage existing methods — low risk, but may lack novelty.\n\n② Question the premise itself — asking "why is this needed?" can reveal completely different answers.\n\n③ Start with data — quantifying the current state makes the next step clearer.\n\nEach has pros and cons, but personally I find ② most intriguing. What do you think?`;
    } else if (role === "critique") {
      return isJa
        ? `${prevName}の意見、なるほどと思う部分もありますが、気になる点がいくつかあります。\n\n「既存の方法を活用する」という①について、実績があるからといって今の状況に合うとは限りません。文脈が違えば効果も変わります。\n\n②の「前提を疑う」は方向性は正しいと思うのですが、疑うこと自体が目的になってしまうリスクがあります。疑った先に何を得たいのか、明確にする必要があります。\n\n一番気になるのは、「何を成功とするか」がまだ定義されていないことです。そこが曖昧なままでは、どの選択肢も評価できません。`
        : `${prevName} makes some good points, but I have a few concerns.\n\nOn ①, just because something has worked before doesn't mean it fits this context. Different situations demand different approaches.\n\nOn ②, while questioning the premise is directionally correct, there's a risk of making the questioning itself the goal. What do you want to achieve by questioning it?\n\nMy biggest concern: "success" hasn't been defined yet. Without that clarity, none of the options can be properly evaluated.`;
    } else {
      return isJa
        ? `二人の意見を踏まえて、整理してみます。\n\n${prevName}が指摘した通り、まず「成功の定義」を明確にすることが最優先です。それなしには、どの選択肢も評価できません。\n\n具体的にやること：\n1. 「この問いで本当に何を解決したいか」を一文で書く（30分以内）\n2. その定義に基づいて選択肢を評価する\n3. 最小限のアクションから始めて、結果を見ながら調整する\n\n「${q}」に対する今の段階での私の結論は、まず問いの精度を上げることです。問いが変われば、答えも変わります。`
        : `Building on both perspectives, let me synthesize.\n\nAs ${prevName} pointed out, the top priority is defining "success." Without that, no option can be evaluated.\n\nConcrete steps:\n1. Write in one sentence: "What do I really want to solve?" (within 30 min)\n2. Evaluate options based on that definition\n3. Start with the smallest action and adjust based on results\n\nMy current conclusion: first raise the precision of the question. Change the question, and the answer changes too.`;
    }
  } else {
    // 第2ラウンド：結論への反応
    if (role === "diverge") {
      return isJa
        ? `結論を聞いて、概ね同意します。特に「問いの精度を上げる」という点は重要だと思います。\n\nただ一点付け加えるとすれば、完璧な定義を求めすぎると動けなくなるリスクもあります。ある程度の仮説でいいので、まず動いてみる。その経験が問いの精度を自然に上げてくれることも多いです。\n\n「まず定義、それから行動」と「まず行動、そこから定義」の両方のアプローチがあって、状況によって使い分けられると思います。`
        : `I largely agree with the conclusion, especially the point about raising the precision of the question.\n\nI'd add one thing: seeking too perfect a definition can lead to paralysis. Acting on a rough hypothesis often naturally refines the question through experience.\n\nBoth "define first, then act" and "act first, then define" are valid — the right approach depends on the situation.`;
    } else if (role === "critique") {
      return isJa
        ? `結論には同意ですが、「まず動いてみる」という意見には少し慎重になった方がいいと思います。\n\n準備不足のまま動くと、後で修正コストが大きくなる場合があります。特に「${q}」のような問いでは、方向性を間違えると取り返しがつかないこともあります。\n\nとはいえ、定義を完璧にしようとして動けなくなるのも問題。バランスが大切で、「最低限の定義ができたら動く」くらいの感覚がちょうどいいかもしれません。`
        : `I agree with the conclusion, but I'd caution against "just act" too readily.\n\nActing without sufficient preparation can increase correction costs later. For a question like "${q}", going in the wrong direction can be hard to recover from.\n\nThat said, being unable to act due to perfectionism is also a problem. The balance might be: "act once you have a minimum viable definition."`;
    } else {
      return isJa
        ? `両者の意見を聞いて、最終的な結論をまとめます。\n\n「定義してから動く」と「動きながら定義する」、どちらも正しい。状況によって使い分けることが重要です。\n\n今回の「${q}」に対しては：\n・リスクが高い場合 → 最低限の定義をしてから動く\n・リスクが低い場合 → まず動いて、経験から定義を磨く\n\nどちらのアプローチを取るかも、まず「何を怖れているか」を明確にすることで決まります。やはり問いの精度が全ての鍵です。`
        : `Having heard both perspectives, here's my final synthesis.\n\n"Define then act" and "act then define" are both valid — context determines which is right.\n\nFor "${q}" specifically:\n· High-stakes → define minimally first, then act\n· Low-stakes → act first, refine the definition through experience\n\nWhich approach to take also becomes clear once you identify "what are you afraid of?" The precision of the question remains the key to everything.`;
    }
  }
}

// 役割から適切なシステムプロンプトを生成
function buildSystemPrompt(aiId, role, aiName, lang, round, prevSpeaker) {
  const isJa = lang === "ja";
  const roleDesc = {
    diverge: isJa ? "あなたは「発散・仮説出し」担当です。可能性を広く展開し、多角的な視点を提示してください。" : "You are the 'Diverge & Hypothesize' speaker. Expand possibilities widely and present multiple perspectives.",
    critique: isJa ? "あなたは「批判・深掘り」担当です。前の発言の穴や見落としを指摘し、本質を掘り下げてください。" : "You are the 'Critique & Deepen' speaker. Point out flaws and oversights in previous responses and dig into the essence.",
    integrate: isJa ? "あなたは「統合・結論」担当です。議論を統合し、実践的なベストDoを提示してください。" : "You are the 'Integrate & Conclude' speaker. Synthesize the debate and present practical best actions.",
    wildcard: isJa ? "あなたは「自由思考」担当です。型にとらわれない視点で意見を述べてください。" : "You are the 'Free Thinking' speaker. Share perspectives that break conventional molds.",
  };

  const roundContext = round === 1
    ? (isJa ? "これは議論の第1ラウンドです。" : "This is the first round of debate.")
    : (isJa ? `これは第${round}ラウンドです。前の結論に対して同意・反論・補足してください。` : `This is round ${round}. React to the previous conclusion with agreement, pushback, or additions.`);

  return isJa
    ? `${roleDesc[role] || roleDesc.diverge}\n\n${roundContext}\n\n重要：\n・話し言葉で、自然に会話するように答えてください\n・「〜です。〜ます。」より「〜と思います」「〜かもしれません」のような表現を使う\n・前の発言者の名前を時々使って、対話感を出してください\n・200〜300字程度で答えてください`
    : `${roleDesc[role] || roleDesc.diverge}\n\n${roundContext}\n\nImportant:\n· Speak naturally and conversationally\n· Use expressions like "I think," "perhaps," "it seems to me"\n· Occasionally reference the previous speaker by name for dialogue feel\n· Keep responses to 150-250 words`;
}

// ===== チャットメッセージ型 =====
// { id, aiId, name, color, role, content, timestamp, round }

// ===== TypingText =====
function TypingText({ text, speed = 15, onDone }) {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);
  useEffect(() => {
    idx.current = 0; setDisplayed("");
    if (!text) return;
    const t = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) { clearInterval(t); if (onDone) onDone(); }
    }, speed);
    return () => clearInterval(t);
  }, [text]);
  return <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>{displayed}{displayed.length < (text?.length || 0) && <span style={{ opacity: 0.6, animation: "blink 1s infinite" }}>▋</span>}</span>;
}

// ===== チャットバブル =====
function ChatBubble({ message, isLatest, lang }) {
  const ai = AI_CONFIG.find(a => a.id === message.aiId);
  const [showFull, setShowFull] = useState(isLatest);
  const isJa = lang === "ja";

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 20, animation: "fadeUp 0.4s ease" }}>
      {/* アバター */}
      <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: ai?.bg || COLORS.surface, border: `2px solid ${ai?.color || COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontWeight: 700, fontSize: 12, color: ai?.color || COLORS.text, marginTop: 4 }}>
        {message.name.slice(0, 2)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 名前・役割 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: ai?.color || COLORS.text }}>{message.name}</span>
          <span style={{ fontSize: 11, color: COLORS.muted }}>{message.role}</span>
          {message.round > 1 && <span style={{ fontSize: 10, color: COLORS.muted, fontFamily: "monospace" }}>R{message.round}</span>}
        </div>

        {/* バブル */}
        <div style={{ background: COLORS.surface, border: `1px solid ${isLatest ? (ai?.border || COLORS.border) : COLORS.border}`, borderRadius: "4px 12px 12px 12px", padding: "14px 16px", boxShadow: isLatest ? `0 0 16px ${ai?.color || "transparent"}20` : "none", transition: "all 0.3s" }}>
          <p style={{ margin: 0, fontSize: 14, color: COLORS.text, lineHeight: 1.8 }}>
            {isLatest
              ? <TypingText text={message.content} speed={14} />
              : showFull
                ? <span style={{ whiteSpace: "pre-wrap" }}>{message.content}</span>
                : <span style={{ whiteSpace: "pre-wrap" }}>{message.content.slice(0, 100)}...</span>
            }
          </p>
          {!isLatest && message.content.length > 100 && (
            <button onClick={() => setShowFull(v => !v)} style={{ marginTop: 8, background: "none", border: "none", color: COLORS.muted, fontSize: 12, cursor: "pointer", fontFamily: "monospace", padding: 0 }}>
              {showFull ? (isJa ? "▲ 折りたたむ" : "▲ Collapse") : (isJa ? "▼ 続きを読む" : "▼ Read more")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== 思考中バブル =====
function ThinkingBubble({ aiId, name, color }) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 20, animation: "fadeUp 0.4s ease" }}>
      <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: `${color}15`, border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontWeight: 700, fontSize: 12, color, marginTop: 4 }}>
        {name.slice(0, 2)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color }}>{name}</span>
        </div>
        <div style={{ background: COLORS.surface, border: `1px solid ${color}40`, borderRadius: "4px 12px 12px 12px", padding: "14px 16px", display: "inline-flex", gap: 6, alignItems: "center" }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: color, animation: `pulse 1.2s ${i * 0.2}s infinite` }} />)}
        </div>
      </div>
    </div>
  );
}

// ===== 統合回答バブル =====
function UnifiedBubble({ content, visible, lang }) {
  const [show, setShow] = useState(false);
  const isJa = lang === "ja";
  useEffect(() => { if (visible) { const t = setTimeout(() => setShow(true), 400); return () => clearTimeout(t); } }, [visible]);
  if (!visible) return null;
  return (
    <div style={{ marginTop: 8, marginBottom: 20, animation: "fadeUp 0.5s ease", opacity: show ? 1 : 0, transition: "opacity 0.5s" }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #1E293B, #0F172A)", border: "2px solid #E2E8F040", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginTop: 4 }}>⚡</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: COLORS.unified }}>BRIDGE</span>
            <span style={{ fontSize: 11, color: COLORS.muted }}>{isJa ? "統合回答" : "Unified Answer"}</span>
          </div>
          <div style={{ background: "linear-gradient(135deg, #1E293B, #0F172A)", border: "1px solid #E2E8F030", borderRadius: "4px 12px 12px 12px", padding: "16px 18px", boxShadow: "0 0 24px #E2E8F008" }}>
            {show && <p style={{ margin: 0, fontSize: 14, color: COLORS.text, lineHeight: 1.8 }}><TypingText text={content} speed={12} /></p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== 次の問い =====
function NextQuestions({ questions, onSelect, loading, lang }) {
  const isJa = lang === "ja";
  if (loading) return <div style={{ padding: "14px 18px", borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.surface, marginBottom: 16 }}><span style={{ fontSize: 12, color: COLORS.muted, fontFamily: "monospace", animation: "pulse 1.5s infinite" }}>{isJa ? "💭 次の問いを生成中..." : "💭 Generating next questions..."}</span></div>;
  if (!questions?.length) return null;
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${COLORS.accent}30`, background: `${COLORS.accent}08`, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${COLORS.accent}20` }}><span style={{ fontSize: 12, color: COLORS.accent, fontFamily: "monospace", fontWeight: 600 }}>{isJa ? "💡 BRIDGEからの次の問い" : "💡 Next Questions from BRIDGE"}</span></div>
      <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {questions.map((q, i) => (
          <button key={i} onClick={() => onSelect(q)} style={{ padding: "10px 14px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 13, cursor: "pointer", textAlign: "left", lineHeight: 1.5, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.background = `${COLORS.accent}10`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.background = COLORS.bg; }}
          ><span style={{ color: COLORS.accent, marginRight: 8, fontFamily: "monospace" }}>{i + 1}.</span>{q}</button>
        ))}
      </div>
    </div>
  );
}

// ===== APIキーモーダル =====
function ApiKeyModal({ open, onClose, onSave, initialKeys, selectedAIs, lang }) {
  const [keys, setKeys] = useState(initialKeys);
  const [showKeys, setShowKeys] = useState({});
  const [saved, setSaved] = useState(false);
  const isJa = lang === "ja";
  useEffect(() => setKeys(initialKeys), [initialKeys]);
  const handleSave = () => { lsSet(STORAGE_KEYS.apiKeys, keys); onSave(keys); setSaved(true); setTimeout(() => { setSaved(false); onClose(); }, 800); };
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, width: "100%", maxWidth: 480, overflow: "hidden", animation: "fadeIn 0.3s" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 16, color: COLORS.text }}>{isJa ? "APIキー設定" : "API Key Settings"}</div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{isJa ? "キーはブラウザにのみ保存されます" : "Keys stored only in your browser"}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ margin: "16px 24px 0", padding: "10px 14px", background: "#10B98110", border: "1px solid #10B98130", borderRadius: 8, display: "flex", gap: 8 }}>
          <span>🔒</span><span style={{ fontSize: 12, color: "#10B981", lineHeight: 1.6 }}>{isJa ? "APIキーはBRIDGEのサーバーに送信されません。" : "API keys are never sent to BRIDGE servers."}</span>
        </div>
        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {AI_CONFIG.filter(ai => selectedAIs.includes(ai.id)).map(ai => (
            <div key={ai.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: ai.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: ai.color, fontFamily: "monospace" }}>{ai.name}</span>
                </div>
                <a href={ai.docsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: COLORS.muted, textDecoration: "none" }}>{isJa ? "取得方法 →" : "Get Key →"}</a>
              </div>
              <div style={{ position: "relative" }}>
                <input type={showKeys[ai.id] ? "text" : "password"} value={keys[ai.id] || ""} onChange={e => setKeys(p => ({ ...p, [ai.id]: e.target.value }))} placeholder={ai.keyPlaceholder} style={{ width: "100%", background: COLORS.bg, border: `1px solid ${keys[ai.id] ? ai.border : COLORS.border}`, borderRadius: 8, padding: "10px 44px 10px 14px", color: COLORS.text, fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} />
                <button onClick={() => setShowKeys(p => ({ ...p, [ai.id]: !p[ai.id] }))} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>{showKeys[ai.id] ? "🙈" : "👁"}</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "0 24px 8px" }}>
          <button onClick={onClose} style={{ width: "100%", padding: "10px", background: "#6B728010", border: `1px solid #6B728030`, borderRadius: 8, color: COLORS.muted, fontSize: 12, cursor: "pointer" }}>{isJa ? "🎮 デモモードで試す" : "🎮 Try Demo Mode"}</button>
        </div>
        <div style={{ padding: "8px 24px 24px" }}>
          <button onClick={handleSave} disabled={!selectedAIs.some(id => keys[id]?.trim())} style={{ width: "100%", background: selectedAIs.some(id => keys[id]?.trim()) ? `linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})` : COLORS.border, border: "none", borderRadius: 8, padding: "10px", color: selectedAIs.some(id => keys[id]?.trim()) ? "#000" : COLORS.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}>
            {saved ? "✓" : ""} {isJa ? "保存する" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== マイページ =====
function MyPage({ open, onClose, lang, setLang, apiKeys, selectedAIs, onOpenApiSettings, history, starred }) {
  const isJa = lang === "ja";
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, width: "100%", maxWidth: 440, maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column", animation: "fadeIn 0.3s" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 16, color: COLORS.text }}>{isJa ? "マイページ" : "My Page"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", gap: 16 }}>
              {[{ label: isJa ? "議論数" : "Debates", value: history.length }, { label: isJa ? "スター" : "Starred", value: starred.length }].map(s => (
                <div key={s.label} style={{ flex: 1, padding: "14px", background: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.accent }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>{isJa ? "言語" : "Language"}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ id: "ja", label: "🇯🇵 日本語" }, { id: "en", label: "🇺🇸 English" }].map(l => (
                <button key={l.id} onClick={() => { setLang(l.id); lsSet(STORAGE_KEYS.lang, l.id); }} style={{ flex: 1, padding: "10px", background: lang === l.id ? "#1A6BB520" : COLORS.bg, border: `1px solid ${lang === l.id ? COLORS.accent : COLORS.border}`, borderRadius: 8, color: lang === l.id ? COLORS.accent : COLORS.muted, fontSize: 13, cursor: "pointer" }}>{l.label}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: "16px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>{isJa ? "APIキー" : "API Keys"}</div>
            {AI_CONFIG.filter(ai => selectedAIs.includes(ai.id)).map(ai => (
              <div key={ai.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: COLORS.bg, borderRadius: 8, border: `1px solid ${apiKeys[ai.id] ? ai.border : COLORS.border}`, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: apiKeys[ai.id] ? ai.color : COLORS.border }} />
                <span style={{ fontSize: 13, color: apiKeys[ai.id] ? ai.color : COLORS.muted, fontFamily: "monospace", fontWeight: 600 }}>{ai.name}</span>
                <span style={{ fontSize: 11, color: COLORS.muted, marginLeft: "auto" }}>{apiKeys[ai.id] ? "✓ 設定済み" : "未設定"}</span>
              </div>
            ))}
            <button onClick={() => { onClose(); setTimeout(onOpenApiSettings, 300); }} style={{ width: "100%", marginTop: 8, padding: "10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.muted, fontSize: 13, cursor: "pointer" }}>🔑 {isJa ? "APIキーを変更" : "Change API Keys"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== セットアップウィザード（4ステップ） =====
function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [lang, setLangState] = useState("ja");
  const [selectedAIs, setSelectedAIs] = useState(["gpt", "claude", "gemini"]);
  const [keys, setKeys] = useState({ gpt: "", claude: "", gemini: "" });
  const [showKeys, setShowKeys] = useState({});
  const [debateMode, setDebateMode] = useState("deep");
  const isJa = lang === "ja";

  const toggleAI = (id) => setSelectedAIs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleComplete = (skipKeys = false) => {
    lsSet(STORAGE_KEYS.lang, lang);
    if (!skipKeys) lsSet(STORAGE_KEYS.apiKeys, keys);
    lsSet(STORAGE_KEYS.selectedAIs, selectedAIs);
    lsSet(STORAGE_KEYS.debateMode, debateMode);
    lsSet(STORAGE_KEYS.setup, true);
    onComplete(lang, skipKeys ? ls(STORAGE_KEYS.apiKeys, {}) : keys, selectedAIs, debateMode);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: COLORS.bg, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: 480, animation: "fadeIn 0.5s", paddingBottom: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 14 }}>
            {[COLORS.gpt, COLORS.claude, COLORS.gemini].map((c, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c, boxShadow: `0 0 12px ${c}` }} />)}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 36, fontWeight: 700, color: COLORS.text, letterSpacing: 4 }}>BRIDGE</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 18 }}>
            {[1, 2, 3, 4].map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: step >= s ? COLORS.accent : COLORS.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: step >= s ? "#fff" : COLORS.muted, transition: "all 0.3s" }}>{s}</div>
                {s < 4 && <div style={{ width: 20, height: 2, background: step > s ? COLORS.accent : COLORS.border, transition: "all 0.3s" }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: 言語 */}
        {step === 1 && (
          <div style={{ animation: "fadeIn 0.3s" }}>
            <h2 style={{ textAlign: "center", fontSize: 20, fontWeight: 700, color: COLORS.text, margin: "0 0 8px" }}>{isJa ? "言語を選択" : "Select Language"}</h2>
            <p style={{ textAlign: "center", fontSize: 13, color: COLORS.muted, margin: "0 0 28px" }}>{isJa ? "BRIDGEで使用する言語を選んでください" : "Choose the language for BRIDGE"}</p>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              {[{ id: "ja", label: "🇯🇵 日本語" }, { id: "en", label: "🇺🇸 English" }].map(l => (
                <button key={l.id} onClick={() => setLangState(l.id)} style={{ flex: 1, padding: "20px", background: lang === l.id ? "#1A6BB520" : COLORS.surface, border: `2px solid ${lang === l.id ? COLORS.accent : COLORS.border}`, borderRadius: 12, color: lang === l.id ? COLORS.accent : COLORS.muted, fontSize: 16, cursor: "pointer", fontWeight: lang === l.id ? 700 : 400, transition: "all 0.2s" }}>{l.label}</button>
              ))}
            </div>
            <button onClick={() => setStep(2)} style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})`, border: "none", borderRadius: 10, color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{isJa ? "次へ →" : "Next →"}</button>
          </div>
        )}

        {/* Step 2: AI選択 */}
        {step === 2 && (
          <div style={{ animation: "fadeIn 0.3s" }}>
            <h2 style={{ textAlign: "center", fontSize: 20, fontWeight: 700, color: COLORS.text, margin: "0 0 8px" }}>{isJa ? "使うAIを選ぶ" : "Select Your AIs"}</h2>
            <p style={{ textAlign: "center", fontSize: 13, color: COLORS.muted, margin: "0 0 6px" }}>{isJa ? "1つでもOK。後から変更できます。" : "Even one is fine. Change anytime."}</p>
            <p style={{ textAlign: "center", fontSize: 12, color: COLORS.accent, margin: "0 0 20px", fontFamily: "monospace" }}>{isJa ? `最大${AI_CONFIG.length}つのAIが議論します` : `Up to ${AI_CONFIG.length} AIs will debate`}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {AI_CONFIG.map(ai => {
                const sel = selectedAIs.includes(ai.id);
                return (
                  <div key={ai.id} onClick={() => toggleAI(ai.id)} style={{ padding: "14px 18px", background: sel ? ai.bg : COLORS.surface, border: `2px solid ${sel ? ai.color : COLORS.border}`, borderRadius: 12, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${sel ? ai.color : COLORS.border}`, background: sel ? ai.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {sel && <span style={{ color: "#000", fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: sel ? ai.color : COLORS.muted, marginBottom: 2 }}>{ai.name}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted }}>{ai.id === "gpt" ? (isJa ? "アイデアを広げる" : "Expands ideas") : ai.id === "claude" ? (isJa ? "深く掘り下げる" : "Digs deeper") : (isJa ? "答えをまとめる" : "Synthesizes answers")}</div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: ai.color, opacity: sel ? 1 : 0.2 }} />
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "8px 14px", background: "#1A6BB510", border: "1px solid #1A6BB530", borderRadius: 8, marginBottom: 14, fontSize: 12, color: "#60A5FA", textAlign: "center" }}>
              {selectedAIs.length === 0 ? (isJa ? "⚠️ 1つ以上選んでください" : "⚠️ Select at least one") : (isJa ? `✓ ${selectedAIs.length}つのAIで議論します` : `✓ ${selectedAIs.length} AI${selectedAIs.length > 1 ? "s" : ""} will debate`)}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(1)} style={{ padding: "12px 18px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.muted, fontSize: 13, cursor: "pointer" }}>{isJa ? "← 戻る" : "← Back"}</button>
              <button onClick={() => setStep(3)} disabled={selectedAIs.length === 0} style={{ flex: 1, padding: "12px", background: selectedAIs.length > 0 ? `linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})` : COLORS.border, border: "none", borderRadius: 10, color: selectedAIs.length > 0 ? "#000" : COLORS.muted, fontSize: 14, fontWeight: 700, cursor: selectedAIs.length > 0 ? "pointer" : "not-allowed" }}>{isJa ? "次へ →" : "Next →"}</button>
            </div>
          </div>
        )}

        {/* Step 3: APIキー */}
        {step === 3 && (
          <div style={{ animation: "fadeIn 0.3s" }}>
            <h2 style={{ textAlign: "center", fontSize: 20, fontWeight: 700, color: COLORS.text, margin: "0 0 8px" }}>{isJa ? "APIキーを入力" : "Enter API Keys"}</h2>
            <p style={{ textAlign: "center", fontSize: 13, color: COLORS.muted, margin: "0 0 20px" }}>{isJa ? "選んだAIのキーだけ入力してください" : "Enter keys only for your selected AIs"}</p>
            <div style={{ background: "#10B98110", border: "1px solid #10B98130", borderRadius: 8, padding: "10px 14px", marginBottom: 18, display: "flex", gap: 8 }}>
              <span>🔒</span><span style={{ fontSize: 12, color: "#10B981", lineHeight: 1.6 }}>{isJa ? "キーはブラウザにのみ保存。サーバーには送信しません。" : "Keys stored only in your browser. Never sent to servers."}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              {AI_CONFIG.filter(ai => selectedAIs.includes(ai.id)).map(ai => (
                <div key={ai.id}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: ai.color }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: ai.color, fontFamily: "monospace" }}>{ai.name}</span>
                    </div>
                    <a href={ai.docsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: COLORS.muted, textDecoration: "none" }}>{isJa ? "取得方法 →" : "Get Key →"}</a>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input type={showKeys[ai.id] ? "text" : "password"} value={keys[ai.id] || ""} onChange={e => setKeys(p => ({ ...p, [ai.id]: e.target.value }))} placeholder={ai.keyPlaceholder} style={{ width: "100%", background: COLORS.surface, border: `1px solid ${keys[ai.id] ? ai.border : COLORS.border}`, borderRadius: 8, padding: "10px 44px 10px 14px", color: COLORS.text, fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} />
                    <button onClick={() => setShowKeys(p => ({ ...p, [ai.id]: !p[ai.id] }))} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>{showKeys[ai.id] ? "🙈" : "👁"}</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button onClick={() => setStep(2)} style={{ padding: "12px 18px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.muted, fontSize: 13, cursor: "pointer" }}>{isJa ? "← 戻る" : "← Back"}</button>
              <button onClick={() => setStep(4)} disabled={!selectedAIs.some(id => keys[id]?.trim())} style={{ flex: 1, padding: "12px", background: selectedAIs.some(id => keys[id]?.trim()) ? `linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})` : COLORS.border, border: "none", borderRadius: 10, color: selectedAIs.some(id => keys[id]?.trim()) ? "#000" : COLORS.muted, fontSize: 14, fontWeight: 700, cursor: selectedAIs.some(id => keys[id]?.trim()) ? "pointer" : "not-allowed" }}>{isJa ? "次へ →" : "Next →"}</button>
            </div>
            <button onClick={() => setStep(4)} style={{ width: "100%", padding: "10px", background: "#6B728010", border: `1px solid #6B728030`, borderRadius: 10, color: COLORS.muted, fontSize: 12, cursor: "pointer" }}>{isJa ? "🎮 スキップしてデモモードで試す" : "🎮 Skip and try demo mode"}</button>
          </div>
        )}

        {/* Step 4: 思考モード */}
        {step === 4 && (
          <div style={{ animation: "fadeIn 0.3s" }}>
            <h2 style={{ textAlign: "center", fontSize: 20, fontWeight: 700, color: COLORS.text, margin: "0 0 8px" }}>{isJa ? "思考モードを選ぶ" : "Choose Debate Mode"}</h2>
            <p style={{ textAlign: "center", fontSize: 13, color: COLORS.muted, margin: "0 0 24px" }}>{isJa ? "後からいつでも変更できます" : "Change anytime later"}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {[
                { id: "deep", icon: "🔍", title: isJa ? "ディープモード" : "Deep Mode", desc: isJa ? "AIが順番に議論。前の発言を踏まえて深掘り。深さ重視。" : "AIs debate sequentially, each building on the last. Depth-focused." },
                { id: "blast", icon: "💡", title: isJa ? "ブレストモード" : "Brainstorm Mode", desc: isJa ? "AIが同時に考える。幅広いアイデアを展開。スピード重視。" : "AIs think simultaneously. Wide-ranging ideas. Speed-focused." },
              ].map(m => (
                <div key={m.id} onClick={() => setDebateMode(m.id)} style={{ padding: "18px", background: debateMode === m.id ? "#1A6BB515" : COLORS.surface, border: `2px solid ${debateMode === m.id ? COLORS.accent : COLORS.border}`, borderRadius: 12, cursor: "pointer", transition: "all 0.2s", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 26, flexShrink: 0 }}>{m.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: debateMode === m.id ? COLORS.accent : COLORS.text, marginBottom: 4 }}>{m.title}</div>
                    <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>{m.desc}</div>
                  </div>
                  {debateMode === m.id && <div style={{ color: COLORS.accent, fontSize: 18, flexShrink: 0 }}>✓</div>}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(3)} style={{ padding: "12px 18px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.muted, fontSize: 13, cursor: "pointer" }}>{isJa ? "← 戻る" : "← Back"}</button>
              <button onClick={() => handleComplete(false)} style={{ flex: 1, padding: "12px", background: `linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})`, border: "none", borderRadius: 10, color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                {isJa ? "BRIDGEを始める 🌉" : "Start BRIDGE 🌉"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== サイドバー =====
function Sidebar({ open, onClose, onOpenApiSettings, onOpenMyPage, lang, history, starred, onToggleStar, onSelectHistory }) {
  const [starredOpen, setStarredOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);
  const isJa = lang === "ja";
  const starredItems = history.filter(h => starred.includes(h.id));
  return (
    <>
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200 }} />}
      <div style={{ position: "fixed", top: 0, left: 0, height: "100vh", width: 280, background: COLORS.sidebar, borderRight: `1px solid ${COLORS.border}`, zIndex: 300, transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px", borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, background: COLORS.sidebar, zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 4 }}>{[COLORS.gpt, COLORS.claude, COLORS.gemini].map((c, i) => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />)}</div>
            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: COLORS.text, letterSpacing: 2 }}>BRIDGE</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: "12px 12px 8px" }}>
          <button onClick={onClose} style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 14px", color: COLORS.text, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit" }}>
            <span>＋</span><span>{isJa ? "新しい議論を始める" : "Start New Debate"}</span>
          </button>
        </div>
        <div style={{ padding: "4px 12px" }}>
          {[
            { icon: "👤", label: isJa ? "マイページ" : "My Page", action: () => { onClose(); setTimeout(onOpenMyPage, 300); } },
            { icon: "🔑", label: isJa ? "APIキー設定" : "API Keys", action: () => { onClose(); setTimeout(onOpenApiSettings, 300); } },
          ].map(({ icon, label, action }) => (
            <div key={label} onClick={action} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, cursor: "pointer", color: COLORS.muted, fontSize: 13, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = COLORS.sidebarHover; e.currentTarget.style.color = COLORS.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = COLORS.muted; }}
            ><span>{icon}</span><span>{label}</span></div>
          ))}
        </div>
        <div style={{ height: 1, background: COLORS.border, margin: "8px 12px" }} />
        <div style={{ padding: "0 12px" }}>
          <div onClick={() => setStarredOpen(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", cursor: "pointer", color: COLORS.muted, fontSize: 12, fontFamily: "monospace" }}>
            <span>⭐ {isJa ? "スター付き" : "Starred"}</span><span style={{ fontSize: 10 }}>{starredOpen ? "▲" : "▼"}</span>
          </div>
          {starredOpen && (starredItems.length === 0 ? <div style={{ padding: "8px 10px", fontSize: 12, color: COLORS.border }}>{isJa ? "まだありません" : "None yet"}</div> : starredItems.map(item => (
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
        <div style={{ padding: "0 12px", flex: 1 }}>
          <div onClick={() => setRecentOpen(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", cursor: "pointer", color: COLORS.muted, fontSize: 12, fontFamily: "monospace" }}>
            <span>🕐 {isJa ? "最近の議論" : "Recent Debates"}</span><span style={{ fontSize: 10 }}>{recentOpen ? "▲" : "▼"}</span>
          </div>
          {recentOpen && (history.length === 0 ? <div style={{ padding: "8px 10px", fontSize: 12, color: COLORS.border }}>{isJa ? "まだ議論がありません" : "No debates yet"}</div> : history.map(item => (
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
            <div><div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>Herald</div><div style={{ fontSize: 11, color: COLORS.muted }}>{isJa ? "Freeプラン" : "Free Plan"}</div></div>
          </div>
        </div>
      </div>
    </>
  );
}

// ===== メインアプリ =====
export default function App() {
  const [setupDone, setSetupDone] = useState(ls(STORAGE_KEYS.setup, false));
  const [lang, setLang] = useState(ls(STORAGE_KEYS.lang, "ja"));
  const [selectedAIs, setSelectedAIs] = useState(ls(STORAGE_KEYS.selectedAIs, ["gpt", "claude", "gemini"]));
  const [apiKeys, setApiKeys] = useState(ls(STORAGE_KEYS.apiKeys, {}));
  const [mode, setMode] = useState(ls(STORAGE_KEYS.debateMode, "deep"));
  const [aiRoles, setAiRoles] = useState(ls(STORAGE_KEYS.aiRoles, { gpt: "diverge", claude: "critique", gemini: "integrate" }));

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [myPageOpen, setMyPageOpen] = useState(false);

  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | running | done
  const [chatMessages, setChatMessages] = useState([]); // チャット履歴
  const [thinkingAI, setThinkingAI] = useState(null); // 現在思考中のAI
  const [showUnified, setShowUnified] = useState(false);
  const [unifiedText, setUnifiedText] = useState("");
  const [currentQ, setCurrentQ] = useState("");
  const [round, setRound] = useState(1);
  const [nextQuestions, setNextQuestions] = useState([]);
  const [nextQLoading, setNextQLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(ls(STORAGE_KEYS.history, []));
  const [starred, setStarred] = useState(ls(STORAGE_KEYS.starred, []));
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const isJa = lang === "ja";

  // 選択かつAPIキー設定済みのAIのみ（デモモードはClaudeのみ動く）
  const activeAIs = AI_CONFIG.filter(ai => {
    if (!selectedAIs.includes(ai.id)) return false;
    // Claudeはキー不要（Artifact経由で動く）
    if (ai.id === "claude") return true;
    // 他はAPIキーが設定されているもののみ
    return apiKeys[ai.id]?.trim().length > 0;
  });

  // 選択済みAIのみで順番パターンを生成
  const [order, setOrder] = useState(selectedAIs);
  useEffect(() => {
    // selectedAIsが変わったら、orderも選択済みAIのみに更新
    setOrder(prev => {
      const filtered = prev.filter(id => selectedAIs.includes(id));
      const missing = selectedAIs.filter(id => !filtered.includes(id));
      return [...filtered, ...missing];
    });
  }, [selectedAIs.join(",")]);

  const getOrderPatterns = () => {
    if (activeAIs.length <= 1) return [];
    if (activeAIs.length === 2) {
      return [
        [activeAIs[0].id, activeAIs[1].id],
        [activeAIs[1].id, activeAIs[0].id],
      ];
    }
    const ids = activeAIs.map(a => a.id);
    return [
      [ids[0], ids[1], ids[2]],
      [ids[0], ids[2], ids[1]],
      [ids[1], ids[0], ids[2]],
      [ids[1], ids[2], ids[0]],
      [ids[2], ids[0], ids[1]],
      [ids[2], ids[1], ids[0]],
    ];
  };

  useEffect(() => { if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, thinkingAI, showUnified]);

  const addMessage = (msg) => setChatMessages(prev => [...prev, msg]);

  const runDebate = async (q, currentRound = 1) => {
    if (!q.trim() || phase === "running") return;
    setCurrentQ(q);
    setPhase("running");
    setChatMessages([]);
    setThinkingAI(null);
    setShowUnified(false);
    setUnifiedText("");
    setError("");
    setNextQuestions([]);

    const debateOrder = order.filter(id => selectedAIs.includes(id));
    if (debateOrder.length === 0) { setError(isJa ? "AIが選択されていません" : "No AI selected"); setPhase("idle"); return; }

    const allMessages = []; // 全チャット履歴（API呼び出し用）
    const mockUsed = {}; // モック使用フラグ

    try {
      // ===== 第1ラウンド =====
      for (let i = 0; i < debateOrder.length; i++) {
        const aiId = debateOrder[i];
        const ai = AI_CONFIG.find(a => a.id === aiId);
        const role = aiRoles[aiId] || (i === 0 ? "diverge" : i === debateOrder.length - 1 ? "integrate" : "critique");
        const roleName = ROLES[lang][role];

        setThinkingAI(aiId);
        await new Promise(r => setTimeout(r, 600));

        const prevSpeaker = allMessages.length > 0 ? allMessages[allMessages.length - 1].name : "";

        // 実際のAPI回答のみ参照（モック回答は除外）
        const realMessages = allMessages.filter(m => !mockUsed[m.aiId]);

        const systemPrompt = buildSystemPrompt(aiId, role, ai.name, lang, 1, prevSpeaker);

        // 実際の回答があれば議論として渡す、モックしかなければ質問のみ
        const userContent = realMessages.length === 0
          ? (isJa ? `質問：「${q}」\n\nこの質問について、あなたの役割に従って具体的に答えてください。` : `Question: "${q}"\n\nAnswer this question specifically according to your role.`)
          : (isJa ? `質問：「${q}」\n\nここまでの議論：\n${realMessages.map(m => `${m.name}：${m.content}`).join("\n\n")}\n\nあなたの意見を述べてください。` : `Question: "${q}"\n\nDiscussion so far:\n${realMessages.map(m => `${m.name}: ${m.content}`).join("\n\n")}\n\nShare your perspective.`);

        let content;
        try {
          content = await callAI(aiId, [
            { role: "user", content: `${systemPrompt}\n\n${userContent}` }
          ], apiKeys);
          mockUsed[aiId] = false;
        } catch(e) {
          if (e.message === "CREDIT_EMPTY") {
            setError(isJa
              ? `⚠️ ${ai.name}のAPIクレジットが不足しています。OpenAIのダッシュボードでチャージしてください。デモ回答で続行します。`
              : `⚠️ ${ai.name} API credit is empty. Please add credits at the OpenAI dashboard. Continuing with demo response.`
            );
          } else if (e.message === "INVALID_KEY") {
            setError(isJa
              ? `⚠️ ${ai.name}のAPIキーが無効です。設定を確認してください。`
              : `⚠️ ${ai.name} API key is invalid. Please check your settings.`
            );
          }
          mockUsed[aiId] = true;
          content = getMockResponse(aiId, role, q, allMessages, lang, 1);
        }

        const msg = { id: Date.now() + i, aiId, name: ai.name, color: ai.color, role: roleName, content, round: 1 };
        allMessages.push(msg);
        setThinkingAI(null);
        addMessage(msg);
        await new Promise(r => setTimeout(r, 300));
      }

      // ===== 第2ラウンド（結論への反応）=====
      if (debateOrder.length >= 2) {
        for (let i = 0; i < Math.min(debateOrder.length - 1, 2); i++) {
          const aiId = debateOrder[i];
          const ai = AI_CONFIG.find(a => a.id === aiId);
          const role = aiRoles[aiId] || (i === 0 ? "diverge" : "critique");
          const roleName = ROLES[lang][role];

          setThinkingAI(aiId);
          await new Promise(r => setTimeout(r, 800));

          const prevSpeaker = allMessages[allMessages.length - 1].name;
          const systemPrompt = buildSystemPrompt(aiId, role, ai.name, lang, 2, prevSpeaker);
          const userContent = isJa
            ? `質問：「${q}」\n\nこれまでの議論：\n${allMessages.map(m => `${m.name}（R${m.round}）：${m.content}`).join("\n\n")}\n\n最後の結論に対して、あなたの見解を述べてください。同意・反論・補足、どれでも構いません。`
            : `Question: "${q}"\n\nFull discussion:\n${allMessages.map(m => `${m.name} (R${m.round}): ${m.content}`).join("\n\n")}\n\nReact to the final conclusion. Agree, push back, or add to it.`;

          let content;
          try {
            content = await callAI(aiId, [{ role: "user", content: `${systemPrompt}\n\n${userContent}` }], apiKeys);
          } catch {
            content = getMockResponse(aiId, role, q, allMessages, lang, 2);
          }

          const msg = { id: Date.now() + 100 + i, aiId, name: ai.name, color: ai.color, role: roleName, content, round: 2 };
          allMessages.push(msg);
          setThinkingAI(null);
          addMessage(msg);
          await new Promise(r => setTimeout(r, 300));
        }
      }

      // ===== 統合回答 =====
      setThinkingAI("unified");
      await new Promise(r => setTimeout(r, 600));

      let unified;
      try {
        const uPrompt = isJa
          ? `以下の議論全体を踏まえて、最終的なベストDoを200字以内でまとめてください。話し言葉で、自然に。\n\n質問：${q}\n\n議論：\n${allMessages.map(m => `${m.name}（R${m.round}）：${m.content}`).join("\n\n")}`
          : `Based on this full debate, summarize the best action in under 150 words. Keep it natural and conversational.\n\nQuestion: ${q}\n\nDebate:\n${allMessages.map(m => `${m.name} (R${m.round}): ${m.content}`).join("\n\n")}`;
        unified = await callClaude([{ role: "user", content: uPrompt }]);
      } catch {
        unified = isJa
          ? `議論を通じて見えてきたこと：「${q}」に対する答えは、まず「本当に何を解決したいか」を一文で書くことから始まります。その一文が、全ての選択肢の評価軸になります。`
          : `Through this debate, one thing became clear: the answer to "${q}" starts with writing in one sentence what you truly want to solve. That sentence becomes the yardstick for evaluating all options.`;
      }

      setThinkingAI(null);
      setUnifiedText(unified);
      setShowUnified(true);
      setPhase("done");

      // 履歴保存
      const histItem = { id: Date.now(), question: q, messages: allMessages, unified, date: new Date().toLocaleDateString(isJa ? "ja-JP" : "en-US") };
      const h = ls(STORAGE_KEYS.history, []);
      lsSet(STORAGE_KEYS.history, [histItem, ...h].slice(0, 50));
      setHistory(ls(STORAGE_KEYS.history, []));

      // 次の問い生成
      setNextQLoading(true);
      try {
        const nqPrompt = isJa
          ? `以下の議論を踏まえて、ユーザーがさらに深く考えるべき「次の問い」を3つ提案してください。JSONのみ：{"questions":["問い1","問い2","問い3"]}`
          : `Based on this debate, suggest 3 follow-up questions. JSON only: {"questions":["q1","q2","q3"]}`;
        const nqRes = await callClaude([{ role: "user", content: `${nqPrompt}\n\n質問：${q}\n結論：${unified}` }]);
        const parsed = JSON.parse(nqRes.replace(/```json|```/g, "").trim());
        setNextQuestions(parsed.questions || []);
      } catch {
        setNextQuestions(isJa
          ? ["この問題の根本原因は何か？", "3ヶ月後にどうなっていたいか？", "今すぐできる最小のアクションは？"]
          : ["What is the root cause?", "Where do you want to be in 3 months?", "What's the smallest action now?"]);
      }
      setNextQLoading(false);

    } catch (err) {
      setError(`Error: ${err.message}`);
      setPhase("idle");
      setThinkingAI(null);
    }
  };

  const reset = () => {
    setPhase("idle"); setQuestion(""); setCurrentQ("");
    setChatMessages([]); setThinkingAI(null);
    setShowUnified(false); setUnifiedText(""); setError("");
    setRound(1); setNextQuestions([]);
  };

  const toggleStar = (id) => {
    const s = starred.includes(id) ? starred.filter(x => x !== id) : [...starred, id];
    setStarred(s); lsSet(STORAGE_KEYS.starred, s);
  };

  const handleSelectHistory = (item) => {
    setSidebarOpen(false);
    setCurrentQ(item.question);
    setChatMessages(item.messages || []);
    setUnifiedText(item.unified || "");
    setShowUnified(true);
    setPhase("done");
    setNextQuestions([]);
  };

  const handleSetupComplete = (l, k, ais, m) => {
    setLang(l); setApiKeys(k); setSelectedAIs(ais); setMode(m);
    setOrder(ais); setSetupDone(true);
  };

  const isRunning = phase === "running";
  const isDone = phase === "done";
  const hasKeys = selectedAIs.some(id => apiKeys[id]?.trim());
  const orderPatterns = getOrderPatterns();

  if (!setupDone) return <SetupWizard onComplete={handleSetupComplete} />;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Inter',-apple-system,sans-serif", paddingBottom: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder,textarea::placeholder { color: #4B5563; }
        textarea:focus,input:focus { outline: none; }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0D1117; }
        ::-webkit-scrollbar-thumb { background: #21262D; border-radius: 3px; }
        @media (max-width: 640px) { .main-pad { padding: 16px 12px 0 !important; } .hero-title { font-size: 26px !important; } }
      `}</style>

      <ApiKeyModal open={apiModalOpen} onClose={() => setApiModalOpen(false)} onSave={k => { lsSet(STORAGE_KEYS.apiKeys, k); setApiKeys(k); }} initialKeys={apiKeys} selectedAIs={selectedAIs} lang={lang} />
      <MyPage open={myPageOpen} onClose={() => setMyPageOpen(false)} lang={lang} setLang={setLang} apiKeys={apiKeys} selectedAIs={selectedAIs} onOpenApiSettings={() => setApiModalOpen(true)} history={history} starred={starred} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpenApiSettings={() => setApiModalOpen(true)} onOpenMyPage={() => setMyPageOpen(true)} lang={lang} history={history} starred={starred} onToggleStar={toggleStar} onSelectHistory={handleSelectHistory} />

      <div style={{ marginLeft: sidebarOpen ? 280 : 0, transition: "margin-left 0.3s cubic-bezier(0.4,0,0.2,1)", minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, background: COLORS.bg, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", color: COLORS.muted, display: "flex", flexDirection: "column", gap: 5 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 20, height: 2, background: "currentColor", borderRadius: 2 }} />)}
          </button>
          <div style={{ display: "flex", gap: 5 }}>
            {activeAIs.map(ai => <div key={ai.id} style={{ width: 8, height: 8, borderRadius: "50%", background: ai.color, boxShadow: isRunning ? `0 0 8px ${ai.color}` : "none", transition: "box-shadow 0.3s" }} />)}
          </div>
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 18, color: COLORS.text, letterSpacing: 2 }}>BRIDGE</span>
          {!hasKeys && (
            <button onClick={() => setApiModalOpen(true)} style={{ marginLeft: "auto", background: "#6B728015", border: "1px solid #6B728040", borderRadius: 8, padding: "6px 14px", color: COLORS.muted, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              🎮 {isJa ? "デモモード中" : "Demo Mode"} <span style={{ color: COLORS.accent }}>{isJa ? "APIキーを設定" : "Set API Key"}</span>
            </button>
          )}
          {hasKeys && <button onClick={() => setApiModalOpen(true)} style={{ marginLeft: "auto", background: "transparent", border: "none", color: COLORS.muted, fontSize: 12, cursor: "pointer" }}>🔑</button>}
        </div>

        {/* Main */}
        <div className="main-pad" style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 0" }}>

          {phase === "idle" && (
            <div style={{ textAlign: "center", marginBottom: 32, animation: "fadeIn 0.6s" }}>
              <h1 className="hero-title" style={{ fontSize: 32, fontWeight: 700, margin: "0 0 10px", background: `linear-gradient(135deg,${activeAIs.map(a => a.color).join(",")})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1 }}>
                {isJa ? `${activeAIs.length}つのAIが議論する` : `${activeAIs.length} AI${activeAIs.length > 1 ? "s" : ""} in debate`}
              </h1>
              <p style={{ color: COLORS.muted, fontSize: 14, margin: "0 0 28px" }}>{isJa ? "話しかけるだけでいい。あとはBRIDGEが引き出してくれる。" : "Just talk. BRIDGE will do the rest."}</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {DEMO_QUESTIONS[lang].map(q => (
                  <button key={q} onClick={() => setQuestion(q)} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "7px 14px", color: COLORS.muted, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.target.style.borderColor = COLORS.accent; e.target.style.color = COLORS.text; }}
                    onMouseLeave={e => { e.target.style.borderColor = COLORS.border; e.target.style.color = COLORS.muted; }}
                  >{q}</button>
                ))}
              </div>
            </div>
          )}

          {/* モード・順番設定 */}
          {!isRunning && (
            <div style={{ marginBottom: 16, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.surface, overflow: "hidden" }}>
              <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}` }}>
                {[
                  { id: "deep", label: isJa ? "🔍 ディープ" : "🔍 Deep", desc: isJa ? "順番に議論" : "Sequential" },
                  { id: "blast", label: isJa ? "💡 ブレスト" : "💡 Brainstorm", desc: isJa ? "同時に思考" : "Parallel" },
                ].map((m, idx) => (
                  <button key={m.id} onClick={() => { setMode(m.id); lsSet(STORAGE_KEYS.debateMode, m.id); }} style={{ flex: 1, padding: "10px 16px", background: mode === m.id ? "#1A6BB520" : "transparent", border: "none", borderRight: idx === 0 ? `1px solid ${COLORS.border}` : "none", cursor: "pointer" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: mode === m.id ? COLORS.accent : COLORS.muted }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{m.desc}</div>
                  </button>
                ))}
              </div>
              {mode === "deep" && orderPatterns.length > 0 && (
                <div style={{ padding: "10px 14px" }}>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>{isJa ? "議論の順番：" : "Order: "}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {orderPatterns.map((pattern, i) => {
                      const isSelected = JSON.stringify(order) === JSON.stringify(pattern);
                      return (
                        <button key={i} onClick={() => setOrder(pattern)} style={{ padding: "5px 12px", background: isSelected ? "#1A6BB520" : COLORS.bg, border: `1px solid ${isSelected ? COLORS.accent : COLORS.border}`, borderRadius: 6, color: isSelected ? COLORS.accent : COLORS.muted, fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}>
                          {pattern.map(id => AI_CONFIG.find(a => a.id === id)?.name).join("→")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 入力欄 */}
          <div style={{ background: COLORS.surface, border: `1px solid ${isRunning ? COLORS.accent + "40" : COLORS.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 24, transition: "border-color 0.3s", boxShadow: isRunning ? `0 0 20px ${COLORS.accent}10` : "none" }}>
            <textarea value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runDebate(question); } }} placeholder={isJa ? "話しかけてください... (Enter で議論開始)" : "Just talk... (Enter to start)"} rows={3} disabled={isRunning} style={{ width: "100%", background: "transparent", border: "none", padding: "14px 16px", color: COLORS.text, fontSize: 15, fontFamily: "inherit", lineHeight: 1.6 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderTop: `1px solid ${COLORS.border}` }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <button onClick={() => setAttachMenuOpen(v => !v)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "4px 8px", color: COLORS.muted, cursor: "pointer", fontSize: 16 }}>＋</button>
                  {attachMenuOpen && (
                    <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 8, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden", minWidth: 160, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", zIndex: 50 }}>
                      {[
                        { label: isJa ? "📷 画像" : "📷 Image", action: () => { imageInputRef.current?.click(); setAttachMenuOpen(false); } },
                        { label: isJa ? "📎 ファイル" : "📎 File", action: () => { fileInputRef.current?.click(); setAttachMenuOpen(false); } },
                        { label: isJa ? "🎤 音声（近日）" : "🎤 Voice (Soon)", action: null },
                      ].map(({ label, action }) => (
                        <div key={label} onClick={action || undefined} style={{ padding: "10px 14px", fontSize: 13, color: action ? COLORS.text : COLORS.muted, cursor: action ? "pointer" : "default", borderBottom: `1px solid ${COLORS.border}` }}
                          onMouseEnter={e => { if (action) e.currentTarget.style.background = COLORS.sidebarHover; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                        >{label}</div>
                      ))}
                    </div>
                  )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) setQuestion(q => q + ` [画像: ${e.target.files[0].name}]`); }} />
                <input ref={fileInputRef} type="file" accept=".pdf,.txt,.doc,.docx" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) setQuestion(q => q + ` [ファイル: ${e.target.files[0].name}]`); }} />
                <div style={{ display: "flex", gap: 10 }}>
                  {activeAIs.map(ai => (
                    <span key={ai.id} style={{ fontSize: 11, color: COLORS.muted, fontFamily: "monospace" }}>
                      <span style={{ color: ai.color }}>●</span> {ai.name}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={() => runDebate(question)} disabled={!question.trim() || isRunning} style={{ background: question.trim() && !isRunning ? `linear-gradient(135deg,${activeAIs[0]?.color || COLORS.gpt},${activeAIs[activeAIs.length - 1]?.color || COLORS.gemini})` : COLORS.border, border: "none", borderRadius: 8, padding: "7px 18px", color: question.trim() && !isRunning ? "#000" : COLORS.muted, fontSize: 13, fontWeight: 600, cursor: question.trim() && !isRunning ? "pointer" : "not-allowed", fontFamily: "monospace" }}>
                {isRunning ? (isJa ? "議論中..." : "Debating...") : (isJa ? "議論開始 →" : "Start →")}
              </button>
            </div>
          </div>

          {error && <div style={{ marginBottom: 16, padding: "12px 16px", background: "#EF444410", border: "1px solid #EF444440", borderRadius: 8, fontSize: 13, color: "#EF4444" }}>{error}</div>}

          {/* チャットエリア */}
          {(isRunning || isDone) && currentQ && (
            <div>
              {/* Q表示 */}
              <div style={{ marginBottom: 20, padding: "10px 14px", background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 13, color: COLORS.muted }}>
                <span style={{ color: COLORS.text, fontWeight: 500 }}>Q: </span>{currentQ}
                {isDone && (
                  <button onClick={() => toggleStar(history[0]?.id)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>
                    {starred.includes(history[0]?.id) ? "⭐" : "☆"}
                  </button>
                )}
              </div>

              {/* チャットメッセージ */}
              {chatMessages.map((msg, i) => (
                <ChatBubble key={msg.id} message={msg} isLatest={i === chatMessages.length - 1 && isRunning} lang={lang} />
              ))}

              {/* 思考中 */}
              {thinkingAI && thinkingAI !== "unified" && (() => {
                const ai = AI_CONFIG.find(a => a.id === thinkingAI);
                return ai ? <ThinkingBubble aiId={thinkingAI} name={ai.name} color={ai.color} /> : null;
              })()}
              {thinkingAI === "unified" && (
                <ThinkingBubble aiId="unified" name="BRIDGE" color={COLORS.accent} />
              )}

              {/* 統合回答 */}
              <UnifiedBubble content={unifiedText} visible={showUnified} lang={lang} />

              {/* 次の問い */}
              {isDone && <NextQuestions questions={nextQuestions} onSelect={(q) => { setQuestion(q); setRound(1); runDebate(q); }} loading={nextQLoading} lang={lang} />}

              {/* アクションボタン */}
              {isDone && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                  {[
                    { label: isJa ? "🔄 別角度で再議論" : "🔄 Retry", action: () => { setRound(r => r + 1); runDebate(currentQ); } },
                    { label: isJa ? "🔬 さらに深掘り" : "🔬 Deeper", action: () => { setRound(r => r + 1); runDebate(`${currentQ}（さらに深掘りして）`); } },
                    { label: isJa ? "✕ 新しい質問" : "✕ New", action: reset },
                  ].map(({ label, action }) => (
                    <button key={label} onClick={action} style={{ flex: 1, minWidth: 80, padding: "9px 8px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.muted, fontSize: 12, cursor: "pointer", fontFamily: "monospace", transition: "all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.text; e.currentTarget.style.color = COLORS.text; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.muted; }}
                    >{label}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
