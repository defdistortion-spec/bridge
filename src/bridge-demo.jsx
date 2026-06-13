import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#0D1117",
  surface: "#161B22",
  border: "#21262D",
  gpt: "#10B981",
  claude: "#D97706",
  gemini: "#3B82F6",
  unified: "#E2E8F0",
  muted: "#6B7280",
  text: "#E2E8F0",
  sidebar: "#0D1117",
  sidebarHover: "#161B22",
};

const AI_CONFIG = [
  {
    id: "gpt", name: "GPT", role: "発散・仮説出し",
    color: COLORS.gpt, bg: "#10B98115", border: "#10B98140", delay: 800,
    summary: "3つの視点（フレームワーク活用・前提の疑い・データドリブン）から可能性を展開。",
    response: (q) => `【仮説と可能性の展開】\n\n「${q}」について、考えられる主要な視点をまず広げます。\n\n① 最も直接的なアプローチとして、既存のフレームワークを活用する方法があります。これは実績があり、リスクが低い反面、革新性に欠ける可能性があります。\n\n② より創造的な観点では、問題の前提そのものを疑うことが有効です。「なぜそれが問題なのか」を再定義することで、まったく別の解決策が見えてくることがあります。\n\n③ データドリブンな観点からは、まず現状の定量的な把握から始めることを推奨します。感覚ではなく数字で状況を把握することが、次のステップの精度を上げます。\n\n以上3つの方向性をベースに、さらに議論を深めることができます。`,
  },
  {
    id: "claude", name: "Claude", role: "批判・論理整理",
    color: COLORS.claude, bg: "#D9770615", border: "#D9770640", delay: 1600,
    summary: "GPTの3方向すべてに穴を指摘。「意思決定の軸を先に決めよ」と整理。",
    response: (q) => `【GPTの回答への批判的検討】\n\nGPTが提示した3つの方向性は有用ですが、いくつか重要な留意点を指摘します。\n\n▸ ①のフレームワーク活用について：「実績がある＝正しい」という前提は危険です。文脈が変われば有効性も変わります。どのフレームワークを、どの条件下で適用するかの精査が必要です。\n\n▸ ②の前提を疑うアプローチ：方向性は正しいですが、「前提を疑う」こと自体が目的化するリスクがあります。疑った結果として何を得るのかを先に定義すべきです。\n\n▸ ③のデータドリブンについて：最も堅実ですが、データ収集コストと意思決定スピードのトレードオフを考慮する必要があります。完璧なデータを待つことで機会を逃す「分析麻痺」に陥らないよう注意が必要です。\n\n【整理】この問いに答えるには、まず「何を優先するか」の意思決定軸を明確にすることが先決です。`,
  },
  {
    id: "gemini", name: "Gemini", role: "統合・結論",
    color: COLORS.gemini, bg: "#3B82F615", border: "#3B82F640", delay: 2400,
    summary: "両者を統合し「今は答えを出さないことが正解」と結論。問いの精度向上を最優先に。",
    response: (q) => `【両者の議論を統合した結論】\n\nGPTの多角的な仮説提示と、Claudeの批判的精査を踏まえた上で、実践的な結論を導きます。\n\n✦ 最優先すべきアクション\nまず「成功の定義」を明確にしてください。GPTが提示した3方向、Claudeが指摘したトレードオフ、いずれも「何を達成したいか」が固まらなければ評価できません。\n\n✦ 推奨する進め方\n1. 目標と制約条件を書き出す（1時間以内）\n2. GPTの②「前提を疑う」を起点に、Claudeが指摘した「疑う目的」を同時に定義する\n3. データ収集は「意思決定に必要な最小限」に絞る\n\n✦ 結論\n「${q}」に対する答えは、現時点では「まだ答えを出さないこと」が正解です。問いの精度を上げることが、最速の解決につながります。\n\n最新の研究でも、問題解決の質は「解決策の質」より「問いの質」に依存することが示されています。`,
  },
];

const DEMO_QUESTIONS = [
  "新しいビジネスを始めるべきか？",
  "AIは人間の仕事を奪うのか？",
  "どうすれば創造性を高められるか？",
];

