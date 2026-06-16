import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#0D1117", surface: "#161B22", border: "#21262D",
  gpt: "#10B981", claude: "#D97706", gemini: "#3B82F6",
  unified: "#E2E8F0", muted: "#6B7280", text: "#E2E8F0",
  sidebar: "#0D1117", sidebarHover: "#161B22", accent: "#1A6BB5",
  userBubble: "#1A6BB5",
};

const AI_CONFIG = [
  { id: "gpt", name: "GPT", color: COLORS.gpt, bg: "#10B98115", border: "#10B98140", keyPlaceholder: "sk-...", docsUrl: "https://platform.openai.com/api-keys" },
  { id: "claude", name: "Claude", color: COLORS.claude, bg: "#D9770615", border: "#D9770640", keyPlaceholder: "sk-ant-...", docsUrl: "https://console.anthropic.com/settings/keys" },
  { id: "gemini", name: "Gemini", color: COLORS.gemini, bg: "#3B82F615", border: "#3B82F640", keyPlaceholder: "AIza...", docsUrl: "https://aistudio.google.com/app/apikey" },
];

const STORAGE_KEYS = {
  apiKeys: "bridge_api_keys_v2",
  history: "bridge_history_v2",
  starred: "bridge_starred_v2",
  lang: "bridge_lang_v2",
  setup: "bridge_setup_done_v2",
  selectedAIs: "bridge_selected_ais_v2",
  debateMode: "bridge_debate_mode_v2",
};

function ls(key, def) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : def; } catch { return def; } }
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

// 時間帯に応じた挨拶
function getGreeting(lang) {
  const h = new Date().getHours();
  if (lang === "en") {
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }
  if (h < 12) return "おはようございます";
  if (h < 18) return "こんにちは";
  return "こんばんは";
}

// ===== API =====
async function callGPT(messages, apiKey, useSearch = false) {
  const body = {
    model: "gpt-4o-mini",
    max_tokens: 600,
    messages,
  };
  if (useSearch) {
    // GPTのWeb検索ツール
    body.tools = [{ type: "function", function: {
      name: "web_search",
      description: "Search the web for current information",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
    }}];
    body.tool_choice = "auto";
  }
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (d.error) {
    const msg = d.error.message || "";
    if (msg.includes("quota") || msg.includes("credit") || r.status === 429) throw new Error("CREDIT_EMPTY");
    if (r.status === 401) throw new Error("INVALID_KEY");
    throw new Error(msg);
  }
  return d.choices?.[0]?.message?.content || "";
}

// Gemini API（Vercel Function経由でCORSを回避）
async function callGemini(messages, apiKey, useSearch = false) {
  // 開発環境とVercel両対応
  const endpoint = "/api/gemini";
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, apiKey, useSearch }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d.text || "";
}

async function callClaude(messages, useSearch = false) {
  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages,
  };
  if (useSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  // テキストコンテンツを全て結合（web_search結果含む）
  const texts = (d.content || []).filter(b => b.type === "text").map(b => b.text);
  return texts.join("") || "";
}

async function callAI(aiId, messages, apiKeys, useSearch = false) {
  if (aiId === "claude") return await callClaude(messages, useSearch);
  if (aiId === "gpt" && apiKeys.gpt?.trim()) return await callGPT(messages, apiKeys.gpt.trim(), useSearch);
  if (aiId === "gemini" && apiKeys.gemini?.trim()) return await callGemini(messages, apiKeys.gemini.trim(), useSearch);
  throw new Error("NO_KEY");
}

// ===== TypingText =====
function TypingText({ text, speed = 18, onDone }) {
  const [d, setD] = useState(""); const idx = useRef(0);
  useEffect(() => {
    idx.current = 0; setD("");
    if (!text) return;
    const t = setInterval(() => {
      idx.current++;
      setD(text.slice(0, idx.current));
      if (idx.current >= text.length) { clearInterval(t); if (onDone) onDone(); }
    }, speed);
    return () => clearInterval(t);
  }, [text]);
  return <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>{d}{d.length < (text?.length || 0) && <span style={{ opacity: 0.7, animation: "blink 1s infinite" }}>▋</span>}</span>;
}

// ===== AI バブル（左） =====
function AIBubble({ message, isTyping, lang }) {
  const ai = message.aiId === "bridge"
    ? { name: "BRIDGE", color: COLORS.accent, initial: "⚡" }
    : AI_CONFIG.find(a => a.id === message.aiId) || { name: message.aiId, color: COLORS.muted, initial: "?" };

  const initial = message.aiId === "bridge" ? "⚡" : ai.name.slice(0, 2);

  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 16, maxWidth: "85%", animation: "fadeUp 0.3s ease" }}>
      {/* アバター */}
      <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: "50%", background: `${ai.color}20`, border: `2px solid ${ai.color}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: ai.color, marginTop: 2 }}>
        {initial}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 600, color: ai.color }}>{ai.name}</span>
          {message.role && <span style={{ color: COLORS.border }}>·</span>}
          {message.role && <span>{message.role}</span>}
        </div>
        <div style={{ background: COLORS.surface, border: `1px solid ${ai.color}30`, borderRadius: "4px 14px 14px 14px", padding: "12px 16px" }}>
          {isTyping
            ? <TypingText text={message.content} speed={16} />
            : <span style={{ whiteSpace: "pre-wrap", fontSize: 14, color: COLORS.text, lineHeight: 1.8 }}>{message.content}</span>
          }
        </div>
      </div>
    </div>
  );
}

// ===== ユーザー バブル（右） =====
function UserBubble({ content }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, animation: "fadeUp 0.3s ease" }}>
      <div style={{ maxWidth: "80%" }}>
        <div style={{ background: COLORS.userBubble, borderRadius: "14px 4px 14px 14px", padding: "12px 16px" }}>
          <span style={{ whiteSpace: "pre-wrap", fontSize: 14, color: "#fff", lineHeight: 1.8 }}>{content}</span>
        </div>
      </div>
    </div>
  );
}

// ===== 思考中バブル =====
function ThinkingBubble({ aiId }) {
  const ai = aiId === "bridge"
    ? { name: "BRIDGE", color: COLORS.accent }
    : AI_CONFIG.find(a => a.id === aiId) || { name: "AI", color: COLORS.muted };
  const initial = aiId === "bridge" ? "⚡" : ai.name.slice(0, 2);
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 16, animation: "fadeUp 0.3s ease" }}>
      <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: "50%", background: `${ai.color}20`, border: `2px solid ${ai.color}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: ai.color, marginTop: 2 }}>
        {initial}
      </div>
      <div>
        <div style={{ fontSize: 12, color: ai.color, fontWeight: 600, marginBottom: 4 }}>{ai.name}</div>
        <div style={{ background: COLORS.surface, border: `1px solid ${ai.color}30`, borderRadius: "4px 14px 14px 14px", padding: "12px 18px", display: "inline-flex", gap: 5, alignItems: "center" }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: ai.color, animation: `dotPulse 1.2s ${i*0.2}s infinite` }} />)}
        </div>
      </div>
    </div>
  );
}

