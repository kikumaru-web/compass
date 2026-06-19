import { useState } from "react";
import { C, DEADLINE_KINDS, daysUntil, formatDate } from "../constants";
import { Badge, Btn, Modal, Field, IconBtn, Section, FloatingAdd, chipBtn, inputStyle } from "./UI";

function DeadlineCalendar({ deadlines }) {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });
  const { y, m } = currentDate;
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const dlByDate = {};
  deadlines.filter((d) => !d.done && d.due_date).forEach((d) => {
    const key = d.due_date.slice(0, 10);
    if (!dlByDate[key]) dlByDate[key] = [];
    dlByDate[key].push(d);
  });

  const weeks = [];
  let cells = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: "12px 14px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <button onClick={() => setCurrentDate(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })} style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", fontSize: 16 }}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{y}年{m + 1}月</span>
        <button onClick={() => setCurrentDate(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })} style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", fontSize: 16 }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, color: i === 0 ? C.red : i === 6 ? "#60a5fa" : C.faint, paddingBottom: 4 }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
          {week.map((day, di) => {
            if (!day) return <div key={di} />;
            const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dls = dlByDate[key] || [];
            const isToday = key === todayKey;
            const hasDl = dls.length > 0;
            const dlColor = dls.some((d) => daysUntil(d.due_date) <= 2) ? C.red : dls.some((d) => daysUntil(d.due_date) <= 7) ? C.yellow : C.teal;
            return (
              <div key={di} style={{ textAlign: "center", padding: "4px 2px", borderRadius: 6, background: isToday ? `${C.teal}30` : "transparent", border: isToday ? `1px solid ${C.teal}66` : "1px solid transparent", position: "relative" }}>
                <div style={{ fontSize: 12, color: di === 0 ? C.red : di === 6 ? "#60a5fa" : C.text, fontWeight: isToday ? 800 : 400 }}>{day}</div>
                {hasDl && <div style={{ width: 6, height: 6, borderRadius: "50%", background: dlColor, margin: "1px auto 0" }} title={dls.map((d) => d.company_name).join(", ")} />}
              </div>
            );
          })}
        </div>
      ))}
      {Object.keys(dlByDate).filter((k) => k.startsWith(`${y}-${String(m + 1).padStart(2, "0")}`)).length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 10, fontSize: 10, color: C.faint }}>
          <span>🔴 2日以内</span><span style={{ color: C.yellow }}>🟡 7日以内</span><span style={{ color: C.teal }}>🔵 それ以降</span>
        </div>
      )}
    </div>
  );
}