const MOCK_HISTORY = {
  starred: [
    { id: 1, title: "新しいビジネスを始めるべきか？", date: "今日" },
    { id: 2, title: "AIは人間の仕事を奪うのか？", date: "昨日" },
  ],
  recent: [
    { id: 3, title: "どうすれば創造性を高められるか？", date: "今日" },
    { id: 4, title: "チームのモチベーションを上げるには？", date: "昨日" },
    { id: 5, title: "マーケティング戦略の立て方", date: "3日前" },
    { id: 6, title: "資金調達のタイミングはいつが最適か", date: "先週" },
    { id: 7, title: "プロダクトの差別化戦略について", date: "先週" },
  ],
};

function TypingText({ text, speed = 12 }) {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);
  useEffect(() => {
    idx.current = 0;
    setDisplayed("");
    if (!text) return;
    const timer = setInterval(() => {
      idx.current += 1;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text]);
  return (
    <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}>
      {displayed}
      {displayed.length < (text?.length || 0) && (
        <span style={{ opacity: 0.6, animation: "blink 1s infinite" }}>▋</span>
      )}
    </span>
  );
}

function AICardActive({ ai, message, isActive, isDone }) {
  const [showContent, setShowContent] = useState(false);
  useEffect(() => {
    if (isActive) { const t = setTimeout(() => setShowContent(true), 200); return () => clearTimeout(t); }
    setShowContent(false);
  }, [isActive]);
  return (
    <div style={{
      marginBottom: 16, borderRadius: 12,
      border: `1px solid ${isActive || isDone ? ai.border : COLORS.border}`,
      background: isActive || isDone ? ai.bg : COLORS.surface,
      overflow: "hidden", transition: "all 0.4s ease",
      opacity: isActive || isDone ? 1 : 0.35,
      transform: isActive ? "scale(1.01)" : "scale(1)",
      boxShadow: isActive ? `0 0 24px ${ai.color}30` : "none",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
        borderBottom: (isActive || isDone) && showContent && message ? `1px solid ${ai.border}` : "none",
      }}>
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

function AICardCollapsed({ ai, message }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      marginBottom: 8, borderRadius: 10,
      border: `1px solid ${open ? ai.border : COLORS.border}`,
      background: open ? ai.bg : COLORS.surface,
      overflow: "hidden", transition: "all 0.3s ease",
    }}>
      <div onClick={() => setOpen(v => !v)} style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
        cursor: "pointer", borderBottom: open ? `1px solid ${ai.border}` : "none",
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: ai.color, flexShrink: 0 }} />
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: ai.color, letterSpacing: 1, flexShrink: 0 }}>{ai.name}</span>
        <span style={{ fontSize: 13, color: COLORS.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ai.summary}</span>
        <span style={{ fontSize: 11, color: open ? ai.color : COLORS.muted, fontFamily: "monospace", flexShrink: 0, marginLeft: 8, transition: "color 0.2s" }}>
          {open ? "▲ 閉じる" : "▼ 全文"}
        </span>
      </div>
      {open && (
        <div style={{ padding: "16px 20px", animation: "fadeIn 0.25s ease" }}>
          <p style={{ margin: 0, fontSize: 14, color: COLORS.text, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{message}</p>
        </div>
      )}
    </div>
  );
}

function UnifiedAnswer({ text, visible }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (visible) { const t = setTimeout(() => setShow(true), 300); return () => clearTimeout(t); }
    setShow(false);
  }, [visible]);
  if (!visible) return null;
  return (
    <div style={{
      marginTop: 16, borderRadius: 12, border: "1px solid #E2E8F040",
      background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
      overflow: "hidden", opacity: show ? 1 : 0, transition: "opacity 0.6s ease",
      boxShadow: "0 0 40px #E2E8F010",
    }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F020", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>⚡</span>
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: COLORS.unified, letterSpacing: 1 }}>BRIDGE</span>
        <span style={{ fontSize: 12, color: COLORS.muted }}>統合回答</span>
      </div>
      {show && (
        <div style={{ padding: "18px 20px" }}>
          <p style={{ margin: 0, fontSize: 14, color: COLORS.text, lineHeight: 1.75 }}>
            <TypingText text={text} speed={10} />
          </p>
        </div>
      )}
    </div>
  );
}

