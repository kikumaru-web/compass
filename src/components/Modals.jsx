import { useState, useEffect } from "react";
import { C, DEADLINE_KINDS, STUDY_CATEGORIES, daysUntil, formatDate, getAnthropicKey } from "../constants";
import { sbRest } from "../lib/supabase";
import { Badge, Btn, inputStyle } from "./UI";

/* ===== 締切リマインダー ===== */
export function DeadlineReminderModal({ deadlines, onClose }) {
  const active = deadlines
    .filter((d) => !d.done && d.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.bg, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 600, maxHeight: "80vh", overflowY: "auto", padding: "24px 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: C.teal, letterSpacing: 1 }}>📅 TODAY'S REMINDER</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>締切の確認</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.cardBorder}`, color: C.sub, borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>確認した</button>
        </div>
        {active.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.teal }}>今のところ締切はありません</div>
            <div style={{ fontSize: 13, color: C.sub, marginTop: 8 }}>余裕があるうちに次の一手を考えよう</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {active.map((dl) => {
              const d = daysUntil(dl.due_date);
              const past = d < 0;
              const col = past ? C.red : d === 0 ? C.red : d <= 2 ? C.red : d <= 7 ? C.yellow : C.sub;
              const urgency = past ? `${-d}日超過` : d === 0 ? "今日！" : d === 1 ? "明日" : `${d}日後`;
              const kind = DEADLINE_KINDS.find((k) => k.id === dl.kind);
              const name = dl.kind === "その他" && dl.label ? dl.label : dl.kind;
              return (
                <div key={dl.id} style={{ background: past || d <= 2 ? `${C.red}10` : C.card, border: `1px solid ${col}44`, borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{dl.company_name}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 5 }}>
                      <Badge color={kind?.color || C.sub}>{kind?.icon} {name}</Badge>
                      <span style={{ fontSize: 12, color: C.faint }}>{formatDate(dl.due_date)}{dl.due_time ? ` ${dl.due_time}` : ""}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: col, flexShrink: 0 }}>{urgency}</div>
                </div>
              );
            })}
          </div>
        )}
        <button onClick={onClose} style={{ width: "100%", marginTop: 20, background: `linear-gradient(135deg, ${C.teal}, #2d9e97)`, border: "none", borderRadius: 14, padding: "14px", cursor: "pointer", fontSize: 15, fontWeight: 800, color: "#0f0e17", fontFamily: "inherit" }}>
          OK、把握した！
        </button>
      </div>
    </div>
  );
}

/* ===== Daily Challenge ===== */
function fillMatch(u, c) { const cl = (s) => String(s||"").replace(/[,、，　]/g,"").replace(/[Ａ-Ｚａ-ｚ０-９]/g,(ch)=>String.fromCharCode(ch.charCodeAt(0)-0xFEE0)).trim().toLowerCase(); const n = (s) => s.replace(/[^0-9.]/g,""); const a=cl(u),b=cl(c); if(a===b) return true; const an=n(a),bn=n(b); return an.length>0&&bn.length>0&&an===bn; }
function choiceMatch(u, c, ch) { if(!ch||ch.length===0) return false; const ci=ch.findIndex((x)=>x.toLowerCase().trim()===(c||"").toLowerCase().trim()); if(ci>=0&&+u===ci) return true; return (ch[+u]||"").toLowerCase().trim()===(c||"").toLowerCase().trim(); }

function buildPrompt(cat) {
  const base = { "SPI非言語":"SPIの非言語問題を1問。推論・暗号・確率・速度から。","SPI言語":"SPIの言語問題を1問。本文を含めて。","フェルミ":"フェルミ推定を1問。","ケース":"ケース面接問題を1問。" };
  const p = base[cat] || `${cat}の問題を1問作成。`;
  return p + `大問形式で小問2〜3つ。全てchoiceまたはfill形式。\n必ずJSON形式で返してください：\n{"title":"タイトル","category":"${cat}","subproblems":[{"question":"問題","type":"choice"|"fill","choices":["A","B","C","D"],"answer":"正解","explanation":"解説"}]}`;
}

