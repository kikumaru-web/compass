import { useState, useEffect } from "react";
import { C, DEADLINE_KINDS, todayStr, daysUntil, calcLevel } from "../constants";
import { Badge, Card, Btn, Section, inputStyle } from "./UI";

function getWeekMonday() {
  const d = new Date(); const day = d.getDay(); const off = day === 0 ? -6 : 1 - day;
  const m = new Date(d); m.setDate(d.getDate() + off); m.setHours(0, 0, 0, 0); return m;
}

function pickSuggestions(tasks, deadlines, logs, weekGoal, weekPoints) {
  const today = todayStr();
  const todayDoneContents = new Set(logs.filter((l) => l.date === today).map((l) => l.content));
  const pending = tasks.filter((t) => t.status !== "完了" && !todayDoneContents.has(t.title));
  const scored = pending.map((t) => {
    let score = 0; const d = t.deadline ? daysUntil(t.deadline) : null;
    if (d !== null && d <= 3) score += 10; else if (d !== null && d <= 7) score += 5;
    if (t.priority === "高") score += 6; else if (t.priority === "中") score += 3;
    if (t.points >= 3) score += 2; else if (t.points <= 1) score += 1;
    return { ...t, _score: score };
  });
  scored.sort((a, b) => b._score - a._score);
  const picks = []; for (const t of scored) { if (picks.length >= 3) break; picks.push(t); }
  return picks;
}

