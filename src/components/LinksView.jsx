import { useState, useEffect } from "react";
import { C, PRESET_LINKS, LINK_CATS } from "../constants";
import { sbRest } from "../lib/supabase";
import { Badge, Btn, Modal, Field, IconBtn, Section, FloatingAdd, chipBtn, inputStyle } from "./UI";

export default function LinksView({ userId }) {
  const [links, setLinks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sortMode, setSortMode] = useState(false);

  useEffect(() => { (async () => { setSyncing(true); try { const data = await sbRest("GET", "user_links?order=sort_order.asc,created_at.asc"); if (data && data.length > 0) { setLinks(data); } else { let initial; try { const saved = localStorage.getItem("compass_all_links"); initial = saved ? JSON.parse(saved) : PRESET_LINKS.map((l) => ({ ...l })); } catch { initial = PRESET_LINKS.map((l) => ({ ...l })); } const inserted = await Promise.all(initial.map((l, i) => sbRest("POST", "user_links", { user_id: userId, emoji: l.emoji || "🔗", title: l.title, url: l.url, category: l.category || "その他", sort_order: i }).then((r) => r[0]).catch(() => null))); setLinks(inserted.filter(Boolean)); } } catch { try { const saved = localStorage.getItem("compass_all_links"); if (saved) setLinks(JSON.parse(saved).map((l, i) => ({ ...l, id: i }))); else setLinks(PRESET_LINKS.map((l, i) => ({ ...l, id: i }))); } catch { setLinks(PRESET_LINKS.map((l, i) => ({ ...l, id: i }))); } } finally { setSyncing(false); setLoaded(true); } })(); }, []);

  const persistOrder = async (ordered) => { setLinks(ordered); ordered.forEach((l, i) => { if (l.id && typeof l.id === "string") sbRest("PATCH", `user_links?id=eq.${l.id}`, { sort_order: i }).catch(() => {}); }); try { localStorage.setItem("compass_all_links", JSON.stringify(ordered)); } catch {} };
  const moveLink = (idx, dir) => { const copy = [...links]; const target = idx + dir; if (target < 0 || target >= copy.length) return; [copy[idx], copy[target]] = [copy[target], copy[idx]]; persistOrder(copy); };

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ emoji: "🔗", title: "", url: "", category: "" });
  const openNew = () => { setEditingId(null); setForm({ emoji: "🔗", title: "", url: "", category: "" }); setShowModal(true); };
  const openEdit = (l) => { setEditingId(l.id); setForm({ emoji: l.emoji, title: l.title, url: l.url, category: l.category || "" }); setShowModal(true); };
  const del = async (id) => { const updated = links.filter((l) => l.id !== id); setLinks(updated); try { await sbRest("DELETE", `user_links?id=eq.${id}`); } catch { try { localStorage.setItem("compass_all_links", JSON.stringify(updated)); } catch {} } };
  const save = async () => { if (!form.title.trim() || !form.url.trim()) return; const url = form.url.startsWith("http") ? form.url : "https://" + form.url; const entry = { ...form, url }; if (editingId !== null) { setLinks((p) => p.map((l) => l.id === editingId ? { ...l, ...entry } : l)); try { await sbRest("PATCH", `user_links?id=eq.${editingId}`, entry); } catch {} } else { try { const [row] = await sbRest("POST", "user_links", { user_id: userId, ...entry, sort_order: links.length }); setLinks((p) => [...p, row]); } catch { setLinks((p) => [...p, { ...entry, id: Date.now() }]); } } setShowModal(false); };

  const cats = [...new Set(links.map((l) => l.category || "カスタム"))];
  const EMOJIS = ["🔗", "⭐", "📋", "💼", "🔍", "📰", "🧮", "📝", "📊", "✍️", "🎓", "🏢", "💡", "🗂️"];

  return (
    <div>
      <Section kicker="使えるサービスをまとめる" title="リンク集" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: -10, marginBottom: 16 }}><p style={{ fontSize: 13, color: C.sub, margin: 0, lineHeight: 1.6 }}>iPhoneとMacで自動同期。{syncing && <span style={{ color: C.teal }}>同期中…</span>}</p><button onClick={() => setSortMode(!sortMode)} style={{ background: sortMode ? `${C.teal}22` : "none", border: `1px solid ${sortMode ? C.teal : C.cardBorder}`, color: sortMode ? C.teal : C.sub, borderRadius: 10, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>{sortMode ? "✓ 完了" : "⇅ 並べ替え"}</button></div>
      {sortMode && <div style={{ fontSize: 12, color: C.teal, marginBottom: 10, background: `${C.teal}15`, padding: "8px 12px", borderRadius: 10 }}>↑↓ボタンで並べ替えできます</div>}
      {!loaded && <div style={{ textAlign: "center", padding: 30, color: C.faint }}>読み込み中…</div>}
      {sortMode ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{links.map((l, idx) => (<div key={l.id || idx} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}><div style={{ display: "flex", flexDirection: "column", gap: 2 }}><button onClick={() => moveLink(idx, -1)} disabled={idx === 0} style={{ background: "none", border: `1px solid ${C.cardBorder}`, borderRadius: 6, padding: "2px 6px", cursor: idx === 0 ? "default" : "pointer", color: idx === 0 ? C.faint : C.text, fontSize: 10 }}>↑</button><button onClick={() => moveLink(idx, 1)} disabled={idx === links.length - 1} style={{ background: "none", border: `1px solid ${C.cardBorder}`, borderRadius: 6, padding: "2px 6px", cursor: idx === links.length - 1 ? "default" : "pointer", color: idx === links.length - 1 ? C.faint : C.text, fontSize: 10 }}>↓</button></div><span style={{ fontSize: 20, flexShrink: 0 }}>{l.emoji}</span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div><div style={{ fontSize: 10, color: C.faint }}>{l.category || "カスタム"}</div></div></div>))}</div>
      ) : (
        cats.map((cat) => { const items = links.filter((l) => (l.category || "カスタム") === cat); return (<div key={cat} style={{ marginBottom: 24 }}><div style={{ fontSize: 11, letterSpacing: 2, color: C.teal, textTransform: "uppercase", marginBottom: 10 }}>{cat}</div><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{items.map((l) => (<div key={l.id} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 20, flexShrink: 0 }}>{l.emoji}</span><button onClick={() => window.open(l.url, "_blank")} style={{ flex: 1, textDecoration: "none", minWidth: 0, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, fontFamily: "inherit" }}><div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div></button><div style={{ display: "flex", gap: 4, flexShrink: 0 }}><IconBtn onClick={() => openEdit(l)} kind="edit" /><IconBtn onClick={() => del(l.id)} kind="del" /></div></div>))}</div></div>); })
      )}
      <button onClick={openNew} style={{ ...chipBtn(false, C.teal), padding: "12px 20px", borderRadius: 14, width: "100%", justifyContent: "center", marginTop: 4, display: "flex" }}>＋ リンクを追加</button>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId !== null ? "リンクを編集" : "リンクを追加"}>
        <Field label="アイコン"><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{EMOJIS.map((e) => <button key={e} onClick={() => setForm((f) => ({ ...f, emoji: e }))} style={{ fontSize: 20, padding: "4px 8px", borderRadius: 10, border: `1px solid ${form.emoji === e ? C.teal : "rgba(255,255,255,0.15)"}`, background: form.emoji === e ? `${C.teal}22` : "transparent", cursor: "pointer" }}>{e}</button>)}</div></Field>
        <Field label="名前"><input style={inputStyle} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="例：会社のWantedly" /></Field>
        <Field label="URL"><input style={inputStyle} type="url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." /></Field>
        <Field label="カテゴリ"><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{LINK_CATS.map((cat) => (<button key={cat} onClick={() => setForm((f) => ({ ...f, category: f.category === cat ? "" : cat }))} style={chipBtn(form.category === cat, C.teal)}>{cat}</button>))}</div><input style={inputStyle} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="または自由に入力" /></Field>
        <div style={{ display: "flex", gap: 10 }}><Btn variant="ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>キャンセル</Btn><Btn onClick={save} style={{ flex: 2 }}>{editingId !== null ? "更新" : "追加"}</Btn></div>
      </Modal>
    </div>
  );
}
