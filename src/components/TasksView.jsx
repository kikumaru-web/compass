import { useState } from "react";
import { C, INDUSTRIES, CATEGORIES, PRIORITY_COLORS, POINT_PRESETS, todayStr, daysUntil, formatDate } from "../constants";
import { Badge, Btn, Modal, Field, IconBtn, Section, FloatingAdd, chipBtn, inputStyle, tabBtn } from "./UI";

export default function TasksView({ tasks, addTask, updateTask, deleteTask, logAction, logs, deleteLog }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [catFilter, setCatFilter] = useState("all");
  const emptyForm = { title: "", category: "", industry: "", priority: "中", deadline: "", points: 1, status: "未着手", next_action: "" };
  const [form, setForm] = useState(emptyForm);
  const [anim, setAnim] = useState(null);
  const [quickTitle, setQuickTitle] = useState("");

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (t) => { setEditing(t.id); setForm({ ...t, deadline: t.deadline || "" }); setShowModal(true); };
  const save = () => { if (!form.title.trim()) return; if (editing) updateTask(editing, form); else addTask(form); setShowModal(false); };
  const complete = (t) => {
    if (t.status === "完了") { updateTask(t.id, { ...t, status: "未着手" }); const todayLog = logs && logs.find((l) => l.date === todayStr() && l.content === t.title && l.points === (t.points || 1)); if (todayLog && deleteLog) deleteLog(todayLog.id); return; }
    setAnim(t.id); setTimeout(() => setAnim(null), 700);
    updateTask(t.id, { ...t, status: "完了" });
    logAction({ date: todayStr(), content: t.title, minutes: 30, points: t.points || 1 });
  };
  const quickAdd = () => { if (!quickTitle.trim()) return; addTask({ title: quickTitle.trim(), category: null, industry: null, priority: "中", deadline: null, points: 1, status: "未着手", next_action: null }); setQuickTitle(""); };

  let filtered = tasks.filter((t) => filter === "all" ? true : filter === "done" ? t.status === "完了" : t.status !== "完了");
  if (catFilter !== "all") filtered = filtered.filter((t) => t.category === catFilter);

  return (
    <div>
      <Section kicker="行動を外部化する" title="タスク管理" sub={`進行中${tasks.filter(t=>t.status!=="完了").length}件・完了${tasks.filter(t=>t.status==="完了").length}件`} />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}><input style={{ ...inputStyle, flex: 1, padding: "12px 14px" }} value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && quickAdd()} placeholder="タスク名だけ入れてEnter（詳細は後から）" /><Btn onClick={quickAdd} style={{ flexShrink: 0, padding: "12px 16px" }}>追加</Btn></div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>{[["pending","進行中"],["done","完了した"],["all","全て"]].map(([k,l])=>(<button key={k} onClick={()=>setFilter(k)} style={tabBtn(filter===k,C.teal)}>{l}</button>))}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}><button onClick={()=>setCatFilter("all")} style={chipBtn(catFilter==="all",C.teal)}>すべて</button>{CATEGORIES.map((c)=><button key={c.id} onClick={()=>setCatFilter(c.id)} style={chipBtn(catFilter===c.id,c.color)}>{c.icon} {c.id}</button>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {filtered.length===0&&(<div style={{ gridColumn:"1/-1",textAlign:"center",padding:"32px 0",color:C.faint }}><div style={{fontSize:36,marginBottom:10}}>🗺️</div><div style={{fontSize:14}}>タスクがありません</div></div>)}
        {filtered.map((t) => { const cat=CATEGORIES.find((c)=>c.id===t.category); const done=t.status==="完了"; const d=t.deadline?daysUntil(t.deadline):null; const isUrgent=d!==null&&d<=3&&d>=0&&!done; const isAnim=anim===t.id;
          return (<div key={t.id} style={{ background:isAnim?`${C.teal}33`:C.card, border:`1px solid ${isAnim?C.teal:isUrgent?`${C.red}44`:C.cardBorder}`, borderRadius:14, padding:"12px 12px", opacity:done?0.55:1, transition:"all 0.3s", transform:isAnim?"scale(1.02)":"scale(1)", display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}><button onClick={()=>complete(t)} style={{ width:22,height:22,borderRadius:"50%",border:`2px solid ${done?C.teal:cat?.color||C.teal}`,background:done?C.teal:"transparent",cursor:"pointer",flexShrink:0,color:"#0f0e17",fontSize:11,fontWeight:900 }}>{done?"✓":""}</button><div style={{flex:1}}/><IconBtn onClick={()=>openEdit(t)} kind="edit"/><IconBtn onClick={()=>deleteTask(t.id)} kind="del"/></div>
            <div style={{ fontSize:13,fontWeight:700,lineHeight:1.3,textDecoration:done?"line-through":"none",color:done?C.sub:C.text,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" }}>{t.title}</div>
            <div style={{ display:"flex",gap:4,flexWrap:"wrap",alignItems:"center" }}>{cat&&<Badge color={cat.color} style={{fontSize:9}}>{cat.icon}</Badge>}{t.priority&&t.priority!=="中"&&<Badge color={PRIORITY_COLORS[t.priority]} style={{fontSize:9}}>{t.priority}</Badge>}<Badge color={C.yellow} style={{fontSize:9}}>+{t.points}pt</Badge>{t.deadline&&<span style={{fontSize:10,color:isUrgent?C.red:C.faint}}>{formatDate(t.deadline)}{isUrgent&&` (${d}日)`}</span>}</div>
            {t.next_action&&<div style={{fontSize:10,color:C.sub}}>→ {t.next_action.slice(0,20)}{t.next_action.length>20?"…":""}</div>}
            {done&&<button onClick={()=>complete(t)} style={{fontSize:10,color:C.sub,background:"none",border:`1px solid ${C.cardBorder}`,borderRadius:6,cursor:"pointer",padding:"1px 6px",fontFamily:"inherit",textAlign:"left"}}>↩ 取り消す</button>}
          </div>);
        })}
      </div>
      <FloatingAdd onClick={openNew}/>
      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editing?"タスクを編集":"新しいタスク"}>
        <Field label="タスク名"><input style={inputStyle} value={form.title} onChange={(e)=>setForm((f)=>({...f,title:e.target.value}))} placeholder="例：SPI 非言語 10問"/></Field>
        <div style={{marginBottom:14}}><div style={{fontSize:12,color:C.sub,marginBottom:8}}>クイック入力</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{POINT_PRESETS.map((p)=><button key={p.label} onClick={()=>setForm((f)=>({...f,title:p.label,points:p.points,category:p.category}))} style={chipBtn(false,C.sub)}>{p.label}</button>)}</div></div>
        <Field label="カテゴリ"><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{CATEGORIES.map((c)=><button key={c.id} onClick={()=>setForm((f)=>({...f,category:c.id}))} style={chipBtn(form.category===c.id,c.color)}>{c.icon} {c.id}</button>)}</div></Field>
        <Field label="業界"><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{INDUSTRIES.map((i)=><button key={i} onClick={()=>setForm((f)=>({...f,industry:f.industry===i?"":i}))} style={chipBtn(form.industry===i,"#0ea5e9")}>{i}</button>)}</div></Field>
        <div style={{display:"flex",gap:10}}><Field label="優先度"><div style={{display:"flex",gap:6}}>{["高","中","低"].map((p)=><button key={p} onClick={()=>setForm((f)=>({...f,priority:p}))} style={chipBtn(form.priority===p,PRIORITY_COLORS[p])}>{p}</button>)}</div></Field><Field label="ポイント"><input style={{...inputStyle,width:80}} type="number" min={1} value={form.points} onChange={(e)=>setForm((f)=>({...f,points:+e.target.value}))}/></Field></div>
        <Field label="締切"><div style={{display:"flex",gap:8}}><input style={{...inputStyle,flex:1}} type="date" value={form.deadline} onChange={(e)=>setForm((f)=>({...f,deadline:e.target.value}))}/>{form.deadline&&<button onClick={()=>setForm((f)=>({...f,deadline:""}))} style={{flexShrink:0,background:"none",border:`1px solid ${C.cardBorder}`,color:C.faint,borderRadius:10,padding:"0 12px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>リセット</button>}</div></Field>
        <Field label="次のアクション（任意）"><input style={inputStyle} value={form.next_action} onChange={(e)=>setForm((f)=>({...f,next_action:e.target.value}))} placeholder="例：テキストp.50まで"/></Field>
        <div style={{display:"flex",gap:10,marginTop:8}}><Btn variant="ghost" onClick={()=>setShowModal(false)} style={{flex:1}}>キャンセル</Btn><Btn onClick={save} style={{flex:2}}>{editing?"更新":"追加"}</Btn></div>
      </Modal>
    </div>
  );
}
