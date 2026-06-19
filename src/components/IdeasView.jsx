import { useState } from "react";
import { C } from "../constants";
import { Btn, Modal, Field, IconBtn, Section, FloatingAdd, chipBtn, inputStyle, fldrBtn } from "./UI";

const IDEA_PRESET_CATS = ["就活の悩み", "面接の反省", "業界・企業への疑問", "自己分析", "その他"];

export default function IdeasView({ ideas, addIdea, deleteIdea, updateIdea }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", category: "" });
  const [expanded, setExpanded] = useState(null);
  const [openFolders, setOpenFolders] = useState({});
  const toggleFolder = (key) => setOpenFolders((p) => ({ ...p, [key]: !p[key] }));
  const openNew = () => { setEditing(null); setForm({ title: "", content: "", category: "" }); setShowModal(true); };
  const openEdit = (i) => { setEditing(i.id); setForm({ title: i.title || "", content: i.content || "", category: i.category || "" }); setShowModal(true); };
  const save = () => { if (!form.title.trim() && !form.content.trim()) return; const payload = { title: form.title.trim() || (form.content.trim().slice(0, 20)), content: form.content, category: form.category || null }; if (editing) updateIdea(editing, payload); else addIdea(payload); setShowModal(false); };

  const groups = {}; ideas.forEach((i) => { const cat = i.category || "未分類"; if (!groups[cat]) groups[cat] = []; groups[cat].push(i); });
  const groupKeys = Object.keys(groups).sort((a, b) => { if (a === "未分類") return 1; if (b === "未分類") return -1; return a.localeCompare(b, "ja"); });

  const ideaCard = (i) => { const isOpen = expanded === i.id; const title = i.title || (i.content || "").slice(0, 24) || "（無題）"; const hasBody = i.content && i.content.trim().length > 0;
    return (<div key={i.id} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "12px 14px" }}><div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}><button onClick={() => setExpanded(isOpen ? null : i.id)} style={{ flex: 1, background: "none", border: "none", textAlign: "left", cursor: "pointer", color: "#ddd", padding: 0, fontFamily: "inherit" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: C.teal, fontSize: 11, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>▶</span><span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span></div></button><span style={{ fontSize: 10, color: C.faint, flexShrink: 0 }}>{i.created_at ? new Date(i.created_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }) : ""}</span></div>{isOpen && (<div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>{hasBody && <div style={{ fontSize: 13, lineHeight: 1.7, color: "#ccc", whiteSpace: "pre-wrap", marginBottom: 12 }}>{i.content}</div>}<div style={{ display: "flex", gap: 8 }}><IconBtn onClick={() => openEdit(i)} kind="edit" /><IconBtn onClick={() => { deleteIdea(i.id); setExpanded(null); }} kind="del" /></div></div>)}</div>);
  };

  return (
    <div>
      <Section kicker="思考を逃がす" title="アイデア保留箱" sub={`${ideas.length}件`} />
      <p style={{ fontSize: 13, color: C.sub, marginTop: -10, marginBottom: 20, lineHeight: 1.6 }}>判断しない。とにかく出す。カテゴリは後付けでOK。</p>
      {ideas.length === 0 && (<div style={{ textAlign: "center", padding: "24px 0", color: C.faint }}><div style={{ fontSize: 36, marginBottom: 10 }}>💭</div><div style={{ fontSize: 14, marginBottom: 12 }}>思いついたことを気軽に入れよう</div></div>)}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {groupKeys.map((cat) => { const items = groups[cat]; const isOpen = !!openFolders[cat];
          return (<div key={cat}><button onClick={() => toggleFolder(cat)} style={{ ...fldrBtn(isOpen) }}><span style={{ fontSize: 11, color: isOpen ? C.teal : C.faint, transition: "transform 0.2s", display: "inline-block", transform: isOpen ? "rotate(90deg)" : "none" }}>▶</span><span style={{ textAlign: "left", fontSize: 13, fontWeight: 600 }}>{cat}</span><span style={{ fontSize: 10, background: "#0ea5e922", color: "#0ea5e9", fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{items.length}</span></button>{isOpen && (<div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 4 }}>{items.map(ideaCard)}</div>)}</div>);
        })}
      </div>
      <FloatingAdd onClick={openNew} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "メモを編集" : "保留箱に追加"}>
        <Field label="タイトル（短く）"><input style={inputStyle} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="例：部活との両立が不安" /></Field>
        <Field label="カテゴリ（任意）"><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{IDEA_PRESET_CATS.map((c) => <button key={c} onClick={() => setForm((f) => ({ ...f, category: f.category === c ? "" : c }))} style={chipBtn(form.category === c, C.purple)}>{c}</button>)}</div><input style={inputStyle} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="または手動入力" /></Field>
        <Field label="本文（長くてOK）"><textarea style={{ ...inputStyle, height: 160, resize: "vertical", lineHeight: 1.6 }} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="思考、モヤモヤ、面接の反省など自由に。" /></Field>
        <div style={{ display: "flex", gap: 10 }}><Btn variant="ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>キャンセル</Btn><Btn onClick={save} style={{ flex: 2 }}>{editing ? "更新" : "投入"}</Btn></div>
      </Modal>
    </div>
  );
}
