import { useState } from "react";
import { C } from "../constants";
import { Badge, Btn, Modal, Field, IconBtn, Section, FloatingAdd, chipBtn, inputStyle } from "./UI";

export default function OBView({ obVisits, addOB, updateOB, deleteOB, companies }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [expandedFolder, setExpandedFolder] = useState({});
  const toggleFolder = (key) => setExpandedFolder((p) => ({ ...p, [key]: !p[key] }));
  const isFolderOpen = (key) => !!expandedFolder[key];
  const empty = { person_name: "", company: "", company_id: "", visit_date: "", visit_time: "", role: "", contact: "", impression: "" };
  const [form, setForm] = useState(empty);

  const openNew = () => { setEditing(null); setForm(empty); setShowModal(true); };
  const openEdit = (o) => { setEditing(o.id); const dt = o.visit_at ? new Date(o.visit_at) : null; setForm({ person_name: o.person_name || "", company: o.company || "", company_id: "", visit_date: dt ? dt.toISOString().slice(0, 10) : "", visit_time: dt ? dt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false }) : "", role: o.role || "", contact: o.contact || "", impression: o.impression || "" }); setShowModal(true); };
  const save = () => { if (!form.person_name.trim()) return; let visit_at = null; if (form.visit_date) { const dateStr = form.visit_time ? `${form.visit_date}T${form.visit_time}` : `${form.visit_date}T00:00`; visit_at = new Date(dateStr).toISOString(); } const payload = { person_name: form.person_name, company: form.company || null, visit_at, role: form.role || null, contact: form.contact || null, impression: form.impression || null }; if (editing) updateOB(editing, payload); else addOB(payload); setShowModal(false); };

  const now = new Date();
  const upcoming = obVisits.filter((o) => o.visit_at && new Date(o.visit_at) >= now).sort((a, b) => new Date(a.visit_at) - new Date(b.visit_at));
  const past = obVisits.filter((o) => !o.visit_at || new Date(o.visit_at) < now).sort((a, b) => new Date(b.visit_at || 0) - new Date(a.visit_at || 0));

  const card = (o) => { const isOpen = expandedCard === o.id; const dt = o.visit_at ? new Date(o.visit_at) : null; const hasTime = dt && (dt.getHours() !== 0 || dt.getMinutes() !== 0);
    return (<div key={o.id} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, overflow: "hidden" }}><div style={{ display: "flex", alignItems: "center", padding: "12px 14px" }}><button onClick={() => setExpandedCard(isOpen ? null : o.id)} style={{ flex: 1, background: "none", border: "none", textAlign: "left", cursor: "pointer", color: C.text, padding: 0, fontFamily: "inherit", minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{o.person_name}{o.role && <span style={{ fontSize: 11, color: C.sub, fontWeight: 400 }}>（{o.role}）</span>}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>{o.company && <Badge color="#0ea5e9">{o.company}</Badge>}{dt && <span style={{ fontSize: 11, color: C.teal }}>{dt.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}{hasTime && ` ${dt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`}</span>}{o.contact && <span style={{ fontSize: 11, color: C.faint }}>📱</span>}</div></button><div style={{ display: "flex", gap: 6 }}><IconBtn onClick={() => openEdit(o)} kind="edit" /><IconBtn onClick={() => deleteOB(o.id)} kind="del" /></div></div>
      {isOpen && (<div style={{ padding: "0 14px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>{o.contact && (<div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}><button onClick={() => navigator.clipboard.writeText(o.contact).catch(() => {})} style={{ fontSize: 12, color: C.purple, background: `${C.purple}15`, border: `1px solid ${C.purple}33`, borderRadius: 99, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>📱 {o.contact}（タップでコピー）</button></div>)}{o.impression && <div style={{ marginTop: 10, fontSize: 13, color: C.sub, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{o.impression}</div>}{!o.contact && !o.impression && <div style={{ marginTop: 8, fontSize: 12, color: C.faint }}>メモなし</div>}</div>)}
      {!isOpen && o.impression && <div style={{ padding: "0 14px 8px", fontSize: 11, color: C.faint }}>タップで詳細表示</div>}</div>);
  };

  const renderFolders = (visits) => { const industryGroups = {}; visits.forEach((o) => { const co = (companies || []).find((c) => c.name === o.company); const industry = co?.industry || "その他"; if (!industryGroups[industry]) industryGroups[industry] = {}; const companyKey = o.company || "企業未設定"; if (!industryGroups[industry][companyKey]) industryGroups[industry][companyKey] = []; industryGroups[industry][companyKey].push(o); });
    return Object.entries(industryGroups).map(([industry, coGroups]) => { const industryKey = `ind_${industry}`; const isIndOpen = isFolderOpen(industryKey); const total = Object.values(coGroups).flat().length;
      return (<div key={industry} style={{ marginBottom: 10 }}><button onClick={() => toggleFolder(industryKey)} style={{ width: "100%", background: isIndOpen ? "rgba(14,165,233,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${isIndOpen ? "#0ea5e944" : C.cardBorder}`, borderRadius: 12, padding: "11px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: C.text, fontFamily: "inherit" }}><span style={{ fontSize: 12, color: isIndOpen ? C.teal : C.faint, transition: "transform 0.2s", display: "inline-block", transform: isIndOpen ? "rotate(90deg)" : "none" }}>▶</span><span style={{ textAlign: "left", fontSize: 13, fontWeight: 700, color: isIndOpen ? "#0ea5e9" : C.text }}>{industry}</span><span style={{ fontSize: 10, background: "#0ea5e922", color: "#0ea5e9", fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{total}</span></button>
        {isIndOpen && (<div style={{ marginTop: 6, paddingLeft: 8 }}>{Object.entries(coGroups).map(([company, obs]) => { const coKey = `co_${industry}_${company}`; const isCoOpen = isFolderOpen(coKey); return (<div key={company} style={{ marginBottom: 6 }}><button onClick={() => toggleFolder(coKey)} style={{ width: "100%", background: isCoOpen ? "#0ea5e918" : "rgba(255,255,255,0.02)", border: `1px solid ${isCoOpen ? "#0ea5e933" : C.cardBorder}`, borderRadius: 10, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: C.text, fontFamily: "inherit" }}><span style={{ fontSize: 11, color: isCoOpen ? C.teal : C.faint, transition: "transform 0.2s", display: "inline-block", transform: isCoOpen ? "rotate(90deg)" : "none" }}>▶</span><span style={{ flex: 1, textAlign: "left", fontSize: 12, fontWeight: 700 }}>🏢 {company}</span><span style={{ fontSize: 10, background: "#0ea5e922", color: "#0ea5e9", fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{obs.length}</span></button>{isCoOpen && (<div style={{ marginTop: 4, paddingLeft: 6, display: "flex", flexDirection: "column", gap: 6 }}>{obs.map(card)}</div>)}</div>); })}</div>)}</div>);
    });
  };

  return (
    <div>
      <Section kicker="人とのつながり" title="OB・OG訪問" sub={`${obVisits.length}人`} subColor={C.teal} />
      {upcoming.length > 0 && (<div style={{ marginBottom: 20 }}><div style={{ fontSize: 11, letterSpacing: 2, color: C.teal, textTransform: "uppercase", marginBottom: 10 }}>これから</div><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{upcoming.map(card)}</div></div>)}
      {past.length > 0 && (<div><div style={{ fontSize: 11, letterSpacing: 2, color: C.faint, textTransform: "uppercase", marginBottom: 10 }}>記録（業界・企業別）</div>{renderFolders(past)}</div>)}
      {obVisits.length === 0 && (<div style={{ textAlign: "center", padding: "24px 0", color: C.faint }}><div style={{ fontSize: 36, marginBottom: 10 }}>🤝</div><div style={{ fontSize: 14 }}>OB・OG訪問の予定や記録を残そう</div></div>)}
      <FloatingAdd onClick={openNew} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "OB訪問を編集" : "OB訪問を追加"}>
        <Field label="相手の名前"><input style={inputStyle} value={form.person_name} onChange={(e) => setForm((f) => ({ ...f, person_name: e.target.value }))} placeholder="例：田中さん" /></Field>
        <Field label="企業・所属（任意）">{(companies||[]).length > 0 && (<div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{(companies||[]).map((c) => <button key={c.id} onClick={() => setForm((f) => ({ ...f, company: c.name, company_id: c.id }))} style={chipBtn(form.company === c.name, "#0ea5e9")}>{c.name}</button>)}</div>)}<input style={inputStyle} value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value, company_id: "" }))} placeholder="または手動入力" /></Field>
        <Field label="役職・関係（任意）"><input style={inputStyle} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="例：営業局 / ゼミの先輩" /></Field>
        <Field label="連絡先（任意）"><input style={inputStyle} value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} placeholder="例：090-0000-0000 / example@mail.com" /></Field>
        <Field label="日付（任意）"><input style={inputStyle} type="date" value={form.visit_date} onChange={(e) => setForm((f) => ({ ...f, visit_date: e.target.value }))} /></Field>
        <Field label="時間（任意）"><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{[["9:00","09:00"],["10:00","10:00"],["11:00","11:00"],["13:00","13:00"],["14:00","14:00"],["15:00","15:00"],["16:00","16:00"],["19:00","19:00"]].map(([label, val]) => (<button key={val} onClick={() => setForm((f) => ({ ...f, visit_time: f.visit_time === val ? "" : val }))} style={chipBtn(form.visit_time === val, C.teal)}>{label}</button>))}</div><input style={inputStyle} type="time" value={form.visit_time} onChange={(e) => setForm((f) => ({ ...f, visit_time: e.target.value }))} /></Field>
        <Field label="感想・メモ"><textarea style={{ ...inputStyle, height: 120, resize: "vertical" }} value={form.impression} onChange={(e) => setForm((f) => ({ ...f, impression: e.target.value }))} placeholder="話した内容、印象、次に活かすことなど" /></Field>
        <div style={{ display: "flex", gap: 10 }}><Btn variant="ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>キャンセル</Btn><Btn onClick={save} style={{ flex: 2 }}>{editing ? "更新" : "追加"}</Btn></div>
      </Modal>
    </div>
  );
}