export function DailyChallengeModal({ studyProblems, setStudyProblems, studyLogs, setStudyLogs, userId, onComplete, onSkip }) {
  const [step, setStep] = useState("loading");
  const [problem, setProblem] = useState(null);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [error, setError] = useState("");
  const key = getAnthropicKey();

  useEffect(() => { loadProblem(); }, []);

  const loadProblem = async () => {
    setStep("loading");
    // バンクから出題を試みる
    if (studyProblems && studyProblems.length > 0) {
      const threeDaysAgo = new Date(Date.now() - 3*86400000).toLocaleDateString("ja-JP");
      const recentIds = new Set((studyLogs||[]).filter((l) => l.date >= threeDaysAgo).map((l) => l.problem_id).filter(Boolean));
      const fresh = studyProblems.filter((p) => !recentIds.has(p.id));
      const pool = fresh.length > 0 ? fresh : studyProblems;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setProblem({ ...pick, source: "bank" }); setStep("problem"); return;
    }
    // AI生成
    if (key) {
      try {
        const cat = STUDY_CATEGORIES[Math.floor(Math.random() * STUDY_CATEGORIES.length)];
        const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 2500, messages: [{ role: "user", content: buildPrompt(cat) }] }) });
        const data = await res.json(); const text = data.content?.[0]?.text || "";
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
        setProblem({ ...parsed, source: "ai" }); setStep("problem"); return;
      } catch {}
    }
    setError(key ? "問題の生成に失敗しました" : "APIキー未設定。StudyタブでClaudeのAPIキーを設定してください。");
    setStep("empty");
  };

  const checkAnswers = () => {
    let correct = 0;
    (problem.subproblems || []).forEach((sub, i) => {
      if (sub.type === "text") { correct++; return; }
      if (sub.type === "choice" ? choiceMatch(answers[i], sub.answer, sub.choices) : fillMatch(answers[i], sub.answer)) correct++;
    });
    setScore(correct); setStep("result");
  };

  const saveAndComplete = async () => {
    const subs = problem.subproblems || [];
    const entry = { user_id: userId, problem_id: problem.id || null, category: problem.category, title: problem.title, date: new Date().toLocaleDateString("ja-JP"), answers, score, max_score: subs.length, memo: "" };
    try { const [row] = await sbRest("POST", "study_logs", entry); if (setStudyLogs) setStudyLogs((p) => [row || entry, ...p]); } catch { if (setStudyLogs) setStudyLogs((p) => [entry, ...p]); }
    onComplete(score === subs.length ? 1 : 0);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: C.bg, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", padding: "24px 20px 40px" }}>

        {step === "loading" && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.teal }}>今日の問題を準備中…</div>
          </div>
        )}

        {step === "empty" && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>🎯 Daily Challenge</div>
            {error && <div style={{ fontSize: 13, color: C.yellow, marginBottom: 16, background: `${C.yellow}15`, padding: "10px 14px", borderRadius: 10 }}>{error}</div>}
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 24 }}>問題バンクに問題を追加するか、StudyタブでAPIキーを設定するとAIが問題を生成します。</div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" onClick={() => onSkip()} style={{ flex: 1 }}>あとでやる</Btn>
              <Btn onClick={() => onSkip()} style={{ flex: 1 }}>閉じる</Btn>
            </div>
          </div>
        )}

        {step === "problem" && problem && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: C.teal, letterSpacing: 1 }}>🎯 TODAY'S CHALLENGE</div>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <Badge color={C.teal}>{problem.category}</Badge>
                  {problem.source === "ai" && <Badge color={C.purple}>AI生成</Badge>}
                </div>
              </div>
              <button onClick={() => onSkip(problem)} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>あとでやる</button>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, lineHeight: 1.5 }}>{problem.title}</div>
            {(problem.subproblems || []).map((sub, i) => (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: "14px 16px", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>({i + 1}) {sub.question}</div>
                {sub.type === "choice" && (sub.choices || []).map((ch, j) => (
                  <button key={j} onClick={() => setAnswers((a) => ({ ...a, [i]: String(j) }))} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", marginBottom: 6, borderRadius: 10, border: `1px solid ${answers[i] === String(j) ? C.teal : C.cardBorder}`, background: answers[i] === String(j) ? `${C.teal}22` : "transparent", color: C.text, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>{ch}</button>
                ))}
                {sub.type === "fill" && <input style={inputStyle} value={answers[i] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))} placeholder="答えを入力" />}
                {sub.type === "text" && <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={answers[i] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))} placeholder="自分の考えを入力" />}
              </div>
            ))}
            <Btn onClick={checkAnswers} style={{ width: "100%" }}>答え合わせ →</Btn>
          </div>
        )}

        {step === "result" && problem && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>{score === (problem.subproblems || []).length ? "🎉" : "📝"}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.teal }}>{score} / {(problem.subproblems || []).length}</div>
              <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>{score === (problem.subproblems || []).length ? "+1pt 獲得！" : "惜しい…次は全問正解で+1pt"}</div>
            </div>
            {(problem.subproblems || []).map((sub, i) => {
              const isText = sub.type === "text"; const userAns = answers[i] || "";
              const correctIdx = sub.choices ? sub.choices.findIndex((c) => c.toLowerCase() === (sub.answer || "").toLowerCase()) : -1;
              const isCorrect = isText ? true : (sub.type === "choice" ? choiceMatch(userAns, sub.answer, sub.choices) : fillMatch(userAns, sub.answer));
              return (
                <div key={i} style={{ background: C.card, border: `1px solid ${isText ? C.cardBorder : isCorrect ? C.green + "44" : C.red + "44"}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isText ? C.sub : isCorrect ? C.green : C.red, marginBottom: 6 }}>({i + 1}) {isText ? "自己採点" : isCorrect ? "✓ 正解" : "✗ 不正解"}</div>
                  {!isText && <div style={{ fontSize: 12, color: C.sub, marginBottom: 4 }}>あなたの回答：{sub.choices ? (sub.choices[+userAns] || "未回答") : (userAns || "未回答")}</div>}
                  {!isText && !isCorrect && <div style={{ fontSize: 12, color: C.green, marginBottom: 4 }}>正解：{sub.choices ? sub.choices[correctIdx] : sub.answer}</div>}
                  {sub.explanation && <div style={{ fontSize: 12, color: C.teal, background: `${C.teal}12`, padding: "8px 10px", borderRadius: 8, marginTop: 6 }}>💡 {sub.explanation}</div>}
                </div>
              );
            })}
            {problem?.source === "ai" && (
              <Btn variant="ghost" onClick={async () => { try { const rows = await sbRest("POST", "study_problems", { user_id: userId, category: problem.category, title: problem.title, subproblems: problem.subproblems, memo: "Daily Challengeから保存" }); if (setStudyProblems) setStudyProblems((p) => [rows[0] || { id: Date.now(), ...problem }, ...p]); alert("バンクに保存しました！"); } catch (e) { alert("保存失敗: " + e.message); } }} style={{ width: "100%", marginBottom: 8, fontSize: 12 }}>📦 バンクに保存</Btn>
            )}
            <Btn onClick={saveAndComplete} style={{ width: "100%" }}>{score === (problem.subproblems || []).length ? "記録して +1pt 獲得 🎉" : "記録して閉じる"}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