export default function DeadlinesView({ deadlines, companies, addDeadline, updateDeadline, deleteDeadline }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const [toast, setToast] = useState(null);
  const empty = { company_id: "", company_name: "", kind: "プレエントリー", label: "", due_date: "", due_time: "", memo: "" };
  const [form, setForm] = useState(empty);

  const showToast = (msg, big = false) => {
    setToast({ msg, big });
    setTimeout(() => setToast(null), big ? 3000 : 1800);
  };

  const openNew = () => { setEditing(null); setForm(empty); setShowModal(true); };
  const openEdit = (d) => { setEditing(d.id); setForm({ ...d, due_date: d.due_date || "", due_time: d.due_time || "" }); setShowModal(true); };
  const save = () => {
    if (!form.company_name.trim()) return;
    if (editing) updateDeadline(editing, form); else addDeadline(form);
    setShowModal(false);
  };

  const active = deadlines.filter((d) => !d.done).sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1; if (!b.due_date) return -1;
    return new Date(a.due_date) - new Date(b.due_date);
  });
  const done = deadlines.filter((d) => d.done).sort((a, b) => new Date(b.due_date || 0) - new Date(a.due_date || 0));

  const row = (dl) => {
    const d = dl.due_date ? daysUntil(dl.due_date) : null;
    const past = d !== null && d < 0;
    const col = dl.done ? C.faint : d === null ? C.sub : past ? C.red : d <= 2 ? C.red : d <= 4 ? C.yellow : d <= 7 ? C.teal : C.sub;
    const kind = DEADLINE_KINDS.find((k) => k.id === dl.kind);
    const name = dl.kind === "その他" && dl.label ? dl.label : dl.kind;
    const timeStr = dl.due_time ? ` ${dl.due_time}` : "";
    return (
      <div key={dl.id} style={{ background: C.card, border: `1px solid ${!dl.done && d !== null && (past || d <= 2) ? `${C.red}44` : C.cardBorder}`, borderRadius: 14, padding: "14px 16px", opacity: dl.done ? 0.5 : 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <button onClick={() => {
            const nowDone = !dl.done;
            updateDeadline(dl.id, { ...dl, done: nowDone });
            if (nowDone) {
              const isES = dl.kind === "ES提出" || dl.kind === "ES・書類";
              if (isES) {
                showToast(`🎉 ${dl.company_name} のES提出完了！お疲れさま！`, true);
              } else {
                const msgs = ["おつかれさま🍵", "一つ片付いたね☕", "よくできました🌿", "ひと息ついて🍵"];
                showToast(msgs[Math.floor(Math.random() * msgs.length)]);
              }
            }
          }} style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${dl.done ? C.teal : col}`, background: dl.done ? C.teal : "transparent", cursor: "pointer", flexShrink: 0, color: "#0f0e17", fontSize: 11, fontWeight: 900 }}>{dl.done ? "✓" : ""}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 700, textDecoration: dl.done ? "line-through" : "none" }}>{dl.company_name}</span>
              <Badge color={kind?.color || C.sub} style={{ flexShrink: 0 }}>{kind?.icon} {name}</Badge>
              <span style={{ fontSize: 11, color: col, fontWeight: 600, flexShrink: 0 }}>{dl.due_date ? `${formatDate(dl.due_date)}${timeStr} ${!dl.done ? (past ? `(${-d}日超過)` : d === 0 ? "(今日)" : d === 1 ? "(明日)" : `(${d}日後)`) : ""}` : "日付未定"}</span>
            </div>
            {dl.memo && <div style={{ marginTop: 3, fontSize: 11, color: C.sub }}>{dl.memo}</div>}
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <IconBtn onClick={() => openEdit(dl)} kind="edit" />
            <IconBtn onClick={() => deleteDeadline(dl.id)} kind="del" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <Section kicker="外部からの締切" title="締切カレンダー" sub={`未完了${deadlines.filter((d) => !d.done).length}件・完了${deadlines.filter((d) => d.done).length}件`} />

      {toast && (
        <div style={{ position: "fixed", top: toast.big ? 100 : 80, left: "50%", transform: "translateX(-50%)", zIndex: 9999, pointerEvents: "none" }}>
          <div style={{ background: toast.big ? "linear-gradient(135deg, #4ECDC4, #C3A6FF)" : "rgba(78,205,196,0.92)", color: "#0f0e17", padding: "12px 22px", borderRadius: 99, fontWeight: 800, fontSize: toast.big ? 15 : 14, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", textAlign: "center", maxWidth: "85vw", whiteSpace: "normal", wordBreak: "keep-all" }}>
            {toast.msg}
          </div>
        </div>
      )}

      <DeadlineCalendar deadlines={deadlines} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {active.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.faint }}><div style={{ fontSize: 40, marginBottom: 12 }}>🗓️</div>締切がありません。<br />企業の応募締切などを登録しよう。</div>}
        {active.map(row)}
      </div>
      {done.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <button onClick={() => setShowDone(!showDone)} style={{ background: "none", border: "none", color: C.sub, fontSize: 13, cursor: "pointer", marginBottom: 10, fontFamily: "inherit" }}>{showDone ? "▼" : "▶"} 完了した締切 ({done.length})</button>
          {showDone && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{done.map(row)}</div>}
        </div>
      )}

      <FloatingAdd onClick={openNew} />

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "締切を編集" : "締切を追加"}>
        <Field label="企業名">
          {companies.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {companies.map((c) => <button key={c.id} onClick={() => setForm((f) => ({ ...f, company_id: c.id, company_name: c.name }))} style={chipBtn(form.company_id === c.id, "#0ea5e9")}>{c.name}</button>)}
            </div>
          )}
          <input style={inputStyle} value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value, company_id: "" }))} placeholder="企業名（直接入力もOK）" />
        </Field>
        <Field label="締切の種類">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {DEADLINE_KINDS.map((k) => <button key={k.id} onClick={() => setForm((f) => ({ ...f, kind: k.id }))} style={chipBtn(form.kind === k.id, k.color)}>{k.icon} {k.id}</button>)}
          </div>
        </Field>
        {form.kind === "その他" && (
          <Field label="名称（自由入力）"><input style={inputStyle} value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="例：説明会予約、OB訪問期限 など" /></Field>
        )}
        <Field label="締切日"><input style={inputStyle} type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} /></Field>
        <Field label="締切時刻（任意）">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {[["正午", "12:00"], ["17:00", "17:00"], ["18:00", "18:00"], ["21:00", "21:00"], ["23:59", "23:59"]].map(([label, val]) => (
              <button key={val} onClick={() => setForm((f) => ({ ...f, due_time: f.due_time === val ? "" : val }))} style={chipBtn(form.due_time === val, C.teal)}>{label}</button>
            ))}
          </div>
          <input style={inputStyle} type="time" value={form.due_time} onChange={(e) => setForm((f) => ({ ...f, due_time: e.target.value }))} />
        </Field>
        <Field label="メモ（任意）"><input style={inputStyle} value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} placeholder="提出方法、必要書類など" /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>キャンセル</Btn>
          <Btn onClick={save} style={{ flex: 2 }}>{editing ? "更新" : "追加"}</Btn>
        </div>
      </Modal>
    </div>
  );
}