function Sidebar({ open, onClose }) {
  const [starredOpen, setStarredOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);

  return (
    <>
      {/* オーバーレイ */}
      {open && (
        <div onClick={onClose} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 200, transition: "opacity 0.3s",
        }} />
      )}

      {/* サイドバー本体 */}
      <div style={{
        position: "fixed", top: 0, left: 0, height: "100vh",
        width: 280,
        background: COLORS.sidebar,
        borderRight: `1px solid ${COLORS.border}`,
        zIndex: 300,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        {/* サイドバーヘッダー */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 16px",
          borderBottom: `1px solid ${COLORS.border}`,
          position: "sticky", top: 0, background: COLORS.sidebar, zIndex: 1,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[COLORS.gpt, COLORS.claude, COLORS.gemini].map((c, i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
              ))}
            </div>
            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: COLORS.text, letterSpacing: 2 }}>BRIDGE</span>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: COLORS.muted,
            cursor: "pointer", fontSize: 18, padding: "2px 6px",
            borderRadius: 6, transition: "all 0.2s",
          }}
            onMouseEnter={e => e.target.style.color = COLORS.text}
            onMouseLeave={e => e.target.style.color = COLORS.muted}
          >✕</button>
        </div>

        {/* 新しい議論ボタン */}
        <div style={{ padding: "12px 12px 8px" }}>
          <button onClick={onClose} style={{
            width: "100%", background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8, padding: "10px 14px",
            color: COLORS.text, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 10,
            transition: "all 0.2s", fontFamily: "inherit",
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#3B82F6"}
            onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
          >
            <span style={{ fontSize: 16 }}>＋</span>
            <span>新しい議論を始める</span>
          </button>
        </div>

        {/* マイページ */}
        <div style={{ padding: "4px 12px" }}>
          {[
            { icon: "👤", label: "マイページ" },
            { icon: "⚙️", label: "設定" },
          ].map(({ icon, label }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 10px", borderRadius: 8, cursor: "pointer",
              color: COLORS.muted, fontSize: 13, transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = COLORS.sidebarHover; e.currentTarget.style.color = COLORS.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = COLORS.muted; }}
            >
              <span style={{ fontSize: 15 }}>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: COLORS.border, margin: "8px 12px" }} />

        {/* スター付き */}
        <div style={{ padding: "0 12px" }}>
          <div onClick={() => setStarredOpen(v => !v)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 10px", cursor: "pointer", borderRadius: 8,
            color: COLORS.muted, fontSize: 12, fontFamily: "monospace",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.color = COLORS.text}
            onMouseLeave={e => e.currentTarget.style.color = COLORS.muted}
          >
            <span>⭐ スター付き</span>
            <span style={{ fontSize: 10 }}>{starredOpen ? "▲" : "▼"}</span>
          </div>
          {starredOpen && MOCK_HISTORY.starred.map(item => (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 8, cursor: "pointer",
              transition: "all 0.2s",
            }}
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

        {/* 最近の議論 */}
        <div style={{ padding: "0 12px", flex: 1 }}>
          <div onClick={() => setRecentOpen(v => !v)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 10px", cursor: "pointer", borderRadius: 8,
            color: COLORS.muted, fontSize: 12, fontFamily: "monospace",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.color = COLORS.text}
            onMouseLeave={e => e.currentTarget.style.color = COLORS.muted}
          >
            <span>🕐 最近の議論</span>
            <span style={{ fontSize: 10 }}>{recentOpen ? "▲" : "▼"}</span>
          </div>
          {recentOpen && MOCK_HISTORY.recent.map(item => (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 8, cursor: "pointer",
              transition: "all 0.2s",
            }}
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

        {/* フッター */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #10B981, #3B82F6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "#000",
            }}>H</div>
            <div>
              <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>Herald</div>
              <div style={{ fontSize: 11, color: COLORS.muted }}>Freeプラン</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState("idle");
  const [activeAI, setActiveAI] = useState(null);
  const [doneAIs, setDoneAIs] = useState([]);
  const [messages, setMessages] = useState({});
  const [showUnified, setShowUnified] = useState(false);
  const [currentQ, setCurrentQ] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [activeAI, showUnified]);

  const runDebate = () => {
    if (!question.trim() || phase === "running") return;
    const q = question.trim();
    setCurrentQ(q);
    setPhase("running");
    setActiveAI(null);
    setDoneAIs([]);
    setMessages({});
    setShowUnified(false);

    AI_CONFIG.forEach((ai, i) => {
      setTimeout(() => {
        setActiveAI(ai.id);
        setMessages(prev => ({ ...prev, [ai.id]: ai.response(q) }));
        setTimeout(() => {
          setDoneAIs(prev => [...prev, ai.id]);
          if (i === AI_CONFIG.length - 1) {
            setActiveAI(null);
            setTimeout(() => { setShowUnified(true); setPhase("done"); }, 600);
          }
        }, 3200);
      }, ai.delay + i * 3400);
    });
  };

  const reset = () => {
    setPhase("idle"); setQuestion(""); setCurrentQ("");
    setActiveAI(null); setDoneAIs([]); setMessages({}); setShowUnified(false);
  };

  const unifiedText = currentQ
    ? `3つのAIの議論を統合した結論：\n\n「${currentQ}」に対して、GPT・Claude・Geminiが異なる視点から検討した結果、共通して浮かび上がったのは「問いの精度が解の質を決める」という点です。\n\n▸ GPTが提示した多角的仮説は、可能性の地図として有効\n▸ Claudeが指摘した批判的視点は、思考の罠を回避するための安全装置\n▸ Geminiが導いた結論は、両者の知見を統合した実践的指針\n\nBRIDGEの最終提言：まず「この問いで本当に何を解決したいのか」を1文で書き出してください。それだけで、答えの輪郭が見えてきます。`
    : "";

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
        textarea:focus { outline: none; }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0D1117; }
        ::-webkit-scrollbar-thumb { background: #21262D; border-radius: 3px; }
      `}</style>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* メインコンテンツ（サイドバー開閉で右にズレる） */}
      <div style={{
        marginLeft: sidebarOpen ? 280 : 0,
        transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        minHeight: "100vh",
      }}>
        {/* Header */}
        <div style={{
          borderBottom: `1px solid ${COLORS.border}`,
          padding: "16px 20px",
          display: "flex", alignItems: "center", gap: 14,
          position: "sticky", top: 0, background: COLORS.bg, zIndex: 100,
        }}>
          {/* ハンバーガーメニュー */}
          <button onClick={() => setSidebarOpen(v => !v)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "6px", borderRadius: 8, color: COLORS.muted,
            display: "flex", flexDirection: "column", gap: 5,
            transition: "all 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.color = COLORS.text}
            onMouseLeave={e => e.currentTarget.style.color = COLORS.muted}
          >
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 20, height: 2, background: "currentColor", borderRadius: 2, transition: "all 0.2s" }} />
            ))}
          </button>

          <div style={{ display: "flex", gap: 6 }}>
            {[COLORS.gpt, COLORS.claude, COLORS.gemini].map((c, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%", background: c,
                boxShadow: isRunning ? `0 0 8px ${c}` : "none", transition: "box-shadow 0.3s",
              }} />
            ))}
          </div>
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 18, color: COLORS.text, letterSpacing: 2 }}>BRIDGE</span>
          <span style={{ fontSize: 12, color: COLORS.muted }}>マルチAI議論プラットフォーム</span>
        </div>

        {/* Main */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 0" }}>

          {/* Hero */}
          {phase === "idle" && (
            <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeIn 0.6s ease" }}>
              <h1 style={{
                fontSize: 36, fontWeight: 700, margin: "0 0 12px",
                background: `linear-gradient(135deg, ${COLORS.gpt}, ${COLORS.claude}, ${COLORS.gemini})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1,
              }}>3つのAIが議論する</h1>
              <p style={{ color: COLORS.muted, fontSize: 15, margin: "0 0 32px" }}>
                GPT・Claude・Geminiが互いの回答を読み、議論して、最良の答えを導く
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {DEMO_QUESTIONS.map(q => (
                  <button key={q} onClick={() => setQuestion(q)} style={{
                    background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                    borderRadius: 20, padding: "8px 16px", color: COLORS.muted,
                    fontSize: 13, cursor: "pointer", transition: "all 0.2s",
                  }}
                    onMouseEnter={e => { e.target.style.borderColor = "#3B82F6"; e.target.style.color = COLORS.text; }}
                    onMouseLeave={e => { e.target.style.borderColor = COLORS.border; e.target.style.color = COLORS.muted; }}
                  >{q}</button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{
            background: COLORS.surface,
            border: `1px solid ${isRunning ? "#3B82F640" : COLORS.border}`,
            borderRadius: 12, overflow: "hidden", marginBottom: 28,
            transition: "border-color 0.3s",
            boxShadow: isRunning ? "0 0 20px #3B82F615" : "none",
          }}>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runDebate(); } }}
              placeholder="質問を入力してください... (Enter で議論開始)"
              rows={3} disabled={isRunning}
              style={{
                width: "100%", background: "transparent", border: "none",
                padding: "16px 18px", color: COLORS.text, fontSize: 15,
                fontFamily: "inherit", lineHeight: 1.6,
              }}
            />
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 18px", borderTop: `1px solid ${COLORS.border}`,
            }}>
              <div style={{ display: "flex", gap: 16 }}>
                {AI_CONFIG.map(ai => (
                  <span key={ai.id} style={{
                    fontSize: 12,
                    color: activeAI === ai.id ? ai.color : doneAIs.includes(ai.id) ? ai.color + "80" : COLORS.muted,
                    fontFamily: "monospace", transition: "color 0.3s",
                  }}>
                    {activeAI === ai.id ? "● " : doneAIs.includes(ai.id) ? "✓ " : "○ "}{ai.name}
                  </span>
                ))}
              </div>
              <button onClick={runDebate} disabled={!question.trim() || isRunning} style={{
                background: question.trim() && !isRunning
                  ? `linear-gradient(135deg, ${COLORS.gpt}, ${COLORS.gemini})` : COLORS.border,
                border: "none", borderRadius: 8, padding: "8px 20px",
                color: question.trim() && !isRunning ? "#000" : COLORS.muted,
                fontSize: 13, fontWeight: 600,
                cursor: question.trim() && !isRunning ? "pointer" : "not-allowed",
                transition: "all 0.2s", fontFamily: "monospace", letterSpacing: 0.5,
              }}>
                {isRunning ? "議論中..." : "議論開始 →"}
              </button>
            </div>
          </div>

          {/* Results */}
          {(isRunning || isDone) && (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              {currentQ && (
                <div style={{
                  marginBottom: 20, padding: "12px 16px",
                  background: COLORS.surface, borderRadius: 8,
                  border: `1px solid ${COLORS.border}`, fontSize: 13, color: COLORS.muted,
                }}>
                  <span style={{ color: COLORS.text, fontWeight: 500 }}>Q: </span>{currentQ}
                </div>
              )}
              {isRunning && AI_CONFIG.map(ai => (
                <AICardActive key={ai.id} ai={ai} message={messages[ai.id]}
                  isActive={activeAI === ai.id} isDone={doneAIs.includes(ai.id)} />
              ))}
              {isDone && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: 11, color: COLORS.muted, margin: "0 0 8px", fontFamily: "monospace" }}>
                      ▼ 各AIの回答（クリックで全文表示）
                    </p>
                    {AI_CONFIG.map(ai => (
                      <AICardCollapsed key={ai.id} ai={ai} message={messages[ai.id]} />
                    ))}
                  </div>
                  <UnifiedAnswer text={unifiedText} visible={showUnified} />
                </>
              )}
            </div>
          )}

          {isDone && (
            <div style={{ textAlign: "center", marginTop: 28 }}>
              <button onClick={reset} style={{
                background: "transparent", border: `1px solid ${COLORS.border}`,
                borderRadius: 8, padding: "10px 24px", color: COLORS.muted,
                fontSize: 13, cursor: "pointer", fontFamily: "monospace", transition: "all 0.2s",
              }}
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