// ===== 次の問い =====
function NextQuestions({ questions, onSelect, loading, lang }) {
  const isJa = lang === "ja";
  if (loading) return null;
  if (!questions?.length) return null;
  return (
    <div style={{ marginBottom: 16, borderRadius: 12, border: `1px solid ${COLORS.accent}30`, background: `${COLORS.accent}08`, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${COLORS.accent}20`, fontSize: 12, color: COLORS.accent, fontWeight: 600 }}>
        💡 {isJa ? "次に考えてみること" : "Next Questions"}
      </div>
      <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
        {questions.map((q, i) => (
          <button key={i} onClick={() => onSelect(q)} style={{ padding: "9px 14px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 13, cursor: "pointer", textAlign: "left", lineHeight: 1.5, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.background = `${COLORS.accent}10`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.background = COLORS.bg; }}
          ><span style={{ color: COLORS.accent, marginRight: 8 }}>{i+1}.</span>{q}</button>
        ))}
      </div>
    </div>
  );
}

// ===== セットアップウィザード =====
function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [lang, setLangState] = useState("ja");
  const [selectedAIs, setSelectedAIs] = useState(["gpt","claude","gemini"]);
  const [keys, setKeys] = useState({});
  const [showKeys, setShowKeys] = useState({});
  const isJa = lang === "ja";

  const toggleAI = id => setSelectedAIs(p => p.includes(id) ? (p.length > 1 ? p.filter(x=>x!==id) : p) : [...p, id]);

  const handleComplete = (demo=false) => {
    lsSet(STORAGE_KEYS.lang, lang);
    lsSet(STORAGE_KEYS.selectedAIs, selectedAIs);
    if (!demo) lsSet(STORAGE_KEYS.apiKeys, keys);
    lsSet(STORAGE_KEYS.setup, true);
    onComplete(lang, demo ? {} : keys, selectedAIs);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: COLORS.bg, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: 460, paddingBottom: 40, animation: "fadeIn 0.5s" }}>
        {/* ロゴ */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
            {[COLORS.gpt, COLORS.claude, COLORS.gemini].map((c,i) => <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c, boxShadow: `0 0 10px ${c}` }} />)}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 32, fontWeight: 700, color: COLORS.text, letterSpacing: 4 }}>BRIDGE</div>
          {/* ステップ */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 }}>
            {[1,2,3].map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: step>=s ? COLORS.accent : COLORS.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: step>=s ? "#fff" : COLORS.muted, transition: "all 0.3s" }}>{s}</div>
                {s < 3 && <div style={{ width: 24, height: 2, background: step>s ? COLORS.accent : COLORS.border, transition: "all 0.3s" }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: 言語 */}
        {step === 1 && (
          <div style={{ animation: "fadeIn 0.3s" }}>
            <h2 style={{ textAlign: "center", fontSize: 20, fontWeight: 700, color: COLORS.text, margin: "0 0 8px" }}>言語を選択 / Select Language</h2>
            <p style={{ textAlign: "center", fontSize: 13, color: COLORS.muted, margin: "0 0 24px" }}>後から変更できます / Change anytime</p>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              {[{id:"ja",label:"🇯🇵 日本語"},{id:"en",label:"🇺🇸 English"}].map(l => (
                <button key={l.id} onClick={() => setLangState(l.id)} style={{ flex: 1, padding: "18px", background: lang===l.id ? "#1A6BB520" : COLORS.surface, border: `2px solid ${lang===l.id ? COLORS.accent : COLORS.border}`, borderRadius: 12, color: lang===l.id ? COLORS.accent : COLORS.muted, fontSize: 16, cursor: "pointer", fontWeight: lang===l.id ? 700 : 400, transition: "all 0.2s" }}>{l.label}</button>
              ))}
            </div>
            <button onClick={() => setStep(2)} style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})`, border: "none", borderRadius: 10, color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{isJa?"次へ →":"Next →"}</button>
          </div>
        )}

        {/* Step 2: AI選択 */}
        {step === 2 && (
          <div style={{ animation: "fadeIn 0.3s" }}>
            <h2 style={{ textAlign: "center", fontSize: 20, fontWeight: 700, color: COLORS.text, margin: "0 0 8px" }}>{isJa?"使うAIを選ぶ":"Select Your AIs"}</h2>
            <p style={{ textAlign: "center", fontSize: 13, color: COLORS.muted, margin: "0 0 6px" }}>{isJa?"1つでもOK。後から変更できます。":"Even one is fine. Change anytime."}</p>
            <p style={{ textAlign: "center", fontSize: 12, color: COLORS.accent, margin: "0 0 20px", fontFamily: "monospace" }}>{isJa?"最大3つのAIが一緒に考えます":"Up to 3 AIs will think together"}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {AI_CONFIG.map(ai => {
                const sel = selectedAIs.includes(ai.id);
                return (
                  <div key={ai.id} onClick={() => toggleAI(ai.id)} style={{ padding: "14px 16px", background: sel ? ai.bg : COLORS.surface, border: `2px solid ${sel ? ai.color : COLORS.border}`, borderRadius: 12, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${sel ? ai.color : COLORS.border}`, background: sel ? ai.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {sel && <span style={{ color: "#000", fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: sel ? ai.color : COLORS.muted }}>{ai.name}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>{isJa ? "APIキーが必要です" : "API key required"}</div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: ai.color, opacity: sel?1:0.2 }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(1)} style={{ padding: "12px 16px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.muted, fontSize: 13, cursor: "pointer" }}>{isJa?"← 戻る":"← Back"}</button>
              <button onClick={() => setStep(3)} style={{ flex: 1, padding: "12px", background: `linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})`, border: "none", borderRadius: 10, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{isJa?"次へ →":"Next →"}</button>
            </div>
          </div>
        )}

        {/* Step 3: APIキー */}
        {step === 3 && (
          <div style={{ animation: "fadeIn 0.3s" }}>
            <h2 style={{ textAlign: "center", fontSize: 20, fontWeight: 700, color: COLORS.text, margin: "0 0 8px" }}>{isJa?"APIキーを入力":"Enter API Keys"}</h2>
            <p style={{ textAlign: "center", fontSize: 13, color: COLORS.muted, margin: "0 0 6px" }}>{isJa?"選んだAIのキーだけでOK":"Only for your selected AIs"}</p>
            <p style={{ textAlign: "center", fontSize: 12, color: COLORS.accent, margin: "0 0 16px" }}>{isJa?"スキップしてデモで試すこともできます":"You can skip and try demo first"}</p>
            <div style={{ background: "#10B98110", border: "1px solid #10B98130", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 8 }}>
              <span>🔒</span><span style={{ fontSize: 12, color: "#10B981", lineHeight: 1.6 }}>{isJa?"キーはブラウザにのみ保存。サーバーには送りません。":"Keys stored only in your browser. Never sent to servers."}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              {AI_CONFIG.filter(ai => selectedAIs.includes(ai.id)).map(ai => (
                <div key={ai.id}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: ai.color }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: ai.color, fontFamily: "monospace" }}>{ai.name}</span>
                    </div>
                    <a href={ai.docsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: COLORS.muted, textDecoration: "none" }}>{isJa?"取得方法 →":"Get Key →"}</a>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input type={showKeys[ai.id]?"text":"password"} value={keys[ai.id]||""} onChange={e=>setKeys(p=>({...p,[ai.id]:e.target.value}))} placeholder={ai.keyPlaceholder} style={{ width: "100%", background: COLORS.surface, border: `1px solid ${keys[ai.id]?ai.border:COLORS.border}`, borderRadius: 8, padding: "10px 44px 10px 14px", color: COLORS.text, fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} />
                    <button onClick={() => setShowKeys(p=>({...p,[ai.id]:!p[ai.id]}))} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>{showKeys[ai.id]?"🙈":"👁"}</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setStep(2)} style={{ padding: "12px 16px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.muted, fontSize: 13, cursor: "pointer" }}>{isJa?"← 戻る":"← Back"}</button>
                <button onClick={() => handleComplete(false)} disabled={!selectedAIs.some(id=>keys[id]?.trim())} style={{ flex: 1, padding: "12px", background: selectedAIs.some(id=>keys[id]?.trim())?`linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})`:COLORS.border, border: "none", borderRadius: 10, color: selectedAIs.some(id=>keys[id]?.trim())?"#000":COLORS.muted, fontSize: 14, fontWeight: 700, cursor: selectedAIs.some(id=>keys[id]?.trim())?"pointer":"not-allowed" }}>
                  {isJa?"BRIDGEを始める 🌉":"Start BRIDGE 🌉"}
                </button>
              </div>
              <button onClick={() => handleComplete(true)} style={{ width: "100%", padding: "10px", background: "#6B728010", border: `1px solid #6B728030`, borderRadius: 10, color: COLORS.muted, fontSize: 12, cursor: "pointer" }}>{isJa?"🎮 スキップしてデモで試す":"🎮 Skip and try demo"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== サイドバー =====
function Sidebar({ open, onClose, lang, history, starred, onToggleStar, onSelectHistory, onOpenMyPage, onOpenApiSettings }) {
  const [recentOpen, setRecentOpen] = useState(true);
  const [starredOpen, setStarredOpen] = useState(true);
  const isJa = lang === "ja";
  const starredItems = history.filter(h => starred.includes(h.id));

  return (
    <>
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200 }} />}
      <div style={{ position: "fixed", top: 0, left: 0, height: "100vh", width: 280, background: COLORS.sidebar, borderRight: `1px solid ${COLORS.border}`, zIndex: 300, transform: open?"translateX(0)":"translateX(-100%)", transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px", borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, background: COLORS.sidebar, zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 4 }}>{[COLORS.gpt,COLORS.claude,COLORS.gemini].map((c,i)=><div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />)}</div>
            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: COLORS.text, letterSpacing: 2 }}>BRIDGE</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: "12px" }}>
          <button onClick={onClose} style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 14px", color: COLORS.text, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit" }}>
            <span>＋</span><span>{isJa?"新しい会話":"New Chat"}</span>
          </button>
        </div>
        <div style={{ padding: "4px 12px" }}>
          {[{icon:"👤",label:isJa?"マイページ":"My Page",action:()=>{onClose();setTimeout(onOpenMyPage,300);}},{icon:"🔑",label:isJa?"APIキー":"API Keys",action:()=>{onClose();setTimeout(onOpenApiSettings,300);}}].map(({icon,label,action})=>(
            <div key={label} onClick={action} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, cursor: "pointer", color: COLORS.muted, fontSize: 13, transition: "all 0.2s" }}
              onMouseEnter={e=>{e.currentTarget.style.background=COLORS.sidebarHover;e.currentTarget.style.color=COLORS.text;}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=COLORS.muted;}}
            ><span>{icon}</span><span>{label}</span></div>
          ))}
        </div>
        <div style={{ height: 1, background: COLORS.border, margin: "8px 12px" }} />
        {/* スター */}
        <div style={{ padding: "0 12px" }}>
          <div onClick={() => setStarredOpen(v=>!v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", cursor: "pointer", color: COLORS.muted, fontSize: 12, fontFamily: "monospace" }}>
            <span>⭐ {isJa?"スター付き":"Starred"}</span><span style={{ fontSize: 10 }}>{starredOpen?"▲":"▼"}</span>
          </div>
          {starredOpen && (starredItems.length===0
            ? <div style={{ padding: "6px 10px", fontSize: 12, color: COLORS.border }}>{isJa?"まだありません":"None yet"}</div>
            : starredItems.map(item=>(
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}
                onMouseEnter={e=>e.currentTarget.style.background=COLORS.sidebarHover}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                <span onClick={()=>onToggleStar(item.id)} style={{ fontSize: 12, cursor: "pointer" }}>⭐</span>
                <div onClick={()=>onSelectHistory(item)} style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: 13, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted }}>{item.date}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{ height: 1, background: COLORS.border, margin: "8px 12px" }} />
        {/* 最近 */}
        <div style={{ padding: "0 12px", flex: 1 }}>
          <div onClick={() => setRecentOpen(v=>!v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", cursor: "pointer", color: COLORS.muted, fontSize: 12, fontFamily: "monospace" }}>
            <span>🕐 {isJa?"最近の会話":"Recent"}</span><span style={{ fontSize: 10 }}>{recentOpen?"▲":"▼"}</span>
          </div>
          {recentOpen && (history.length===0
            ? <div style={{ padding: "6px 10px", fontSize: 12, color: COLORS.border }}>{isJa?"まだ会話がありません":"No chats yet"}</div>
            : history.map(item=>(
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}
                onMouseEnter={e=>e.currentTarget.style.background=COLORS.sidebarHover}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                <span onClick={()=>onToggleStar(item.id)} style={{ fontSize: 12, cursor: "pointer", opacity: starred.includes(item.id)?1:0.3 }}>⭐</span>
                <div onClick={()=>onSelectHistory(item)} style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: 13, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted }}>{item.date}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#000" }}>H</div>
            <div><div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>Herald</div><div style={{ fontSize: 11, color: COLORS.muted }}>{isJa?"Freeプラン":"Free Plan"}</div></div>
          </div>
        </div>
      </div>
    </>
  );
}

// ===== APIキーモーダル =====
function ApiKeyModal({ open, onClose, onSave, keys, setKeys, selectedAIs, lang }) {
  const [showKeys, setShowKeys] = useState({});
  const [saved, setSaved] = useState(false);
  const isJa = lang === "ja";
  if (!open) return null;
  const handleSave = () => { lsSet(STORAGE_KEYS.apiKeys, keys); onSave(keys); setSaved(true); setTimeout(()=>{setSaved(false);onClose();},800); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, width: "100%", maxWidth: 460, overflow: "hidden", animation: "fadeIn 0.3s" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: COLORS.text }}>{isJa?"APIキー設定":"API Key Settings"}</div><div style={{ fontSize: 12, color: COLORS.muted, marginTop: 3 }}>{isJa?"ブラウザにのみ保存":"Stored only in your browser"}</div></div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ margin: "14px 22px 0", padding: "10px 12px", background: "#10B98110", border: "1px solid #10B98130", borderRadius: 8, display: "flex", gap: 8 }}>
          <span>🔒</span><span style={{ fontSize: 12, color: "#10B981" }}>{isJa?"APIキーはBRIDGEのサーバーに送信されません。":"API keys are never sent to BRIDGE servers."}</span>
        </div>
        <div style={{ padding: "14px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          {AI_CONFIG.map(ai=>(
            <div key={ai.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: ai.color }} /><span style={{ fontSize: 13, fontWeight: 600, color: ai.color, fontFamily: "monospace" }}>{ai.name}</span></div>
                <a href={ai.docsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: COLORS.muted, textDecoration: "none" }}>{isJa?"取得方法 →":"Get Key →"}</a>
              </div>
              <div style={{ position: "relative" }}>
                <input type={showKeys[ai.id]?"text":"password"} value={keys[ai.id]||""} onChange={e=>setKeys(p=>({...p,[ai.id]:e.target.value}))} placeholder={ai.keyPlaceholder} style={{ width: "100%", background: COLORS.bg, border: `1px solid ${keys[ai.id]?ai.border:COLORS.border}`, borderRadius: 8, padding: "9px 42px 9px 12px", color: COLORS.text, fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} />
                <button onClick={()=>setShowKeys(p=>({...p,[ai.id]:!p[ai.id]}))} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 13, padding: 0 }}>{showKeys[ai.id]?"🙈":"👁"}</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "0 22px 8px" }}>
          <button onClick={onClose} style={{ width: "100%", padding: "9px", background: "#6B728010", border: `1px solid #6B728030`, borderRadius: 8, color: COLORS.muted, fontSize: 12, cursor: "pointer" }}>{isJa?"🎮 デモモードで試す":"🎮 Try Demo Mode"}</button>
        </div>
        <div style={{ padding: "6px 22px 20px" }}>
          <button onClick={handleSave} style={{ width: "100%", background: `linear-gradient(135deg,${COLORS.gpt},${COLORS.gemini})`, border: "none", borderRadius: 8, padding: "10px", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{saved?"✓ 保存しました":isJa?"保存する":"Save"}</button>
        </div>
      </div>
    </div>
  );
}

