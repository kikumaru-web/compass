import { useState } from "react";
import { C } from "../constants";
import { Badge, Card, Btn, Modal, Field, IconBtn, Section, chipBtn, inputStyle } from "./UI";

export default function RewardsView({ spendable, totalXP, rewards, redemptions, redeem, addReward, updateReward, deleteReward }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ emoji: "🎁", title: "", cost: 20 });
  const [confirm, setConfirm] = useState(null);
  const openNew = () => { setEditing(null); setForm({ emoji: "🎁", title: "", cost: 20 }); setShowModal(true); };
  const openEdit = (r) => { setEditing(r.id); setForm({ emoji: r.emoji, title: r.title, cost: r.cost }); setShowModal(true); };
  const save = () => { if (!form.title.trim()) return; if (editing) updateReward(editing, form); else addReward(form); setShowModal(false); };
  const sorted = [...(rewards || [])].sort((a, b) => a.cost - b.cost);
  const EMOJIS = ["🎁", "☕", "🍜", "♨️", "🎬", "✈️", "🍰", "🎮", "📚", "🍣", "🛍️", "🎧", "🍺", "🌸"];

  return (
    <div>
      <Section kicker="継続の燃料" title="ご褒美" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, background: `${C.yellow}15`, border: `1px solid ${C.yellow}33`, borderRadius: 14, padding: "12px 16px" }}><div><div style={{ fontSize: 11, color: C.sub }}>使えるポイント</div><div style={{ fontSize: 28, fontWeight: 900, color: C.yellow, lineHeight: 1.1 }}>{spendable}<span style={{ fontSize: 13, color: C.faint, marginLeft: 3 }}>pt</span></div></div><div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: C.faint }}>累計XP {totalXP}</div><div style={{ fontSize: 10, color: C.faint, marginTop: 2 }}>レベルは下がりません</div></div></div>
      {sorted.length === 0 && <div style={{ textAlign: "center", padding: 30, color: C.faint }}>ご褒美がありません。下のボタンで追加できます。</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {sorted.map((r) => { const canAfford = spendable >= r.cost; const pct = Math.min(100, (spendable / r.cost) * 100);
          return (<div key={r.id} style={{ background: canAfford ? `${C.green}11` : C.card, border: `1px solid ${canAfford ? C.green + "44" : C.cardBorder}`, borderRadius: 14, padding: "12px 12px 10px", position: "relative" }}><div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}><IconBtn onClick={() => openEdit(r)} kind="edit" /><IconBtn onClick={() => deleteReward(r.id)} kind="del" /></div><div style={{ fontSize: 28, marginBottom: 6 }}>{r.emoji}</div><div style={{ fontSize: 13, fontWeight: 700, color: canAfford ? C.green : C.text, marginBottom: 2, paddingRight: 40, lineHeight: 1.3 }}>{r.title}</div><div style={{ fontSize: 11, color: C.faint, marginBottom: 8 }}>{r.cost}pt</div><div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}><div style={{ height: "100%", width: `${pct}%`, background: canAfford ? `linear-gradient(90deg, ${C.green}, #7eddb0)` : `linear-gradient(90deg, ${C.purple}, #9d7aff)`, borderRadius: 99, transition: "width 0.6s" }} /></div>{canAfford ? <button onClick={() => setConfirm(r)} style={{ width: "100%", background: `linear-gradient(135deg, ${C.green}, #7eddb0)`, border: "none", borderRadius: 8, padding: "7px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#0f0e17", fontFamily: "inherit" }}>🎉 交換</button> : <div style={{ textAlign: "center", fontSize: 11, color: C.faint }}>あと {r.cost - spendable}pt</div>}</div>);
        })}
      </div>
      <button onClick={openNew} style={{ ...chipBtn(false, C.teal), padding: "12px", borderRadius: 14, justifyContent: "center", width: "100%", display: "flex" }}>＋ ご褒美を追加</button>
      {redemptions && redemptions.length > 0 && (<div style={{ marginTop: 20 }}><div style={{ fontSize: 11, color: C.faint, letterSpacing: 1, marginBottom: 10 }}>交換履歴 ({redemptions.length})</div><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{redemptions.map((h) => (<div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10 }}><span style={{ fontSize: 18 }}>{h.reward_emoji}</span><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{h.reward_title}</div><div style={{ fontSize: 10, color: C.faint }}>{new Date(h.redeemed_at).toLocaleDateString("ja-JP")}</div></div><Badge color={C.red}>-{h.cost}pt</Badge></div>))}</div></div>)}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "ご褒美を編集" : "ご褒美を追加"}>
        <Field label="アイコン"><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{EMOJIS.map((e) => <button key={e} onClick={() => setForm((f) => ({ ...f, emoji: e }))} style={{ fontSize: 22, padding: "4px 8px", borderRadius: 10, border: `1px solid ${form.emoji === e ? C.yellow : "rgba(255,255,255,0.15)"}`, background: form.emoji === e ? `${C.yellow}22` : "transparent", cursor: "pointer" }}>{e}</button>)}</div></Field>
        <Field label="名前"><input style={inputStyle} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="例：映画・コンサート" /></Field>
        <Field label="必要ポイント"><input style={inputStyle} type="number" min={1} value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: +e.target.value }))} /></Field>
        <div style={{ display: "flex", gap: 10 }}><Btn variant="ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>キャンセル</Btn><Btn onClick={save} style={{ flex: 2 }}>{editing ? "更新" : "追加"}</Btn></div>
      </Modal>
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="交換しますか？">
        {confirm && (<div><div style={{ textAlign: "center", padding: "10px 0 20px" }}><div style={{ fontSize: 48, marginBottom: 10 }}>{confirm.emoji}</div><div style={{ fontSize: 18, fontWeight: 800 }}>{confirm.title}</div><div style={{ fontSize: 13, color: C.sub, marginTop: 6 }}>{confirm.cost}pt を使います（残り {spendable - confirm.cost}pt）</div></div><div style={{ display: "flex", gap: 10 }}><Btn variant="ghost" onClick={() => setConfirm(null)} style={{ flex: 1 }}>やめる</Btn><Btn onClick={() => { redeem(confirm); setConfirm(null); }} style={{ flex: 2, background: `linear-gradient(135deg, ${C.green}, #7eddb0)` }}>🎉 交換する</Btn></div></div>)}
      </Modal>
    </div>
  );
}
