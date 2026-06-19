import { useState } from "react";
import { C, POINT_PRESETS, todayStr } from "../constants";
import { Badge, Card, Btn, Modal, Field, IconBtn, Section, FloatingAdd, chipBtn, inputStyle } from "./UI";

export default function ActionLogView({ logs, addLog, deleteLog }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: todayStr(), content: "", minutes: 30, points: 1 });
  const grouped = logs.reduce((a, l) => { (a[l.date] = a[l.date] || []).push(l); return a; }, {});
  const today = todayStr();
  const monthGroups = {}; Object.entries(grouped).forEach(([date, items]) => { if (date === today) return; const month = date.slice(0, 7); if (!monthGroups[month]) monthGroups[month] = {}; monthGroups[month][date] = items; });
  const sortedMonths = Object.keys(monthGroups).sort((a, b) => b.localeCompare(a));
  const [openMonths, setOpenMonths] = useState({});
  const toggleMonth = (key) => setOpenMonths((p) => ({ ...p, [key]: !p[key] }));
  const todayItems = grouped[today] || [];
  const todayPts = todayItems.reduce((s, l) => s + (l.points || 0), 0);

  const dayRow = (date, items, showDelete) => {
    const pts = items.reduce((s, l) => s + (l.points || 0), 0); const isToday = date === today;
    return (<div key={date} style={{ marginBottom: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 12, color: isToday ? C.yellow : C.faint, fontWeight: isToday ? 700 : 400 }}>{new Date(date + "T12:00:00").toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" })}</span><Badge color={C.yellow}>{pts}pt</Badge></div><div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{items.map((l) => (<div key={l.id} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: "9px 12px", display: "flex", alignItems: "center", gap: 8 }}><span style={{ flex: 1, fontSize: 13 }}>{l.content}</span><span style={{ fontSize: 11, color: C.faint }}>{l.minutes}分</span><Badge color={C.yellow}>+{l.points}</Badge>{showDelete && <IconBtn onClick={() => deleteLog(l.id)} kind="del" />}</div>))}</div></div>);
  };

  return (
    <div>
      <Section kicker="積み上げる" title="行動ログ" />
      <Card style={{ marginBottom: 20 }}><div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>ワンタップ記録</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{POINT_PRESETS.map((p) => (<button key={p.label} onClick={() => addLog({ date: todayStr(), content: p.label, minutes: 30, points: p.points })} style={{ ...chipBtn(false, C.teal), padding: "8px 14px" }}>{p.label} <span style={{ color: C.yellow }}>+{p.points}</span></button>))}</div></Card>
      <div style={{ marginBottom: 20 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span style={{ fontSize: 13, color: C.yellow, fontWeight: 700 }}>🔥 今日</span>{todayPts > 0 && <Badge color={C.yellow}>{todayPts}pt</Badge>}</div>{todayItems.length === 0 ? <div style={{ fontSize: 13, color: C.faint, padding: "8px 0" }}>まだ記録なし。どんな小さな一歩でもOK。</div> : dayRow(today, todayItems, true)}</div>
      {sortedMonths.length > 0 && (<div><div style={{ fontSize: 11, color: C.faint, letterSpacing: 1, marginBottom: 10 }}>過去のログ</div>{sortedMonths.map((month) => { const isOpen = !!openMonths[month]; const monthDates = Object.entries(monthGroups[month]).sort(([a], [b]) => b.localeCompare(a)); const monthPts = monthDates.flatMap(([, items]) => items).reduce((s, l) => s + (l.points || 0), 0); const [y, m] = month.split("-");
        return (<div key={month} style={{ marginBottom: 10 }}><button onClick={() => toggleMonth(month)} style={{ width: "100%", background: isOpen ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: C.text, fontFamily: "inherit" }}><span style={{ fontSize: 12, color: isOpen ? C.teal : C.faint, transition: "transform 0.2s", display: "inline-block", transform: isOpen ? "rotate(90deg)" : "none" }}>▶</span><span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 600 }}>{y}年{+m}月</span><Badge color={C.yellow}>{monthPts}pt</Badge><span style={{ fontSize: 11, color: C.faint }}>{monthDates.length}日分</span></button>{isOpen && (<div style={{ marginTop: 8, paddingLeft: 4 }}>{monthDates.map(([date, items]) => dayRow(date, items, false))}</div>)}</div>);
      })}</div>)}
      {logs.length === 0 && (<div style={{ textAlign: "center", padding: "32px 0", color: C.faint }}><div style={{ fontSize: 36, marginBottom: 10 }}>🔥</div><div style={{ fontSize: 14 }}>積み上げが始まる場所</div></div>)}
      <FloatingAdd onClick={() => { setForm({ date: todayStr(), content: "", minutes: 30, points: 1 }); setShowModal(true); }} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title="行動を記録">
        <Field label="日付"><input style={inputStyle} type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
        <Field label="内容"><input style={inputStyle} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="例：SPI 10問" /></Field>
        <div style={{ display: "flex", gap: 10 }}><Field label="時間(分)"><input style={{ ...inputStyle, width: 90 }} type="number" value={form.minutes} onChange={(e) => setForm((f) => ({ ...f, minutes: +e.target.value }))} /></Field><Field label="ポイント"><input style={{ ...inputStyle, width: 90 }} type="number" value={form.points} onChange={(e) => setForm((f) => ({ ...f, points: +e.target.value }))} /></Field></div>
        <Btn onClick={() => { if (form.content.trim()) { addLog(form); setShowModal(false); } }} style={{ width: "100%" }}>記録する</Btn>
      </Modal>
    </div>
  );
}
