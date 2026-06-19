import { useState, useEffect } from "react";
import { C, STUDY_CATEGORIES, ANTHROPIC_KEY_STORAGE, getAnthropicKey, todayStr } from "../constants";
import { sbRest } from "../lib/supabase";
import { Badge, Card, Btn, Modal, Field, IconBtn, Section, FloatingAdd, chipBtn, inputStyle, tabBtn, fldrBtn } from "./UI";

function fillMatch(userRaw, correctRaw) { const clean = (s) => String(s||"").replace(/[,、，　]/g,"").replace(/[Ａ-Ｚａ-ｚ０-９]/g,(c)=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).trim().toLowerCase(); const numOnly = (s) => s.replace(/[^0-9.]/g,""); const u = clean(userRaw); const c = clean(correctRaw); if (u===c) return true; const un = numOnly(u); const cn = numOnly(c); return un.length>0&&cn.length>0&&un===cn; }
function choiceMatch(userAnswer, correctAnswer, choices) { if (!choices||choices.length===0) return false; const correctIdx = choices.findIndex((c)=>c.toLowerCase().trim()===(correctAnswer||"").toLowerCase().trim()); if (correctIdx>=0&&+userAnswer===correctIdx) return true; const userText = choices[+userAnswer]||""; return userText.toLowerCase().trim()===(correctAnswer||"").toLowerCase().trim(); }

function buildJsonFormat(category) { return `必ずJSON形式で返してください（他のテキストは不要）：\n{"title":"大問のタイトル","category":"${category}","subproblems":[{"question":"小問の文章","type":"choice"|"fill"|"text","choices":["選択肢A","選択肢B","選択肢C","選択肢D"],"answer":"正解","explanation":"解説"}]}`; }

function buildPrompt(category) {
  const prompts = {
    "SPI非言語": `就活SPIの非言語問題を1問作成してください。単純な四則演算・価格計算は出さないでください。推論・暗号・図形・順序・集合・確率・速度割合の応用から選んでください。fill形式は単位をquestionに明記しanswerは数字のみ。大問形式で小問2〜3つ。全てchoiceまたはfill形式。解説は思考プロセスを丁寧に。`,
    "SPI言語": `就活SPIの言語問題を1問作成してください。必ず本文を含めた上で小問を作ってください。大問形式で小問2〜3つ。全てchoiceまたはfill形式。`,
    "TG-WEB": `TG-WEB形式の問題を1問作成。図表は文章で表現。全てchoiceまたはfill形式。小問2〜3つ。`,
    "玉手箱": `玉手箱形式の問題を1問作成。全てchoiceまたはfill形式。小問2〜3つ。`,
    "フェルミ": `フェルミ推定の問題を1問。フレームワーク確認型か論理構造型で。小問2〜3つ、全てchoiceまたはfill形式。`,
    "ケース": `ケース面接の実践問題を1問。具体的なビジネス問題で論点の立て方を選択肢で問う。小問2〜3つ、全てchoiceまたはfill形式。`,
    "GD": `GD実践問題を1問。テーマを提示し論点・MECE・反対意見対応を問う。小問2〜3つ、全てchoice形式。`,
    "フレームワーク": `思考フレームワークの定義・構成要素・使い方を問う問題を1問。3C/4P/SWOT/PEST/5Forces等から。小問2〜3つ、choice/fill形式。`,
    "ビジネス知識": `ビジネス基礎知識を問う問題を1問。PL/BS/ROE/KPI/LTV等から。小問2〜3つ、choice/fill形式。`,
  };
  return (prompts[category] || prompts["SPI非言語"]) + "\n\n" + buildJsonFormat(category);
}

async function generateProblem(category) { const key = getAnthropicKey(); if (!key) return null; const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 2500, messages: [{ role: "user", content: buildPrompt(category) }] }) }); if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(`${res.status}: ${e.error?.message||res.statusText}`); } const data = await res.json(); const text = data.content?.[0]?.text||""; return JSON.parse(text.replace(/```json|```/g,"").trim()); }