function JobTimeline() {
  const segments = [
    { label: "夏インターン", start: new Date("2026-05-01"), end: new Date("2026-09-30"), color: "#4ECDC4" },
    { label: "冬インターン", start: new Date("2026-10-01"), end: new Date("2027-01-31"), color: "#C3A6FF" },
    { label: "本選考準備", start: new Date("2026-12-01"), end: new Date("2027-02-28"), color: "#FFE66D" },
    { label: "本選考", start: new Date("2027-03-01"), end: new Date("2027-06-30"), color: "#FF6B6B" },
  ];
  const timelineStart = new Date("2026-04-01"); const timelineEnd = new Date("2027-06-30");
  const totalMs = timelineEnd - timelineStart; const today = new Date();
  const todayPct = Math.max(0, Math.min(100, ((today - timelineStart) / totalMs) * 100));
  const months = []; let d = new Date(timelineStart);
  while (d <= timelineEnd) { months.push(new Date(d)); d = new Date(d.getFullYear(), d.getMonth() + 1, 1); }
  const pct = (date) => Math.max(0, Math.min(100, ((new Date(date) - timelineStart) / totalMs) * 100));

  return (
    <Card style={{ marginBottom: 16, padding: "16px 16px 18px" }}>
      <div style={{ fontSize: 11, color: C.teal, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>📅 就活タイムライン</div>
      <div style={{ position: "relative", height: 52, marginBottom: 8 }}>
        <div style={{ position: "absolute", top: 32, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 99 }} />
        {segments.map((seg) => { const left = pct(seg.start); const width = Math.max(1, pct(seg.end) - left); return (<div key={seg.label} style={{ position: "absolute", left: `${left}%`, width: `${width}%`, top: 20, height: 14, background: seg.color + "55", border: `1px solid ${seg.color}88`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}><span style={{ fontSize: 8, color: seg.color, fontWeight: 700, whiteSpace: "nowrap", padding: "0 3px", overflow: "hidden", textOverflow: "clip" }}>{seg.label}</span></div>); })}
        {todayPct >= 0 && todayPct <= 100 && (<div style={{ position: "absolute", left: `${todayPct}%`, top: 0, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}><span style={{ fontSize: 20, lineHeight: 1 }}>🐢</span><div style={{ width: 2, height: 18, background: C.teal, borderRadius: 1, marginTop: 2 }} /></div>)}
      </div>
      <div style={{ position: "relative", height: 16 }}>
        {months.map((m) => { const left = pct(m); if (left < 0 || left > 99) return null; const isCurrentMonth = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth(); return (<div key={m.toISOString()} style={{ position: "absolute", left: `${left}%`, transform: "translateX(-50%)", fontSize: 9, color: isCurrentMonth ? C.teal : C.faint, fontWeight: isCurrentMonth ? 700 : 400, whiteSpace: "nowrap" }}>{m.getMonth() + 1}月</div>); })}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        {segments.map((seg) => (<div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: seg.color + "77", border: `1px solid ${seg.color}` }} /><span style={{ fontSize: 10, color: C.faint }}>{seg.label}</span></div>))}
      </div>
    </Card>
  );
}

export default function DashboardView({ tasks, companies, logs, deadlines, rewards, spendable, weekGoal, saveWeekGoal, setView, addLog, onShowDailyChallenge, dailyDone }) {
  const [editGoal, setEditGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState({ points: weekGoal?.points || 20, note: weekGoal?.note || "" });
  const [finishItems, setFinishItems] = useState(() => { try { return JSON.parse(localStorage.getItem("compass_finish_" + todayStr()) || "[]"); } catch { return []; } });
  const [finishInput, setFinishInput] = useState("");
  const [showFinishEdit, setShowFinishEdit] = useState(false);

  useEffect(() => { if (window._compassRemoteFinishItems) { setFinishItems(window._compassRemoteFinishItems); window._compassRemoteFinishItems = null; } });
  const persistFinish = async (items) => { setFinishItems(items); try { localStorage.setItem("compass_finish_" + todayStr(), JSON.stringify(items)); } catch {} if (window._compassUpsertSettings) window._compassUpsertSettings({ finish_items: { date: todayStr(), items } }); };
  useEffect(() => { setGoalDraft({ points: weekGoal?.points || 20, note: weekGoal?.note || "" }); }, [weekGoal]);

  const toggleFinish = (i) => persistFinish(finishItems.map((item, idx) => idx === i ? { ...item, done: !item.done } : item));
  const addFinishItem = () => { if (!finishInput.trim()) return; persistFinish([...finishItems, { label: finishInput.trim(), done: false }]); setFinishInput(""); };
  const removeFinishItem = (i) => persistFinish(finishItems.filter((_, idx) => idx !== i));

  const mon = getWeekMonday();
  const weekLogs = logs.filter((l) => new Date(l.date + "T12:00:00") >= mon);
  const weekPoints = weekLogs.reduce((s, l) => s + (l.points || 0), 0);
  const totalXP = logs.reduce((s, l) => s + (l.points || 0), 0);
  const todayLogs = logs.filter((l) => l.date === todayStr());
  const todayPoints = todayLogs.reduce((s, l) => s + (l.points || 0), 0);
  const goalPts = weekGoal?.points || 20;
  const { level, remaining, needed } = calcLevel(totalXP);

  const urgent = (deadlines || []).filter((d) => !d.done && d.due_date && daysUntil(d.due_date) >= 0 && daysUntil(d.due_date) <= 7).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const sortedR = [...(rewards || [])].sort((a, b) => a.cost - b.cost);
  const nextReward = sortedR.find((r) => r.cost > spendable);

  const finishDone = finishItems.filter((i) => i.done).length;
  const finishTotal = finishItems.length;
  const finishPct = finishTotal > 0 ? Math.round((finishDone / finishTotal) * 100) : 0;
  const canFinish = finishTotal > 0 && finishDone >= Math.ceil(finishTotal * 0.8);

  return (
    <div>
      <Section kicker="今日の起点" title="ダッシュボード" />
      <JobTimeline />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <Card glow={C.teal} style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #4ECDC4, #2d9e97)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#0f0e17" }}>{level}</div>
            <div><div style={{ fontSize: 13, fontWeight: 800 }}>Level {level}</div><div style={{ fontSize: 10, color: C.sub }}>累計 {totalXP}XP</div></div>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", width: `${(remaining / needed) * 100}%`, background: "linear-gradient(90deg, #4ECDC4, #2ee8dc)", borderRadius: 99 }} /></div>
          <div style={{ fontSize: 10, color: C.faint, marginTop: 4 }}>次まで {needed - remaining}XP</div>
        </Card>
        <Card glow={C.yellow} style={{ padding: 14, cursor: "pointer" }} onClick={() => setView("rewards")}>
          <div style={{ fontSize: 10, color: C.sub, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>使えるポイント</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.yellow, lineHeight: 1 }}>{spendable}<span style={{ fontSize: 12, color: C.faint, marginLeft: 3 }}>pt</span></div>
          <div style={{ fontSize: 10, color: C.teal, marginTop: 6 }}>ご褒美を見る →</div>
        </Card>
      </div>

      {!dailyDone && onShowDailyChallenge && (
        <button onClick={onShowDailyChallenge} style={{ width: "100%", marginBottom: 16, background: `linear-gradient(135deg, ${C.teal}22, ${C.purple}22)`, border: `1px solid ${C.teal}55`, borderRadius: 16, padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, fontFamily: "inherit", textAlign: "left" }}>
          <span style={{ fontSize: 32, flexShrink: 0 }}>🎯</span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 800, color: C.teal }}>今日の問題に挑戦する</div><div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>Daily Challenge・未回答</div></div>
          <span style={{ fontSize: 20, color: C.teal }}>→</span>
        </button>
      )}
      {dailyDone && (<div style={{ marginBottom: 16, background: `${C.green}12`, border: `1px solid ${C.green}33`, borderRadius: 16, padding: "10px 18px", display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 18 }}>✅</span><div style={{ fontSize: 13, color: C.green, fontWeight: 700 }}>今日のDaily Challenge 完了！</div></div>)}

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: C.sub, letterSpacing: 1, textTransform: "uppercase" }}>📅 直近の締切</span>
          <button onClick={() => setView && setView("deadlines")} style={{ background: "none", border: "none", color: C.teal, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>すべて →</button>
        </div>
        {urgent.length === 0 ? <div style={{ color: C.faint, fontSize: 13 }}>7日以内の締切なし</div> : urgent.map((dl) => {
          const d = daysUntil(dl.due_date); const col = d <= 2 ? C.red : d <= 4 ? C.yellow : C.sub; const kind = DEADLINE_KINDS.find((k) => k.id === dl.kind); const name = dl.kind === "その他" && dl.label ? dl.label : dl.kind;
          return (<div key={dl.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}><div><div style={{ fontSize: 13 }}>{dl.company_name}</div><div style={{ fontSize: 11, color: C.faint }}>{kind?.icon} {name}</div></div><Badge color={col}>{d === 0 ? "今日" : d === 1 ? "明日" : `${d}日後`}</Badge></div>);
        })}
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: C.sub, letterSpacing: 1, textTransform: "uppercase" }}>今週の目標</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ fontSize: 12, color: C.teal, fontWeight: 700 }}>{weekPoints} / {goalPts}pt</span><button onClick={() => setEditGoal(!editGoal)} style={{ background: "none", border: "none", color: C.faint, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{editGoal ? "閉じる" : "編集"}</button></div>
        </div>
        {editGoal ? (
          <div>
            <input style={{ ...inputStyle, marginBottom: 8 }} type="number" value={goalDraft.points} onChange={(e) => setGoalDraft((g) => ({ ...g, points: +e.target.value }))} placeholder="目標pt" />
            <input style={{ ...inputStyle, marginBottom: 8 }} value={goalDraft.note} onChange={(e) => setGoalDraft((g) => ({ ...g, note: e.target.value }))} placeholder="今週のテーマ（任意）" />
            <Btn onClick={() => { saveWeekGoal(goalDraft); setEditGoal(false); }}>保存</Btn>
          </div>
        ) : (
          <div>
            {weekGoal?.note && <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>{weekGoal.note}</div>}
            <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, (weekPoints / goalPts) * 100)}%`, background: "linear-gradient(90deg, #4ECDC4, #2ee8dc)", borderRadius: 99, transition: "width 0.6s" }} /></div>
            <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>{weekPoints >= goalPts ? "🎉 今週の目標クリア！" : `あと ${goalPts - weekPoints}pt で達成`}</div>
            {nextReward && (<div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 16 }}>{nextReward.emoji}</span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11, color: C.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nextReward.title}</div><div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden", marginTop: 3 }}><div style={{ height: "100%", width: `${Math.min(100, (spendable / nextReward.cost) * 100)}%`, background: "linear-gradient(90deg, #C3A6FF, #9d7aff)", borderRadius: 99 }} /></div></div><span style={{ fontSize: 11, color: C.purple, fontWeight: 700, flexShrink: 0 }}>{spendable}/{nextReward.cost}pt</span></div>)}
          </div>
        )}
      </Card>

      {finishTotal > 0 ? (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: C.sub, letterSpacing: 1, textTransform: "uppercase" }}>🏁 今日の終了条件</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 12, color: canFinish ? C.green : C.sub, fontWeight: 700 }}>{finishDone}/{finishTotal}</span><button onClick={() => setShowFinishEdit(!showFinishEdit)} style={{ background: "none", border: "none", color: C.faint, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{showFinishEdit ? "閉じる" : "編集"}</button></div>
          </div>
          {finishItems.map((item, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}><button onClick={() => toggleFinish(i)} style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${item.done ? C.teal : C.faint}`, background: item.done ? C.teal : "transparent", cursor: "pointer", flexShrink: 0, color: "#0f0e17", fontSize: 11, fontWeight: 900 }}>{item.done ? "✓" : ""}</button><span style={{ flex: 1, fontSize: 13, color: item.done ? C.sub : C.text, textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>{showFinishEdit && <button onClick={() => removeFinishItem(i)} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 13 }}>✕</button>}</div>))}
          <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden", marginTop: 8 }}><div style={{ height: "100%", width: `${finishPct}%`, background: canFinish ? `linear-gradient(90deg, ${C.green}, #7eddb0)` : `linear-gradient(90deg, ${C.teal}, #2ee8dc)`, borderRadius: 99, transition: "width 0.4s" }} /></div>
          {showFinishEdit && (<div style={{ marginTop: 10, display: "flex", gap: 8 }}><input style={{ ...inputStyle, flex: 1, padding: "8px 12px", fontSize: 13 }} value={finishInput} onChange={(e) => setFinishInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFinishItem()} placeholder="例：SPI10問、ES骨子" /><Btn onClick={addFinishItem} style={{ padding: "8px 12px", flexShrink: 0 }}>追加</Btn></div>)}
        </Card>
      ) : (
        <button onClick={() => setShowFinishEdit(!showFinishEdit)} style={{ width: "100%", marginBottom: showFinishEdit ? 0 : 16, background: "none", border: `1px dashed ${C.cardBorder}`, borderRadius: 12, padding: "8px", cursor: "pointer", fontSize: 12, color: C.faint, fontFamily: "inherit" }}>🏁 今日の終了条件を設定する</button>
      )}
      {finishTotal === 0 && showFinishEdit && (
        <Card style={{ marginBottom: 16, marginTop: 6 }}><div style={{ display: "flex", gap: 8 }}><input style={{ ...inputStyle, flex: 1, padding: "8px 12px", fontSize: 13 }} value={finishInput} onChange={(e) => setFinishInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFinishItem()} placeholder="例：SPI10問、ES骨子" /><Btn onClick={addFinishItem} style={{ padding: "8px 12px", flexShrink: 0 }}>追加</Btn></div></Card>
      )}
    </div>
  );
}