// ===== マイページ =====
function MyPage({ open, onClose, lang, setLang, apiKeys, selectedAIs, setSelectedAIs, history, starred, onOpenApiSettings }) {
  const isJa = lang === "ja";
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, width: "100%", maxWidth: 420, maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column", animation: "fadeIn 0.3s" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: COLORS.text }}>{isJa?"マイページ":"My Page"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          <div style={{ padding: "18px 22px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", gap: 14 }}>
            {[{label:isJa?"会話数":"Chats",value:history.length},{label:isJa?"スター":"Starred",value:starred.length}].map(s=>(
              <div key={s.label} style={{ flex: 1, padding: "12px", background: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.accent }}>{s.value}</div>
                <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "14px 22px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>{isJa?"言語":"Language"}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{id:"ja",label:"🇯🇵 日本語"},{id:"en",label:"🇺🇸 English"}].map(l=>(
                <button key={l.id} onClick={()=>{setLang(l.id);lsSet(STORAGE_KEYS.lang,l.id);}} style={{ flex: 1, padding: "9px", background: lang===l.id?"#1A6BB520":COLORS.bg, border: `1px solid ${lang===l.id?COLORS.accent:COLORS.border}`, borderRadius: 8, color: lang===l.id?COLORS.accent:COLORS.muted, fontSize: 13, cursor: "pointer" }}>{l.label}</button>
              ))}
            </div>
          </div>
          {/* AI選択変更 */}
          <div style={{ padding: "14px 22px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>{isJa?"使うAIを変更":"Change AI Selection"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {AI_CONFIG.map(ai => {
                const sel = selectedAIs.includes(ai.id);
                return (
                  <div key={ai.id} onClick={() => {
                    const next = sel
                      ? (selectedAIs.length > 1 ? selectedAIs.filter(x=>x!==ai.id) : selectedAIs)
                      : [...selectedAIs, ai.id];
                    setSelectedAIs(next);
                    lsSet(STORAGE_KEYS.selectedAIs, next);
                  }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: sel ? ai.bg : COLORS.bg, border: `2px solid ${sel ? ai.color : COLORS.border}`, borderRadius: 10, cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${sel ? ai.color : COLORS.border}`, background: sel ? ai.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {sel && <span style={{ color: "#000", fontSize: 11, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: ai.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: sel ? ai.color : COLORS.muted, fontFamily: "monospace" }}>{ai.name}</span>
                    {selectedAIs.length === 1 && sel && <span style={{ fontSize: 11, color: COLORS.muted, marginLeft: "auto" }}>{isJa?"最低1つ必要":"Min 1 required"}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: "14px 22px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>{isJa?"APIキー":"API Keys"}</div>
            {AI_CONFIG.map(ai=>(
              <div key={ai.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: COLORS.bg, borderRadius: 8, border: `1px solid ${apiKeys[ai.id]?ai.border:COLORS.border}`, marginBottom: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: apiKeys[ai.id]?ai.color:COLORS.border }} />
                <span style={{ fontSize: 13, color: apiKeys[ai.id]?ai.color:COLORS.muted, fontFamily: "monospace", fontWeight: 600 }}>{ai.name}</span>
                <span style={{ fontSize: 11, color: COLORS.muted, marginLeft: "auto" }}>{apiKeys[ai.id]?(isJa?"✓ 設定済み":"✓ Set"):(isJa?"未設定":"Not set")}</span>
              </div>
            ))}
            <button onClick={()=>{onClose();setTimeout(onOpenApiSettings,300);}} style={{ width: "100%", marginTop: 8, padding: "9px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.muted, fontSize: 13, cursor: "pointer" }}>🔑 {isJa?"APIキーを変更":"Change API Keys"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== メインアプリ =====
export default function App() {
  const [setupDone, setSetupDone] = useState(ls(STORAGE_KEYS.setup, false));
  const [lang, setLang] = useState(ls(STORAGE_KEYS.lang, "ja"));
  const [selectedAIs, setSelectedAIs] = useState(ls(STORAGE_KEYS.selectedAIs, ["gpt","claude","gemini"]));
  const [apiKeys, setApiKeys] = useState(ls(STORAGE_KEYS.apiKeys, {}));

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [myPageOpen, setMyPageOpen] = useState(false);

  // チャット状態
  const [chatLog, setChatLog] = useState([]); // {type: "ai"|"user", ...}
  const [typingId, setTypingId] = useState(null); // 現在タイピング中のメッセージID
  const [thinkingAI, setThinkingAI] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | listening | debating | done

  // ヒアリング状態
  const [hearingTurns, setHearingTurns] = useState(0);
  const [hearingContext, setHearingContext] = useState([]);

  // 入力
  const [input, setInput] = useState("");

  // 次の問い
  const [nextQuestions, setNextQuestions] = useState([]);
  const [nextQLoading, setNextQLoading] = useState(false);

  // 履歴
  const [history, setHistory] = useState(ls(STORAGE_KEYS.history, []));
  const [starred, setStarred] = useState(ls(STORAGE_KEYS.starred, []));

  const [error, setError] = useState("");
  const isComposing = useRef(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [debateOrder, setDebateOrder] = useState(ls("bridge_debate_order", ["gpt","claude","gemini"]));
  const bottomRef = useRef(null);
  const topRef = useRef(null);

  // パネル外クリックで閉じる
  useEffect(() => {
    if (!aiPanelOpen) return;
    const handler = () => setAiPanelOpen(false);
    setTimeout(() => document.addEventListener("click", handler), 0);
    return () => document.removeEventListener("click", handler);
  }, [aiPanelOpen]);
  const inputRef = useRef(null);
  const isJa = lang === "ja";

  // 選択済み＆APIキー設定済みのAI
  const activeAIs = AI_CONFIG.filter(ai => {
    if (!selectedAIs.includes(ai.id)) return false;
    if (ai.id === "claude") return true; // Claude はキー不要
    return apiKeys[ai.id]?.trim().length > 0;
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatLog, thinkingAI]);

  const addAIMessage = (aiId, content, role="", isNew=true) => {
    const id = Date.now() + Math.random();
    setChatLog(p => [...p, { id, type: "ai", aiId, content, role }]);
    if (isNew) setTypingId(id);
    return id;
  };

  const addUserMessage = content => {
    setChatLog(p => [...p, { id: Date.now(), type: "user", content }]);
  };

  // AIを呼び出す（エラーハンドリング付き）
  const invokeAI = async (aiId, messages, fallbackContent, useSearch = false) => {
    try {
      return await callAI(aiId, messages, apiKeys, useSearch);
    } catch(e) {
      const aiName = AI_CONFIG.find(a=>a.id===aiId)?.name || aiId;
      if (e.message === "CREDIT_EMPTY") {
        setError(isJa ? `⚠️ ${aiName}のクレジットが不足しています。` : `⚠️ ${aiName} credit is empty.`);
      } else if (e.message === "INVALID_KEY") {
        setError(isJa ? `⚠️ ${aiName}のAPIキーが無効です。` : `⚠️ Invalid API key for ${aiName}.`);
      } else if (e.message !== "NO_KEY") {
        // その他のエラーを表示（GeminiのAPIエラーなど）
        setError(`⚠️ ${aiName}: ${e.message}`);
        console.error(`${aiName} error:`, e.message);
      }
      return fallbackContent;
    }
  };

  // 起動時：最初のAIが挨拶
  const startConversation = async () => {
    setPhase("listening");
    const firstAI = activeAIs[0] || AI_CONFIG.find(a=>a.id==="claude");
    const greeting = getGreeting(lang);
    setThinkingAI(firstAI.id);
    await new Promise(r => setTimeout(r, 800));

    const greetMsg = isJa
      ? `${greeting}！まずは私が話を聞きますよ😊\n\n聞きたいこと、困っていること、手伝ってほしいこと、なんでも話しかけてください。`
      : `${greeting}! I'm here to listen first 😊\n\nTell me anything — questions, worries, or things you'd like help with.`;

    setThinkingAI(null);
    addAIMessage(firstAI.id, greetMsg, isJa?"お話を聞く":"Listening");
    setHearingTurns(0);
    setHearingContext([]);
  };

  useEffect(() => {
    if (setupDone && phase === "idle") {
      startConversation();
    }
  }, [setupDone]);

  // ユーザーの入力を処理
  const handleSend = async () => {
    const text = input.trim();
    if (!text || phase === "debating") return;
    setInput("");
    setError("");
    addUserMessage(text);
    setTypingId(null);

    if (phase === "listening" || phase === "done") {
      // doneの場合はリセットせずそのまま会話を続ける
      setPhase("listening");
      setNextQuestions([]);
      await handleListening(text);
    }
  };

  const handleListening = async (userText) => {
    const firstAI = activeAIs[0] || AI_CONFIG.find(a=>a.id==="claude");
    const newContext = [...hearingContext, { role: "user", content: userText }];
    setHearingContext(newContext);

    // 具体的な質問かどうかを判定
    const isDirectQuestion = userText.length > 20 ||
      hearingTurns >= 1 ||
      ["教えて","とは","何","どう","すべき","したい","方法","おすすめ","比較","違い","理由","なぜ","について",
       "what","how","should","tell","explain","compare","why","recommend","about"].some(k => userText.toLowerCase().includes(k));

    if (isDirectQuestion) {
      await runDebate(newContext);
    } else {
      setThinkingAI(firstAI.id);
      await new Promise(r => setTimeout(r, 600));
      setHearingTurns(h => h + 1);

      const followUpPrompt = isJa
        ? `ユーザーが「${userText}」と言いました。もう少し詳しく教えてほしいと、1文で自然に聞いてください。`
        : `The user said: "${userText}". Ask one natural follow-up question in 1 sentence.`;

      const followUp = await invokeAI(firstAI.id,
        [{ role: "user", content: followUpPrompt }],
        isJa ? "もう少し教えていただけますか？" : "Could you tell me a bit more?"
      );

      setThinkingAI(null);
      addAIMessage(firstAI.id, followUp);
    }
  };

  const runDebate = async (context) => {
    setPhase("debating");
    const userQuestion = context.filter(m=>m.role==="user").map(m=>m.content).join("。") || "";
    const mainQuestion = context.filter(m=>m.role==="user")[0]?.content || userQuestion;

    const debateAIs = activeAIs.length > 0 ? activeAIs : [AI_CONFIG.find(a=>a.id==="claude")];
    const allResponses = [];

    for (let i = 0; i < debateAIs.length; i++) {
      const ai = debateAIs[i];
      const isLast = i === debateAIs.length - 1;
      const role = debateAIs.length === 1
        ? (isJa?"回答":"Answer")
        : i===0 ? (isJa?"発散・仮説":"Explore") : isLast ? (isJa?"統合・結論":"Conclude") : (isJa?"深掘り":"Deepen");

      setThinkingAI(ai.id);
      await new Promise(r => setTimeout(r, 700));

      const prevText = allResponses.length > 0
        ? (isJa ? `\n\n前の回答：\n${allResponses.map(r=>`${r.name}：${r.content.slice(0,200)}`).join("\n\n")}` : `\n\nPrevious responses:\n${allResponses.map(r=>`${r.name}: ${r.content.slice(0,200)}`).join("\n\n")}`)
        : "";

      const prompt = debateAIs.length === 1
        ? (isJa
          ? `質問：「${mainQuestion}」

あなたはあらゆる分野の知識を持つAIです。知っている情報は積極的に答えてください。必要であればWeb検索を使って最新情報も加えてください。話し言葉で自然に、具体的に200字以内で答えてください。`
          : `Question: "${mainQuestion}"

You are a knowledgeable AI assistant. Share what you know and use web search for the latest info if needed. Answer naturally and specifically in under 150 words.`)
        : (isJa
          ? `質問：「${userQuestion}」

あなたは${role}担当です。${prevText}

話し言葉で答えてください。150字以内で。${isLast?"全体を統合してベストな答えを出してください。":""}`
          : `Question: "${userQuestion}"

Role: ${role}.${prevText}

Respond naturally in under 120 words.${isLast?" Synthesize into best answer.":""}`);

      const fallback = isJa
        ? `「${userQuestion}」についてですね。まず基本的な情報から整理してみましょう。`
        : `Regarding "${userQuestion}", let me start with the key points.`;

      const response = await invokeAI(ai.id, [{ role: "user", content: prompt }], fallback, true);

      setThinkingAI(null);
      allResponses.push({ name: ai.name, content: response });
      addAIMessage(ai.id, response, role);
      await new Promise(r => setTimeout(r, 300));
    }

    if (debateAIs.length > 1) {
      setThinkingAI("bridge");
      await new Promise(r => setTimeout(r, 600));

      const unifiedPrompt = isJa
        ? `質問：${userQuestion}\n\n各AIの回答：\n${allResponses.map(r=>`${r.name}：${r.content}`).join("\n\n")}\n\n最終的な答えを100字以内で話し言葉でまとめてください。`
        : `Question: ${userQuestion}\n\nResponses:\n${allResponses.map(r=>`${r.name}: ${r.content}`).join("\n\n")}\n\nSummarize the final answer in under 80 words conversationally.`;

      const unified = await invokeAI("claude",
        [{ role: "user", content: unifiedPrompt }],
        isJa?"みなさんの意見を総合すると、まず一歩踏み出すことが大切です。":"To summarize: the most important thing is to take the first step.",
        false
      );

      setThinkingAI(null);
      addAIMessage("bridge", unified, isJa?"統合回答":"Unified");
    }

    setPhase("done");

    setNextQLoading(true);
    try {
      const nqRes = await callClaude([{ role: "user", content: isJa
        ? `「${userQuestion}」についての会話を踏まえて、次に考えると良い問いを3つ提案してください。JSONのみ：{"questions":["問い1","問い2","問い3"]}`
        : `Based on "${userQuestion}", suggest 3 follow-up questions. JSON only: {"questions":["q1","q2","q3"]}`
      }]);
      const parsed = JSON.parse(nqRes.replace(/```json|```/g,"").trim());
      setNextQuestions(parsed.questions||[]);
    } catch {
      setNextQuestions(isJa
        ? ["もっと詳しく知りたいことはありますか？","関連して気になることはありますか？","次に何を試してみますか？"]
        : ["Would you like to know more?","Anything related you're curious about?","What would you like to try next?"]);
    }
    setNextQLoading(false);

    const title = context.find(m=>m.role==="user")?.content?.slice(0,30) || "会話";
    const histItem = { id: Date.now(), title, date: new Date().toLocaleDateString() };
    lsSet(STORAGE_KEYS.history, [histItem, ...ls(STORAGE_KEYS.history,[])].slice(0,50));
    setHistory(ls(STORAGE_KEYS.history,[]));
  };

  const resetChat = () => {
    setChatLog([]); setPhase("idle"); setHearingTurns(0);
    setHearingContext([]); setNextQuestions([]); setError("");
    setTypingId(null); setThinkingAI(null);
    setTimeout(() => startConversation(), 100);
  };

  const toggleStar = id => {
    const s = starred.includes(id)?starred.filter(x=>x!==id):[...starred,id];
    setStarred(s); lsSet(STORAGE_KEYS.starred,s);
  };

  if (!setupDone) return <SetupWizard onComplete={(l,k,ais)=>{ setLang(l); setApiKeys(k); setSelectedAIs(ais); setSetupDone(true); }} />;

  const hasKeys = activeAIs.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Inter',-apple-system,sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes dotPulse { 0%,100%{opacity:0.3;transform:scale(0.7)} 50%{opacity:1;transform:scale(1)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder,textarea::placeholder { color: #4B5563; }
        textarea:focus,input:focus { outline: none; }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0D1117; }
        ::-webkit-scrollbar-thumb { background: #21262D; border-radius: 3px; }
      `}</style>

      <ApiKeyModal open={apiModalOpen} onClose={()=>setApiModalOpen(false)} onSave={k=>{
              setApiKeys(k);
              lsSet(STORAGE_KEYS.apiKeys,k);
              // キーが入ってるAIを自動でselectedAIsに追加
              const newSelected = AI_CONFIG
                .filter(ai => ai.id === "claude" || k[ai.id]?.trim().length > 0)
                .map(ai => ai.id);
              if (newSelected.length > 0) {
                setSelectedAIs(newSelected);
                lsSet(STORAGE_KEYS.selectedAIs, newSelected);
              }
            }} keys={apiKeys} setKeys={setApiKeys} selectedAIs={selectedAIs} lang={lang} />
      <MyPage open={myPageOpen} onClose={()=>setMyPageOpen(false)} lang={lang} setLang={setLang} apiKeys={apiKeys} selectedAIs={selectedAIs} setSelectedAIs={setSelectedAIs} history={history} starred={starred} onOpenApiSettings={()=>setApiModalOpen(true)} />
      <Sidebar open={sidebarOpen} onClose={()=>setSidebarOpen(false)} lang={lang} history={history} starred={starred} onToggleStar={toggleStar} onSelectHistory={()=>setSidebarOpen(false)} onOpenMyPage={()=>setMyPageOpen(true)} onOpenApiSettings={()=>setApiModalOpen(true)} />

      <div style={{ marginLeft: sidebarOpen?280:0, transition: "margin-left 0.3s cubic-bezier(0.4,0,0.2,1)", flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, background: COLORS.bg, zIndex: 100 }}>
          <button onClick={()=>setSidebarOpen(v=>!v)} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", color: COLORS.muted, display: "flex", flexDirection: "column", gap: 5 }}>
            {[0,1,2].map(i=><div key={i} style={{ width: 20, height: 2, background: "currentColor", borderRadius: 2 }} />)}
          </button>
          <div style={{ display: "flex", gap: 5 }}>
            {activeAIs.map(ai=><div key={ai.id} style={{ width: 8, height: 8, borderRadius: "50%", background: ai.color, boxShadow: thinkingAI===ai.id?`0 0 8px ${ai.color}`:"none", transition: "box-shadow 0.3s" }} />)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span onClick={() => topRef.current?.scrollIntoView({ behavior: "smooth" })} style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 18, color: COLORS.text, letterSpacing: 2, cursor: "pointer" }}>BRIDGE</span>
            <span
              onClick={() => topRef.current?.scrollIntoView({ behavior: "smooth" })}
              style={{ fontSize: 10, color: COLORS.border, fontFamily: "monospace", letterSpacing: 0.5, cursor: chatLog.length > 0 ? "pointer" : "default", transition: "color 0.2s" }}
              onMouseEnter={e => { if (chatLog.length > 0) e.currentTarget.style.color = COLORS.muted; }}
              onMouseLeave={e => { e.currentTarget.style.color = COLORS.border; }}
              title={chatLog.length > 0 ? (isJa ? "会話の先頭に戻る" : "Back to top") : ""}
            >
              bridge.ai › {chatLog.length > 0
                ? (chatLog.find(m=>m.type==="user")?.content?.slice(0,20) || (isJa?"新しい会話":"New Chat")) + (chatLog.find(m=>m.type==="user")?.content?.length > 20 ? "..." : "")
                : (isJa?"新しい会話":"New Chat")}
            </span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            {!hasKeys && (
              <button onClick={()=>setApiModalOpen(true)} style={{ background: "#6B728015", border: "1px solid #6B728040", borderRadius: 8, padding: "5px 12px", color: COLORS.muted, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                🎮 {isJa?"デモ":"Demo"} <span style={{ color: COLORS.accent }}>{isJa?"キー設定":"Set Keys"}</span>
              </button>
            )}
            {hasKeys && <button onClick={()=>setApiModalOpen(true)} style={{ background: "transparent", border: "none", color: COLORS.muted, fontSize: 14, cursor: "pointer" }}>🔑</button>}
            {phase !== "idle" && (
              <button onClick={resetChat} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "5px 12px", color: COLORS.muted, fontSize: 11, cursor: "pointer" }}>
                {isJa?"新しい会話":"New Chat"}
              </button>
            )}
          </div>
        </div>

        {/* チャットエリア */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 8px", maxWidth: 680, width: "100%", margin: "0 auto" }}>
          <div ref={topRef} />
          {chatLog.map((msg, i) => (
            msg.type === "user"
              ? <UserBubble key={msg.id} content={msg.content} />
              : <AIBubble key={msg.id} message={msg} isTyping={msg.id === typingId} lang={lang} />
          ))}

          {thinkingAI && <ThinkingBubble aiId={thinkingAI} />}

          {phase === "done" && (
            <>
              <NextQuestions questions={nextQuestions} onSelect={async (q) => {
                setNextQuestions([]);
                addUserMessage(q);
                setPhase("listening");
                await handleListening(q);
              }} loading={nextQLoading} lang={lang} />
            </>
          )}

          {error && (
            <div style={{ margin: "8px 0", padding: "10px 14px", background: "#EF444410", border: "1px solid #EF444440", borderRadius: 8, fontSize: 12, color: "#EF4444" }}>{error}</div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* 入力エリア */}
        <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "12px 16px", background: COLORS.bg, position: "sticky", bottom: 0 }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ background: COLORS.surface, border: `1px solid ${phase==="debating"?COLORS.accent+"40":COLORS.border}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.3s" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e=>setInput(e.target.value)}
                onCompositionStart={() => { isComposing.current = true; }}
                onCompositionEnd={() => { isComposing.current = false; }}
                onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey&&!isComposing.current){e.preventDefault();handleSend();} }}
                placeholder={phase==="debating"
                  ? (isJa?"AIたちが考えています...":"AIs are thinking...")
                  : (isJa?"メッセージを入力... (Enterで送信)":"Type a message... (Enter to send)")
                }
                rows={2}
                disabled={phase==="debating"}
                style={{ width: "100%", background: "transparent", border: "none", padding: "12px 14px", color: COLORS.text, fontSize: 15, fontFamily: "inherit", lineHeight: 1.6 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", borderTop: `1px solid ${COLORS.border}` }}>
                {/* AIセレクター（Claudeのモデル表示と同じ感じ） */}
                <div style={{ position: "relative" }}>
                  <button onClick={() => setAiPanelOpen(v=>!v)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 8 }}
                    onMouseEnter={e=>e.currentTarget.style.background=COLORS.sidebarHover}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                  >
                    {/* 選択済みAIのドット */}
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      {activeAIs.map(ai=>(
                        <div key={ai.id} style={{ width: 9, height: 9, borderRadius: "50%", background: ai.color, boxShadow: thinkingAI===ai.id?`0 0 6px ${ai.color}`:"none", transition: "box-shadow 0.3s" }} />
                      ))}
                      {activeAIs.length === 0 && <div style={{ width: 9, height: 9, borderRadius: "50%", background: COLORS.border }} />}
                    </div>
                    <span style={{ fontSize: 11, color: COLORS.muted }}>▲</span>
                  </button>

                  {/* AIセレクターパネル */}
                  {aiPanelOpen && (
                    <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 8, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", minWidth: 240, boxShadow: "0 4px 24px rgba(0,0,0,0.5)", animation: "fadeUp 0.2s ease", zIndex: 50 }}>
                      {/* AI選択 */}
                      <div style={{ padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}` }}>
                        <div style={{ fontSize: 11, color: COLORS.muted, fontFamily: "monospace", marginBottom: 8 }}>{isJa?"使うAIを選ぶ":"Select AIs"}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {AI_CONFIG.map(ai => {
                            const hasKey = ai.id === "claude" || apiKeys[ai.id]?.trim().length > 0;
                            const sel = selectedAIs.includes(ai.id);
                            return (
                              <div key={ai.id} onClick={() => {
                                if (!hasKey) return;
                                const next = sel
                                  ? (selectedAIs.length > 1 ? selectedAIs.filter(x=>x!==ai.id) : selectedAIs)
                                  : [...selectedAIs, ai.id];
                                setSelectedAIs(next);
                                lsSet(STORAGE_KEYS.selectedAIs, next);
                              }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: hasKey?"pointer":"not-allowed", background: sel && hasKey ? `${ai.color}15` : "transparent", opacity: hasKey?1:0.4, transition: "all 0.2s" }}
                                onMouseEnter={e=>{if(hasKey)e.currentTarget.style.background=`${ai.color}20`;}}
                                onMouseLeave={e=>{e.currentTarget.style.background=sel&&hasKey?`${ai.color}15`:"transparent";}}
                              >
                                <div style={{ width: 16, height: 16, borderRadius: 5, border: `2px solid ${sel&&hasKey?ai.color:COLORS.border}`, background: sel&&hasKey?ai.color:"transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  {sel && hasKey && <span style={{ color: "#000", fontSize: 10, fontWeight: 700 }}>✓</span>}
                                </div>
                                <div style={{ width: 7, height: 7, borderRadius: "50%", background: hasKey?ai.color:COLORS.muted, flexShrink: 0 }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: hasKey?(sel?ai.color:COLORS.text):COLORS.muted, fontFamily: "monospace", flex: 1 }}>{ai.name}</span>
                                {!hasKey && <span style={{ fontSize: 10, color: COLORS.muted }}>{isJa?"キー未設定":"No key"}</span>}
                                {hasKey && sel && selectedAIs.length === 1 && <span style={{ fontSize: 10, color: COLORS.muted }}>{isJa?"最低1つ":"Min 1"}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 順番設定（2つ以上選択時のみ） */}
                      {selectedAIs.length >= 2 && (
                        <div style={{ padding: "10px 12px" }}>
                          <div style={{ fontSize: 11, color: COLORS.muted, fontFamily: "monospace", marginBottom: 8 }}>{isJa?"議論の順番":"Debate Order"}</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {(() => {
                              const selAIs = AI_CONFIG.filter(a => selectedAIs.includes(a.id));
                              if (selAIs.length === 2) {
                                return [
                                  [selAIs[0].id, selAIs[1].id],
                                  [selAIs[1].id, selAIs[0].id],
                                ].map((pattern, i) => {
                                  const isSelected = JSON.stringify(debateOrder) === JSON.stringify(pattern);
                                  return (
                                    <button key={i} onClick={() => { setDebateOrder(pattern); lsSet("bridge_debate_order", pattern); }} style={{ padding: "6px 10px", background: isSelected?"#1A6BB520":COLORS.bg, border: `1px solid ${isSelected?COLORS.accent:COLORS.border}`, borderRadius: 6, color: isSelected?COLORS.accent:COLORS.muted, fontSize: 12, cursor: "pointer", fontFamily: "monospace", textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
                                      {pattern.map((id,idx) => (
                                        <span key={id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                          {idx > 0 && <span style={{ color: COLORS.border }}>→</span>}
                                          <span style={{ color: AI_CONFIG.find(a=>a.id===id)?.color }}>{AI_CONFIG.find(a=>a.id===id)?.name}</span>
                                        </span>
                                      ))}
                                    </button>
                                  );
                                });
                              }
                              // 3つの場合
                              const ids = selAIs.map(a=>a.id);
                              return [
                                [ids[0],ids[1],ids[2]],[ids[0],ids[2],ids[1]],
                                [ids[1],ids[0],ids[2]],[ids[1],ids[2],ids[0]],
                                [ids[2],ids[0],ids[1]],[ids[2],ids[1],ids[0]],
                              ].map((pattern, i) => {
                                const isSelected = JSON.stringify(debateOrder) === JSON.stringify(pattern);
                                return (
                                  <button key={i} onClick={() => { setDebateOrder(pattern); lsSet("bridge_debate_order", pattern); }} style={{ padding: "6px 10px", background: isSelected?"#1A6BB520":COLORS.bg, border: `1px solid ${isSelected?COLORS.accent:COLORS.border}`, borderRadius: 6, color: isSelected?COLORS.accent:COLORS.muted, fontSize: 12, cursor: "pointer", fontFamily: "monospace", textAlign: "left", display: "flex", alignItems: "center", gap: 4 }}>
                                    {pattern.map((id,idx) => (
                                      <span key={id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        {idx > 0 && <span style={{ color: COLORS.border, fontSize: 10 }}>→</span>}
                                        <span style={{ color: AI_CONFIG.find(a=>a.id===id)?.color }}>{AI_CONFIG.find(a=>a.id===id)?.name}</span>
                                      </span>
                                    ))}
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button onClick={handleSend} disabled={!input.trim()||phase==="debating"} style={{ background: input.trim()&&phase!=="debating"?`linear-gradient(135deg,${activeAIs[0]?.color||COLORS.gpt},${activeAIs[activeAIs.length-1]?.color||COLORS.gemini})`:COLORS.border, border: "none", borderRadius: 8, padding: "6px 16px", color: input.trim()&&phase!=="debating"?"#000":COLORS.muted, fontSize: 13, fontWeight: 600, cursor: input.trim()&&phase!=="debating"?"pointer":"not-allowed", transition: "all 0.2s" }}>
                  {phase==="debating"?(isJa?"考え中...":"Thinking..."):"→"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