function PracticeMode({ studyProblems, setStudyProblems, studyLogs, setStudyLogs, userId, addLog, hasApiKey }) {
  const [selectedCat, setSelectedCat] = useState("ランダム");
  const [source, setSource] = useState("ai");
  const [phase, setPhase] = useState("select");
  const [problem, setProblem] = useState(null);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [error, setError] = useState("");
  const cats = ["ランダム", ...STUDY_CATEGORIES];

  const startPractice = async () => { setPhase("loading"); setError(""); setAnswers({}); const cat = selectedCat === "ランダム" ? STUDY_CATEGORIES[Math.floor(Math.random()*STUDY_CATEGORIES.length)] : selectedCat; const bankProblems = studyProblems.filter((p) => selectedCat === "ランダム" || p.category === cat);
    if (source === "ai") { if (!hasApiKey) { setError("AIを使うにはStudyタブでAPIキーを設定してください。"); setPhase("select"); return; } try { const generated = await generateProblem(cat); if (generated) { setProblem({...generated, source:"ai"}); setPhase("problem"); return; } setError("問題の生成に失敗しました。"); setPhase("select"); } catch (e) { setError(`AI生成エラー: ${e.message}`); setPhase("select"); } return; }
    if (source === "bank") { if (bankProblems.length===0) { setError("このカテゴリの問題バンクが空です。"); setPhase("select"); return; } const pick = bankProblems[Math.floor(Math.random()*bankProblems.length)]; setProblem({...pick, source:"bank"}); setPhase("problem"); }
  };

  const checkAnswers = () => { const subs = problem.subproblems||[]; let correct = 0; subs.forEach((sub,i) => { if (sub.type==="text") { correct++; return; } if (sub.type==="choice" ? choiceMatch(answers[i],sub.answer,sub.choices) : fillMatch(answers[i],sub.answer)) correct++; }); setScore(correct); setPhase("result"); };

  const saveAndNext = async () => { const subs = problem.subproblems||[]; const isPerfect = score===subs.length; const entry = { user_id:userId, problem_id:problem.id||null, category:problem.category, title:problem.title, date:new Date().toLocaleDateString("ja-JP"), answers, score, max_score:subs.length, memo:"" }; try { const [row] = await sbRest("POST","study_logs",entry); setStudyLogs((p)=>[row||entry,...p]); } catch { setStudyLogs((p)=>[entry,...p]); } if (addLog&&isPerfect) addLog({date:todayStr(),content:`練習全問正解：${problem.title?.slice(0,20)}`,minutes:3,points:1}); setPhase("select"); setProblem(null); setAnswers({}); };

  if (phase==="select") return (<div><div style={{fontSize:13,color:C.sub,marginBottom:16}}>カテゴリと出題元を選んで問題を解こう。</div>{error&&<div style={{background:`${C.red}15`,border:`1px solid ${C.red}44`,borderRadius:10,padding:"10px 14px",fontSize:12,color:C.red,marginBottom:12}}>{error}</div>}<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{cats.map((c)=><button key={c} onClick={()=>setSelectedCat(c)} style={chipBtn(selectedCat===c,C.teal)}>{c}</button>)}</div><div style={{display:"flex",gap:6,marginBottom:20}}>{[["ai","🤖 AI生成"],["bank","📦 バンクから"]].map(([val,label])=>(<button key={val} onClick={()=>setSource(val)} style={chipBtn(source===val,C.purple)}>{label}</button>))}</div><Btn onClick={startPractice} style={{width:"100%"}}>🎮 問題を出す</Btn></div>);
  if (phase==="loading") return (<div style={{textAlign:"center",padding:60}}><div style={{fontSize:40,marginBottom:16}}>🔄</div><div style={{fontSize:14,color:C.teal,fontWeight:700}}>問題を生成中…</div></div>);

  if ((phase==="problem"||phase==="result")&&problem) { const subs=problem.subproblems||[]; const isResult=phase==="result";
    return (<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{display:"flex",gap:6}}><Badge color={C.teal}>{problem.category}</Badge>{problem.source==="ai"&&<Badge color={C.purple}>AI生成</Badge>}</div>{isResult&&<div style={{fontSize:16,fontWeight:900,color:C.teal}}>{score}/{subs.length}問正解 {score===subs.length?"+1pt 🎉":""}</div>}</div><div style={{fontSize:15,fontWeight:800,marginBottom:16,lineHeight:1.5}}>{problem.title}</div>
      {subs.map((sub,i)=>{ const isText=sub.type==="text"; const correctIdx=sub.choices?sub.choices.findIndex((c)=>c.toLowerCase()===(sub.answer||"").toLowerCase()):-1; const isCorrect=isText?true:(sub.type==="choice"?choiceMatch(answers[i],sub.answer,sub.choices):fillMatch(answers[i],sub.answer));
        return (<div key={i} style={{background:C.card,border:`1px solid ${isResult?(isText?C.cardBorder:isCorrect?C.green+"44":C.red+"44"):C.cardBorder}`,borderRadius:14,padding:"14px 16px",marginBottom:10}}><div style={{fontSize:13,fontWeight:700,marginBottom:10,color:isResult&&!isText?(isCorrect?C.green:C.red):C.text}}>({i+1}) {isResult&&!isText&&(isCorrect?"✓ ":"✗ ")}{sub.question}</div>
          {!isResult&&sub.type==="choice"&&(sub.choices||[]).map((ch,j)=>(<button key={j} onClick={()=>setAnswers((a)=>({...a,[i]:String(j)}))} style={{display:"block",width:"100%",textAlign:"left",padding:"8px 12px",marginBottom:6,borderRadius:10,border:`1px solid ${answers[i]===String(j)?C.teal:C.cardBorder}`,background:answers[i]===String(j)?`${C.teal}22`:"transparent",color:C.text,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>{ch}</button>))}
          {!isResult&&sub.type==="fill"&&<input style={inputStyle} value={answers[i]||""} onChange={(e)=>setAnswers((a)=>({...a,[i]:e.target.value}))} placeholder="答えを入力"/>}
          {!isResult&&sub.type==="text"&&<textarea style={{...inputStyle,height:80,resize:"vertical"}} value={answers[i]||""} onChange={(e)=>setAnswers((a)=>({...a,[i]:e.target.value}))} placeholder="自分の考えを入力"/>}
          {isResult&&!isText&&!isCorrect&&<div style={{fontSize:12,color:C.green,marginBottom:4}}>正解：{sub.choices?sub.choices[correctIdx]:sub.answer}</div>}
          {isResult&&sub.explanation&&<div style={{fontSize:12,color:C.teal,background:`${C.teal}12`,padding:"8px 10px",borderRadius:8,marginTop:6}}>💡 {sub.explanation}</div>}
          {isResult&&isText&&sub.answer&&<div style={{fontSize:12,color:C.yellow,background:`${C.yellow}12`,padding:"8px 10px",borderRadius:8,marginTop:6}}>📝 模範解答：{sub.answer}</div>}
        </div>); })}
      {!isResult&&<Btn onClick={checkAnswers} style={{width:"100%"}}>答え合わせ →</Btn>}
      {isResult&&<div style={{display:"flex",gap:10}}><Btn variant="ghost" onClick={()=>{setPhase("select");setProblem(null);setAnswers({});}} style={{flex:1}}>終了</Btn>{problem?.source==="ai"&&(<Btn variant="ghost" onClick={async()=>{ try { const [row]=await sbRest("POST","study_problems",{user_id:userId,category:problem.category,title:problem.title,subproblems:problem.subproblems,memo:"練習から保存"}); if(setStudyProblems) setStudyProblems((p)=>[row||{id:Date.now(),...problem},...p]); alert("バンクに保存しました！"); } catch(e){alert("保存に失敗: "+e.message);} }} style={{flex:1,fontSize:12}}>📦 バンクへ</Btn>)}<Btn onClick={saveAndNext} style={{flex:2}}>{score===subs.length?"記録して +1pt 獲得 🎉":"記録して終了"}</Btn></div>}
    </div>);
  }
  return null;
}

export default function StudyView({ studyProblems, setStudyProblems, studyLogs, setStudyLogs, addLog, userId }) {
  const [tab, setTab] = useState("practice");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ category: "SPI非言語", title: "", subproblems: [], memo: "" });
  const [subForm, setSubForm] = useState({ question: "", type: "choice", choices: ["","","",""], answer: "", explanation: "" });
  const [openBankFolders, setOpenBankFolders] = useState({});
  const [expandedBank, setExpandedBank] = useState(null);
  const [anthKey, setAnthKey] = useState(() => getAnthropicKey());
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const saveAnthKey = (k) => { setAnthKey(k); try { localStorage.setItem(ANTHROPIC_KEY_STORAGE, k); } catch {} setShowKeyInput(false); };

  const addProblem = async (p) => { try { const rows = await sbRest("POST","study_problems",{user_id:userId,...p}); const row = Array.isArray(rows)?rows[0]:rows; setStudyProblems((prev)=>[row||{id:Date.now(),...p},...prev]); } catch { setStudyProblems((prev)=>[{id:Date.now(),...p},...prev]); } };
  const deleteProblem = async (id) => { setStudyProblems((prev)=>prev.filter((p)=>p.id!==id)); try { await sbRest("DELETE",`study_problems?id=eq.${id}`); } catch {} };
  const save = () => { if (!form.title.trim()||form.subproblems.length===0) return; if (editing) { setStudyProblems((prev)=>prev.map((p)=>p.id===editing?{...p,...form}:p)); sbRest("PATCH",`study_problems?id=eq.${editing}`,form).catch(()=>{}); } else { addProblem(form); } setShowModal(false); };
  const addSubproblem = () => { if (!subForm.question.trim()) return; const sub = {...subForm, choices: subForm.type==="choice"?subForm.choices.filter((c)=>c.trim()):undefined}; setForm((f)=>({...f,subproblems:[...f.subproblems,sub]})); setSubForm({question:"",type:"choice",choices:["","","",""],answer:"",explanation:""}); };

  return (
    <div>
      <Section kicker="毎日の学習習慣" title="Study" />
      <Card style={{ marginBottom: 16, border: `1px solid ${anthKey ? C.teal+"44" : C.yellow+"44"}` }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div><div style={{fontSize:12,fontWeight:700,color:anthKey?C.teal:C.yellow}}>{anthKey?"✓ Claude API 有効（AI問題生成）":"⚠ Claude APIキー未設定"}</div><div style={{fontSize:11,color:C.faint,marginTop:2}}>{anthKey?"AIがランダムに問題を生成します":"設定するとAIが毎日問題を生成します"}</div></div>
          <button onClick={()=>{setKeyDraft(anthKey);setShowKeyInput(!showKeyInput);}} style={{background:"none",border:`1px solid ${C.cardBorder}`,color:C.sub,borderRadius:8,padding:"6px 12px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{showKeyInput?"閉じる":anthKey?"変更":"設定"}</button>
        </div>
        {showKeyInput&&(<div style={{marginTop:12}}><input style={{...inputStyle,marginBottom:8,fontFamily:"monospace",fontSize:12}} type="password" value={keyDraft} onChange={(e)=>setKeyDraft(e.target.value)} placeholder="sk-ant-..."/><div style={{fontSize:11,color:C.faint,marginBottom:8}}>このデバイスのみに保存されます</div><div style={{display:"flex",gap:8}}>{anthKey&&<Btn variant="ghost" onClick={()=>saveAnthKey("")} style={{flex:1,fontSize:12}}>削除</Btn>}<Btn onClick={()=>saveAnthKey(keyDraft.trim())} style={{flex:2,fontSize:12}}>保存</Btn></div></div>)}
      </Card>
      <div style={{display:"flex",gap:4,marginBottom:18,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:4}}><button onClick={()=>setTab("practice")} style={tabBtn(tab==="practice",C.teal)}>🎮 練習する</button><button onClick={()=>setTab("bank")} style={tabBtn(tab==="bank",C.purple)}>📦 問題バンク</button></div>

      {tab==="practice"&&<PracticeMode studyProblems={studyProblems} setStudyProblems={setStudyProblems} studyLogs={studyLogs} setStudyLogs={setStudyLogs} userId={userId} addLog={addLog} hasApiKey={!!anthKey}/>}

      {tab==="bank"&&(<div>
        {studyProblems.length===0&&(<div style={{textAlign:"center",padding:40,color:C.faint}}><div style={{fontSize:36,marginBottom:12}}>📦</div>自分で解いて躓いた問題を登録しよう</div>)}
        {(()=>{ const groups={}; studyProblems.forEach((p)=>{const cat=p.category||"その他"; if(!groups[cat]) groups[cat]=[]; groups[cat].push(p);}); const sortedCats=[...STUDY_CATEGORIES,"その他"].filter((c)=>groups[c]); Object.keys(groups).forEach((c)=>{if(!sortedCats.includes(c)) sortedCats.push(c);});
          return sortedCats.map((cat)=>{const probs=groups[cat]; const isOpen=!!openBankFolders[cat];
            return (<div key={cat} style={{marginBottom:8}}><button onClick={()=>setOpenBankFolders((p)=>({...p,[cat]:!p[cat]}))} style={{...fldrBtn(isOpen)}}><span style={{fontSize:11,color:isOpen?C.teal:C.faint,transition:"transform 0.2s",display:"inline-block",transform:isOpen?"rotate(90deg)":"none"}}>▶</span><span style={{fontSize:13,fontWeight:600}}>{cat}</span><span style={{fontSize:10,background:"#0ea5e922",color:"#0ea5e9",fontWeight:700,padding:"2px 8px",borderRadius:99}}>{probs.length}</span></button>
              {isOpen&&(<div style={{display:"flex",flexDirection:"column",gap:6,paddingLeft:4}}>{probs.map((p)=>{const isExp=expandedBank===p.id;
                return (<div key={p.id} style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:10,overflow:"hidden"}}><div style={{display:"flex",alignItems:"center",padding:"8px 12px",gap:8}}><button onClick={()=>setExpandedBank(isExp?null:p.id)} style={{flex:1,background:"none",border:"none",textAlign:"left",cursor:"pointer",color:C.text,padding:0,fontFamily:"inherit",minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:10,color:isExp?C.teal:C.faint}}>{isExp?"▼":"▶"}</span><span style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</span><span style={{fontSize:10,color:C.faint,flexShrink:0}}>{(p.subproblems||[]).length}問</span></div></button><IconBtn onClick={()=>{setEditing(p.id);setForm({category:p.category,title:p.title,subproblems:p.subproblems||[],memo:p.memo||""});setShowModal(true);}} kind="edit"/><IconBtn onClick={()=>deleteProblem(p.id)} kind="del"/></div>
                  {isExp&&(<div style={{padding:"0 12px 10px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>{(p.subproblems||[]).map((sub,i)=>(<div key={i} style={{marginTop:10}}><div style={{fontSize:12,fontWeight:700,marginBottom:4}}>({i+1}) {sub.question}</div>{sub.type==="choice"&&(sub.choices||[]).map((ch,j)=>(<div key={j} style={{fontSize:11,color:ch===sub.answer||j===sub.choices?.findIndex((c)=>c===sub.answer)?C.green:C.faint,padding:"2px 0"}}>{ch===sub.answer?"✓ ":"　"}{ch}</div>))}{sub.type==="fill"&&<div style={{fontSize:11,color:C.green}}>答え：{sub.answer}</div>}{sub.explanation&&<div style={{fontSize:11,color:C.teal,marginTop:4}}>💡 {sub.explanation}</div>}</div>))}{p.memo&&<div style={{marginTop:8,fontSize:11,color:C.faint}}>メモ：{p.memo}</div>}</div>)}
                </div>);})}</div>)}</div>);});
        })()}
        <FloatingAdd onClick={()=>{setEditing(null);setForm({category:"SPI非言語",title:"",subproblems:[],memo:""});setShowModal(true);}}/>
      </div>)}

      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editing?"問題を編集":"問題を追加"}>
        <Field label="カテゴリ"><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{STUDY_CATEGORIES.map((c)=><button key={c} onClick={()=>setForm((f)=>({...f,category:c}))} style={chipBtn(form.category===c,C.teal)}>{c}</button>)}</div></Field>
        <Field label="大問タイトル"><input style={inputStyle} value={form.title} onChange={(e)=>setForm((f)=>({...f,title:e.target.value}))} placeholder="例：AとBとCのうち1人が嘘をついている…"/></Field>
        {form.subproblems.length>0&&(<Field label={`登録済み小問 (${form.subproblems.length})`}>{form.subproblems.map((sub,i)=>(<div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"8px 12px",marginBottom:6,fontSize:12}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.sub}}>({i+1}) {sub.question.slice(0,40)}{sub.question.length>40?"…":""}</span><button onClick={()=>setForm((f)=>({...f,subproblems:f.subproblems.filter((_,j)=>j!==i)}))} style={{background:"none",border:"none",color:C.faint,cursor:"pointer"}}>✕</button></div></div>))}</Field>)}
        <Field label="小問を追加"><div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.cardBorder}`,borderRadius:12,padding:12}}><textarea style={{...inputStyle,height:60,resize:"vertical",marginBottom:8}} value={subForm.question} onChange={(e)=>setSubForm((f)=>({...f,question:e.target.value}))} placeholder="小問の文章"/><div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>{["choice","fill","text"].map((t)=><button key={t} onClick={()=>setSubForm((f)=>({...f,type:t}))} style={chipBtn(subForm.type===t,C.teal)}>{t==="choice"?"選択肢":t==="fill"?"穴埋め":"記述"}</button>)}</div>{subForm.type==="choice"&&subForm.choices.map((ch,i)=>(<input key={i} style={{...inputStyle,marginBottom:6}} value={ch} onChange={(e)=>setSubForm((f)=>({...f,choices:f.choices.map((c,j)=>j===i?e.target.value:c)}))} placeholder={`選択肢 ${i+1}`}/>))}<input style={{...inputStyle,marginBottom:6}} value={subForm.answer} onChange={(e)=>setSubForm((f)=>({...f,answer:e.target.value}))} placeholder={subForm.type==="text"?"模範解答":"正解"}/><input style={{...inputStyle,marginBottom:8}} value={subForm.explanation} onChange={(e)=>setSubForm((f)=>({...f,explanation:e.target.value}))} placeholder="解説（任意）"/><Btn onClick={addSubproblem} style={{width:"100%",fontSize:13}}>＋ 小問を追加</Btn></div></Field>
        <Field label="メモ（任意）"><input style={inputStyle} value={form.memo} onChange={(e)=>setForm((f)=>({...f,memo:e.target.value}))} placeholder="どの問題集の何ページか、など"/></Field>
        <div style={{display:"flex",gap:10}}><Btn variant="ghost" onClick={()=>setShowModal(false)} style={{flex:1}}>キャンセル</Btn><Btn onClick={save} style={{flex:2}}>{editing?"更新":"追加"}</Btn></div>
      </Modal>
    </div>
  );
}
