import { useState, useEffect } from "react";
import { C, INDUSTRIES, DEADLINE_KINDS, getAnthropicKey } from "../constants";
import { Badge, Btn, Modal, Field, IconBtn, Section, FloatingAdd, chipBtn, inputStyle, tabBtn, fldrBtn } from "./UI";

const cpyBtn = { fontSize: 10, color: C.teal, background: `${C.teal}15`, border: `1px solid ${C.teal}33`, borderRadius: 8, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit" };

const QA_TAGS = ["自己PR", "志望動機", "学生時代に力を入れたこと", "強み・弱み", "挫折経験", "チームワーク", "逆質問", "その他"];

/* ── hooks ── */
const DEFAULT_CATS = ["自己PR", "志望動機", "学生時代", "挫折・困難", "チームワーク", "その他"];
function useESCategories() {
  const [cats, setCats] = useState(() => { try { const s = localStorage.getItem("compass_es_cats"); return s ? JSON.parse(s) : DEFAULT_CATS; } catch { return DEFAULT_CATS; } });
  useEffect(() => { if (window._compassRemoteEsCats) { setCats(window._compassRemoteEsCats); window._compassRemoteEsCats = null; } });
  const save = (updated) => { setCats(updated); try { localStorage.setItem("compass_es_cats", JSON.stringify(updated)); } catch {} if (window._compassUpsertSettings) window._compassUpsertSettings({ es_cats: updated }); };
  return [cats, save];
}

const DEFAULT_PHASES = ["夏インターン", "冬インターン", "早期選考", "本選考", "その他"];
function useESPhases() {
  const [phases, setPhases] = useState(() => { try { const s = localStorage.getItem("compass_es_phases"); return s ? JSON.parse(s) : DEFAULT_PHASES; } catch { return DEFAULT_PHASES; } });
  useEffect(() => { if (window._compassRemoteEsPhases) { setPhases(window._compassRemoteEsPhases); window._compassRemoteEsPhases = null; } });
  const save = (updated) => { setPhases(updated); try { localStorage.setItem("compass_es_phases", JSON.stringify(updated)); } catch {} if (window._compassUpsertSettings) window._compassUpsertSettings({ es_phases: updated }); };
  return [phases, save];
}

function classifyES(question, cats) {
  const q = (question || "").toLowerCase();
  if (q.includes("自己pr") || q.includes("強み") || q.includes("弱み")) return cats.includes("自己PR") ? "自己PR" : cats[cats.length - 1];
  if (q.includes("志望") || q.includes("なぜ")) return cats.includes("志望動機") ? "志望動機" : cats[cats.length - 1];
  if (q.includes("学生") || q.includes("ガクチカ") || q.includes("力を入れ")) return cats.includes("学生時代") ? "学生時代" : cats[cats.length - 1];
  if (q.includes("挫折") || q.includes("失敗") || q.includes("困難")) return cats.includes("挫折・困難") ? "挫折・困難" : cats[cats.length - 1];
  if (q.includes("チーム") || q.includes("協力") || q.includes("リーダー")) return cats.includes("チームワーク") ? "チームワーク" : cats[cats.length - 1];
  return cats[cats.length - 1] || "その他";
}

/* ── QATab ── */
function QATab({ qaLibrary, deleteQA, openEdit }) {
  const [openFolders, setOpenFolders] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [qaFeedback, setQaFeedback] = useState({});
  const [checkingId, setCheckingId] = useState(null);
  const [showRevision, setShowRevision] = useState({});
  const [qaView, setQaView] = useState("tag");
  const toggleFolder = (key) => setOpenFolders((p) => ({ ...p, [key]: !p[key] }));

  const checkQA = async (q) => {
    const key = getAnthropicKey(); if (!key) { alert("StudyタブでClaude APIキーを設定してください"); return; }
    if (!q.answer?.trim()) { alert("回答が入力されていません"); return; }
    setCheckingId(q.id);
    try {
      const prompt = `あなたは就活面接のプロコーチです。以下の面接想定問答を分析してください。\n\n【カテゴリ】${q.tag || "未分類"}\n【質問】${q.question}\n【回答】\n${q.answer}\n\nこの学生は哲学専攻でプロダクトアウトになりがち。マーケットイン（面接官が聞きたいことへの回答）への転換が課題。改善のヒントとしてJSONで返してください：\n{"point_match":"論点のズレ","market_in":"マーケットイン度","conciseness":"結論ファーストか・過剰さ","specificity":"具体性","appeal":"訴求力","next_action":"最優先改善点","revision":"【参考案】改善例"}`;
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 2500, messages: [{ role: "user", content: prompt }] }) });
      const data = await res.json(); const text = data.content?.[0]?.text || ""; const clean = text.replace(/```json|```/g, "").trim();
      setQaFeedback((p) => ({ ...p, [q.id]: JSON.parse(clean) }));
    } catch (e) { setQaFeedback((p) => ({ ...p, [q.id]: { error: "分析に失敗しました: " + e.message } })); } finally { setCheckingId(null); }
  };

  const tagGroups = {}; qaLibrary.forEach((q) => { const k = q.tag || "未分類"; if (!tagGroups[k]) tagGroups[k] = []; tagGroups[k].push(q); });
  const sortedTags = [...QA_TAGS, "未分類"].filter((c) => tagGroups[c]); Object.keys(tagGroups).forEach((c) => { if (!sortedTags.includes(c)) sortedTags.push(c); });
  const indGroups = {}; qaLibrary.forEach((q) => { const k = q.industry || "業界未設定"; if (!indGroups[k]) indGroups[k] = []; indGroups[k].push(q); });
  const sortedInds = [...INDUSTRIES, "業界未設定"].filter((c) => indGroups[c]); Object.keys(indGroups).forEach((c) => { if (!sortedInds.includes(c)) sortedInds.push(c); });

  const qaCard = (q) => {
    const isExp = expanded === q.id; const fb = qaFeedback[q.id];
    return (
      <div key={q.id} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", gap: 8 }}>
          <button onClick={() => setExpanded(isExp ? null : q.id)} style={{ flex: 1, background: "none", border: "none", textAlign: "left", cursor: "pointer", color: C.text, padding: 0, fontFamily: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 10, color: isExp ? C.purple : C.faint }}>{isExp ? "▼" : "▶"}</span><span style={{ fontSize: 13, fontWeight: 700 }}>{q.question}</span></div>
            {!isExp && q.tag && <div style={{ marginTop: 3 }}><Badge color={C.purple} style={{ fontSize: 9 }}>{q.tag}</Badge>{q.industry && <Badge color="#0ea5e9" style={{ fontSize: 9, marginLeft: 4 }}>{q.industry}</Badge>}</div>}
          </button>
          <IconBtn onClick={() => openEdit(q)} kind="edit" /><IconBtn onClick={() => deleteQA(q.id)} kind="del" />
        </div>
        {isExp && (
          <div style={{ padding: "0 12px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {q.answer && (<div style={{ marginTop: 10 }}><div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}><button onClick={() => navigator.clipboard.writeText(q.answer).catch(() => {})} style={{ ...cpyBtn }}>📋 コピー</button></div><div style={{ fontSize: 13, color: C.sub, whiteSpace: "pre-wrap", lineHeight: 1.7, marginBottom: 12 }}>{q.answer}</div></div>)}
            {!fb && (<button onClick={() => checkQA(q)} disabled={checkingId === q.id} style={{ fontSize: 11, color: C.purple, background: `${C.purple}15`, border: `1px solid ${C.purple}33`, borderRadius: 99, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit", opacity: checkingId === q.id ? 0.5 : 1 }}>{checkingId === q.id ? "🤖 分析中…" : "🤖 AIにチェックしてもらう"}</button>)}
            {fb && !fb.error && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: C.purple, fontWeight: 700 }}>🤖 AI分析結果</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { const text = [["論点のズレ", fb.point_match], ["マーケットイン度", fb.market_in], ["端的さ", fb.conciseness], ["具体性", fb.specificity], ["訴求力", fb.appeal], ["🎯 最優先改善点", fb.next_action]].filter(([, v]) => v).map(([k, v]) => `【${k}】\n${v}`).join("\n\n"); navigator.clipboard.writeText(text).catch(() => {}); }} style={{ ...cpyBtn }}>📋 全コピー</button>
                    <button onClick={() => checkQA(q)} disabled={checkingId === q.id} style={{ fontSize: 10, color: C.purple, background: `${C.purple}15`, border: `1px solid ${C.purple}33`, borderRadius: 8, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit" }}>再分析</button>
                  </div>
                </div>
                {[{ label: "論点のズレ", value: fb.point_match, color: C.red }, { label: "マーケットイン度", value: fb.market_in, color: C.teal }, { label: "端的さ・過剰さ", value: fb.conciseness, color: C.yellow }, { label: "具体性", value: fb.specificity, color: "#0ea5e9" }, { label: "訴求力", value: fb.appeal, color: C.purple }].map((item) => item.value && (
                  <div key={item.label} style={{ background: `${item.color}10`, border: `1px solid ${item.color}30`, borderRadius: 10, padding: "8px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}><div style={{ fontSize: 10, color: item.color, fontWeight: 700 }}>{item.label}</div><button onClick={() => navigator.clipboard.writeText(item.value).catch(() => {})} style={{ fontSize: 9, color: C.faint, background: "none", border: "none", cursor: "pointer", padding: 0 }}>📋</button></div>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{item.value}</div>
                  </div>
                ))}
                {fb.next_action && (<div style={{ background: `${C.green}10`, border: `1px solid ${C.green}30`, borderRadius: 10, padding: "8px 12px" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}><div style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>🎯 最優先で改善すること</div><button onClick={() => navigator.clipboard.writeText(fb.next_action).catch(() => {})} style={{ fontSize: 9, color: C.faint, background: "none", border: "none", cursor: "pointer", padding: 0 }}>📋</button></div><div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, fontWeight: 600 }}>{fb.next_action}</div></div>)}
                {fb.revision && (<div><button onClick={() => setShowRevision((p) => ({ ...p, [q.id]: !p[q.id] }))} style={{ fontSize: 11, color: C.yellow, background: `${C.yellow}15`, border: `1px solid ${C.yellow}33`, borderRadius: 99, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>{showRevision[q.id] ? "▼ 改善案を隠す" : "▶ 改善案を見る（参考）"}</button>{showRevision[q.id] && (<div style={{ marginTop: 8, background: `${C.yellow}08`, border: `1px solid ${C.yellow}22`, borderRadius: 10, padding: "10px 12px" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><div style={{ fontSize: 10, color: C.yellow }}>※ あくまで参考案。</div><button onClick={() => navigator.clipboard.writeText(fb.revision).catch(() => {})} style={{ fontSize: 10, color: C.yellow, background: `${C.yellow}15`, border: `1px solid ${C.yellow}33`, borderRadius: 8, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit" }}>📋</button></div><div style={{ fontSize: 12, color: C.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{fb.revision}</div></div>)}</div>)}
              </div>
            )}
            {fb?.error && <div style={{ fontSize: 12, color: C.red, marginTop: 8 }}>{fb.error}</div>}
          </div>
        )}
      </div>
    );
  };

  const renderFolder = (sortedKeys, groups, color) => sortedKeys.map((cat) => {
    const items = groups[cat]; const isOpen = !!openFolders[`qa_${cat}`];
    return (<div key={cat}><button onClick={() => toggleFolder(`qa_${cat}`)} style={{ ...fldrBtn(isOpen) }}><span style={{ fontSize: 11, color: isOpen ? color : C.faint, display: "inline-block", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>▶</span><span style={{ fontSize: 13, fontWeight: 600 }}>{cat}</span><span style={{ fontSize: 10, background: "#0ea5e922", color: "#0ea5e9", fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{items.length}</span></button>{isOpen && <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 4 }}>{items.map(qaCard)}</div>}</div>);
  });

  if (qaLibrary.length === 0) return (<div style={{ textAlign: "center", padding: 40, color: C.faint }}>面接の想定問答を貯めよう<br /><span style={{ fontSize: 12 }}>鉄板質問への自分の回答をストック</span></div>);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 4, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4 }}><button onClick={() => setQaView("ind")} style={tabBtn(qaView === "ind", C.green)}>🏭 業界別</button><button onClick={() => setQaView("tag")} style={tabBtn(qaView === "tag", C.purple)}>📂 種別</button></div>
      {qaView === "tag" ? renderFolder(sortedTags, tagGroups, C.purple) : renderFolder(sortedInds, indGroups, "#0ea5e9")}
    </div>
  );
}

/* ── VaultView ── */
export default function VaultView({ esAnswers, addES, updateES, deleteES, qaLibrary, addQA, updateQA, deleteQA, esMaterials, addMat, updateMat, deleteMat, companies }) {
  const [tab, setTab] = useState("es");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [matFolders, setMatFolders] = useState({});
  const matViewState = useState("ind");
  const [expandedFolder, setExpandedFolder] = useState({});
  const [form, setForm] = useState({});
  const [esView, setEsView] = useState("company");
  const [esCats, saveEsCats] = useESCategories();
  const [esPhases, saveEsPhases] = useESPhases();
  const [showCatEdit, setShowCatEdit] = useState(false);
  const [showPhaseEdit, setShowPhaseEdit] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");
  const [newPhaseInput, setNewPhaseInput] = useState("");

  const toggleFolder = (key) => setExpandedFolder((p) => ({ ...p, [key]: !p[key] }));
  const isFolderOpen = (key) => !!expandedFolder[key];

  const open = (kind, item) => {
    setEditing(item ? item.id : null);
    if (kind === "es") setForm(item ? { ...item } : { company: "", company_id: "", question: "", answer: "", subtitle: "", char_limit: "", es_category: "", selection_phase: "" });
    if (kind === "qa") setForm(item ? { ...item } : { question: "", answer: "", tag: "" });
    if (kind === "mat") setForm(item ? { ...item } : { theme: "", episode: "", metric: "", industries: "" });
    setShowModal(true);
  };
  const save = () => {
    if (tab === "es") { if (!form.question?.trim()) return; const p = { company: form.company || null, question: form.question, answer: form.answer || null, subtitle: form.subtitle || null, char_limit: form.char_limit ? +form.char_limit : null, es_category: form.es_category || null, selection_phase: form.selection_phase || null }; editing ? updateES(editing, p) : addES(p); }
    if (tab === "qa") { if (!form.question?.trim()) return; const p = { question: form.question, answer: form.answer || null, tag: form.tag || null, industry: form.industry || null }; editing ? updateQA(editing, p) : addQA(p); }
    if (tab === "mat") { if (!form.theme?.trim()) return; const p = { theme: form.theme, episode: form.episode || null, metric: form.metric || null, industries: form.industries || null, mat_kind: form.mat_kind || null }; editing ? updateMat(editing, p) : addMat(p); }
    setShowModal(false);
  };

  const phaseColor = (phase) => { if (!phase) return C.faint; if (phase.includes("夏インターン")) return "#4ECDC4"; if (phase.includes("冬インターン")) return "#C3A6FF"; if (phase.includes("早期")) return "#FFE66D"; if (phase.includes("本選考")) return "#FF6B6B"; return C.sub; };

  const [checkResult, setCheckResult] = useState(null);
  const [checkingId, setCheckingId] = useState(null);
  const [showRevision, setShowRevision] = useState(false);

  const checkES = async (e) => {
    if (!e.answer?.trim()) { alert("回答が入力されていません"); return; }
    const key = getAnthropicKey(); if (!key) { alert("StudyタブでClaude APIキーを設定してください"); return; }
    setCheckingId(e.id); setCheckResult(null); setShowRevision(false);
    try {
      const prompt = `あなたは就活ES添削の専門家です。以下のES設問と回答を読み、設問のタイプを判断した上で適切な観点でフィードバックしてください。\n\n【設問】\n${e.question}\n\n【文字数制限】${e.char_limit ? e.char_limit + "字" : "不明"}\n\n【回答】\n${e.answer}\n\n---\n\n設問タイプを判定し（personal/analytical/other）、JSONで返してください。\npersonalなら{type,structure,agency,specificity,impression,next_action,revision}\nanalyticalなら{type,problem_setting,root_cause,solution,choice_appropriateness,next_action,revision}\nrevision：だ・である調、文字数制限の90〜100%以内、冒頭に「【参考案・${e.char_limit ? e.char_limit+"字制限" : "字数制限なし"}】」。評価・点数不要。改善ヒントとして。`;
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 2500, messages: [{ role: "user", content: prompt }] }) });
      const data = await res.json(); const text = data.content?.[0]?.text || ""; const clean = text.replace(/```json|```/g, "").trim();
      setCheckResult({ id: e.id, ...JSON.parse(clean) });
    } catch (err) { setCheckResult({ id: e.id, error: "チェックに失敗しました: " + err.message }); } finally { setCheckingId(null); }
  };

  const esCard = (e) => {
    const isOpen = expandedCard === e.id;
    return (
      <div key={e.id} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
          <button onClick={() => setExpandedCard(isOpen ? null : e.id)} style={{ flex: 1, background: "none", border: "none", textAlign: "left", cursor: "pointer", color: C.text, padding: 0, fontFamily: "inherit", minWidth: 0 }}>
            <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
              {e.selection_phase && <Badge color={phaseColor(e.selection_phase)}>{e.selection_phase}</Badge>}
              {e.char_limit && <Badge color={C.sub}>{e.char_limit}字</Badge>}
              {e.answer && <Badge color={C.teal}>{(e.answer || "").length}字</Badge>}
              <span style={{ fontSize: 10, color: isOpen ? C.teal : C.faint }}>{isOpen ? "▼" : "▶"}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: isOpen ? 99 : 2, WebkitBoxOrient: "vertical" }}>{e.question}</div>{e.subtitle && <div style={{ fontSize: 12, color: C.yellow, marginTop: 3, fontWeight: 600 }}>📌 {e.subtitle}</div>}
          </button>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}><IconBtn onClick={() => open("es", e)} kind="edit" /><IconBtn onClick={() => deleteES(e.id)} kind="del" /></div>
        </div>
        {isOpen && e.answer && (
          <div style={{ padding: "0 14px 12px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}><button onClick={() => navigator.clipboard.writeText(e.answer).catch(() => {})} style={{ ...cpyBtn }}>📋 コピー</button></div>
            <div style={{ fontSize: 13, color: C.sub, whiteSpace: "pre-wrap", lineHeight: 1.7, marginBottom: 12 }}>{e.answer}</div>
            <button onClick={() => checkES(e)} disabled={checkingId === e.id} style={{ fontSize: 11, color: C.teal, background: `${C.teal}15`, border: `1px solid ${C.teal}33`, borderRadius: 99, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit", opacity: checkingId === e.id ? 0.5 : 1 }}>{checkingId === e.id ? "チェック中…" : "🤖 AIにチェックしてもらう"}</button>
            {checkResult?.id === e.id && !checkResult.error && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => { const items = checkResult.type === "personal" ? [["PREP構造", checkResult.structure], ["主語・能動性", checkResult.agency], ["具体性", checkResult.specificity], ["印象・記憶残り", checkResult.impression]] : [["問題設定の鋭さ", checkResult.problem_setting], ["真因分析の深さ", checkResult.root_cause], ["解決策の質", checkResult.solution], ["企業・事例選択", checkResult.choice_appropriateness]]; const text = items.filter(([, v]) => v).map(([k, v]) => `【${k}】\n${v}`).join("\n\n") + (checkResult.next_action ? `\n\n【🎯 最優先で直すこと】\n${checkResult.next_action}` : ""); navigator.clipboard.writeText(text).catch(() => {}); }} style={{ alignSelf: "flex-end", ...cpyBtn }}>📋 フィードバックをコピー</button>
                {(checkResult.type === "personal" ? [{ label: "PREP構造", value: checkResult.structure, color: C.teal }, { label: "主語・能動性", value: checkResult.agency, color: C.purple }, { label: "具体性", value: checkResult.specificity, color: C.yellow }, { label: "印象・記憶残り", value: checkResult.impression, color: "#0ea5e9" }] : [{ label: "問題設定の鋭さ", value: checkResult.problem_setting, color: C.teal }, { label: "真因分析の深さ", value: checkResult.root_cause, color: C.red }, { label: "解決策の質", value: checkResult.solution, color: C.purple }, checkResult.choice_appropriateness && { label: "企業・事例選択", value: checkResult.choice_appropriateness, color: "#0ea5e9" }].filter(Boolean)).map((item) => item.value && (
                  <div key={item.label} style={{ background: `${item.color}10`, border: `1px solid ${item.color}30`, borderRadius: 10, padding: "8px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}><div style={{ fontSize: 10, color: item.color, fontWeight: 700 }}>{item.label}</div><button onClick={() => navigator.clipboard.writeText(`【${item.label}】\n${item.value}`).catch(() => {})} style={{ fontSize: 9, color: C.faint, background: "none", border: "none", cursor: "pointer", padding: 0 }}>📋</button></div>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{item.value}</div>
                  </div>
                ))}
                {checkResult.next_action && (<div style={{ background: `${C.green}10`, border: `1px solid ${C.green}30`, borderRadius: 10, padding: "8px 12px" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}><div style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>🎯 最優先で直すこと</div><button onClick={() => navigator.clipboard.writeText(checkResult.next_action).catch(() => {})} style={{ fontSize: 9, color: C.faint, background: "none", border: "none", cursor: "pointer", padding: 0 }}>📋</button></div><div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, fontWeight: 600 }}>{checkResult.next_action}</div></div>)}
                {checkResult.revision && (<div><button onClick={() => setShowRevision((p) => !p)} style={{ fontSize: 11, color: C.yellow, background: `${C.yellow}15`, border: `1px solid ${C.yellow}33`, borderRadius: 99, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>{showRevision ? "▼ 添削案を隠す" : "▶ 添削案を見る（参考）"}</button>{showRevision && (<div style={{ marginTop: 8, background: `${C.yellow}08`, border: `1px solid ${C.yellow}22`, borderRadius: 10, padding: "10px 12px" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><div style={{ fontSize: 10, color: C.yellow }}>※ あくまで参考案。内容・事実の判断はご自身で。</div><div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 10, color: C.faint }}>{(checkResult.revision || "").length}字</span><button onClick={() => navigator.clipboard.writeText(checkResult.revision).catch(() => {})} style={{ fontSize: 10, color: C.yellow, background: `${C.yellow}15`, border: `1px solid ${C.yellow}33`, borderRadius: 8, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>📋 コピー</button></div></div><div style={{ fontSize: 12, color: C.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{checkResult.revision}</div></div>)}</div>)}
              </div>
            )}
            {checkResult?.id === e.id && checkResult.error && (<div style={{ marginTop: 8, fontSize: 12, color: C.red }}>{checkResult.error}</div>)}
          </div>
        )}
        {isOpen && !e.answer && <div style={{ padding: "0 14px 10px", fontSize: 12, color: C.faint }}>回答未記入</div>}
      </div>
    );
  };

  const folder = (key, label, items, color, nested = false) => {
    const isOpen = isFolderOpen(key);
    return (<div key={key} style={{ marginBottom: nested ? 6 : 10 }}><button onClick={() => toggleFolder(key)} style={{ width: "100%", background: isOpen ? `${color}18` : "rgba(255,255,255,0.03)", border: `1px solid ${isOpen ? color + "44" : C.cardBorder}`, borderRadius: nested ? 10 : 12, padding: nested ? "8px 12px" : "11px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: C.text, fontFamily: "inherit" }}><span style={{ fontSize: nested ? 12 : 14, color: isOpen ? C.teal : C.faint, transition: "transform 0.2s", display: "inline-block", transform: isOpen ? "rotate(90deg)" : "none" }}>▶</span><span style={{ flex: 1, textAlign: "left", fontSize: nested ? 12 : 13, fontWeight: 700, color: isOpen ? color : C.text }}>{label}</span><span style={{ fontSize: 10, background: "#0ea5e922", color: "#0ea5e9", fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{items.length}</span></button>{isOpen && (<div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 5, paddingLeft: nested ? 4 : 8 }}>{items.map(esCard)}</div>)}</div>);
  };

  const renderEsByCompany = () => {
    const industryGroups = {};
    esAnswers.forEach((e) => { const co = (companies || []).find((c) => c.name === e.company); const industry = co?.industry || (e.company ? "その他" : "企業未設定"); if (!industryGroups[industry]) industryGroups[industry] = {}; const coKey = e.company || "（企業未設定）"; if (!industryGroups[industry][coKey]) industryGroups[industry][coKey] = []; industryGroups[industry][coKey].push(e); });
    return Object.entries(industryGroups).map(([industry, coGroups]) => {
      const indKey = `ind_${industry}`; const isIndOpen = isFolderOpen(indKey); const total = Object.values(coGroups).flat().length;
      return (<div key={industry} style={{ marginBottom: 10 }}><button onClick={() => toggleFolder(indKey)} style={{ width: "100%", background: isIndOpen ? "rgba(78,205,196,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${isIndOpen ? C.teal + "44" : C.cardBorder}`, borderRadius: 12, padding: "11px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: C.text, fontFamily: "inherit" }}><span style={{ fontSize: 12, color: isIndOpen ? C.teal : C.faint, transition: "transform 0.2s", display: "inline-block", transform: isIndOpen ? "rotate(90deg)" : "none" }}>▶</span><span style={{ textAlign: "left", fontSize: 13, fontWeight: 700, color: isIndOpen ? C.teal : C.text }}>{industry}</span><span style={{ fontSize: 10, background: "#0ea5e922", color: "#0ea5e9", fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{total}</span></button>
        {isIndOpen && (<div style={{ marginTop: 6, paddingLeft: 8 }}>{Object.entries(coGroups).map(([company, items]) => { const coKey = `co_${industry}_${company}`; const isCoOpen = isFolderOpen(coKey); const phaseGroups = {}; items.forEach((e) => { const ph = e.selection_phase || "フェーズ未設定"; if (!phaseGroups[ph]) phaseGroups[ph] = []; phaseGroups[ph].push(e); }); const hasMultiplePhases = Object.keys(phaseGroups).length > 1; return (<div key={company} style={{ marginBottom: 6 }}><button onClick={() => toggleFolder(coKey)} style={{ width: "100%", background: isCoOpen ? "#0ea5e918" : "rgba(255,255,255,0.02)", border: `1px solid ${isCoOpen ? "#0ea5e933" : C.cardBorder}`, borderRadius: 10, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: C.text, fontFamily: "inherit" }}><span style={{ fontSize: 11, color: isCoOpen ? C.teal : C.faint, transition: "transform 0.2s", display: "inline-block", transform: isCoOpen ? "rotate(90deg)" : "none" }}>▶</span><span style={{ textAlign: "left", fontSize: 12, fontWeight: 700, color: isCoOpen ? "#0ea5e9" : C.text }}>🏢 {company}</span><span style={{ fontSize: 10, background: "#0ea5e922", color: "#0ea5e9", fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{items.length}</span></button>{isCoOpen && (<div style={{ marginTop: 4, paddingLeft: 6, display: "flex", flexDirection: "column", gap: 5 }}>{hasMultiplePhases ? Object.entries(phaseGroups).map(([ph, phItems]) => folder(`co_${industry}_${company}_${ph}`, `📋 ${ph}`, phItems, phaseColor(ph), true)) : items.map(esCard)}</div>)}</div>); })}</div>)}
      </div>);
    });
  };

  const renderEsByCategory = () => {
    const groups = {}; esCats.forEach((c) => { groups[c] = []; }); esAnswers.forEach((e) => { const cat = e.es_category || classifyES(e.question, esCats); if (groups[cat]) groups[cat].push(e); else { if (!groups["その他"]) groups["その他"] = []; groups["その他"].push(e); } });
    return Object.entries(groups).filter(([, items]) => items.length > 0).map(([cat, items]) => {
      const isOpen = isFolderOpen(`cat_${cat}`); const phaseGroups = {}; items.forEach((e) => { const ph = e.selection_phase || "フェーズ未設定"; if (!phaseGroups[ph]) phaseGroups[ph] = []; phaseGroups[ph].push(e); }); const hasMultiplePhases = Object.keys(phaseGroups).length > 1;
      return (<div key={cat} style={{ marginBottom: 10 }}><button onClick={() => toggleFolder(`cat_${cat}`)} style={{ width: "100%", background: isOpen ? `${C.yellow}18` : "rgba(255,255,255,0.03)", border: `1px solid ${isOpen ? C.yellow + "44" : C.cardBorder}`, borderRadius: 12, padding: "11px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: C.text, fontFamily: "inherit" }}><span style={{ fontSize: 14, color: isOpen ? C.teal : C.faint, transition: "transform 0.2s", display: "inline-block", transform: isOpen ? "rotate(90deg)" : "none" }}>▶</span><span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 700, color: isOpen ? C.yellow : C.text }}>📂 {cat}</span><span style={{ fontSize: 10, background: "#0ea5e922", color: "#0ea5e9", fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{items.length}</span></button>{isOpen && (<div style={{ marginTop: 5, paddingLeft: 8, display: "flex", flexDirection: "column", gap: 5 }}>{hasMultiplePhases ? Object.entries(phaseGroups).map(([ph, phItems]) => folder(`cat_${cat}_${ph}`, `📋 ${ph}`, phItems, phaseColor(ph), true)) : items.map(esCard)}</div>)}</div>);
    });
  };

  const expandCard = (id, header, body, onEdit, onDel) => {
    const isOpen = expandedCard === id;
    return (<div key={id} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "10px 12px" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><button onClick={() => setExpandedCard(isOpen ? null : id)} style={{ flex: 1, background: "none", border: "none", textAlign: "left", cursor: "pointer", color: C.text, padding: 0, fontFamily: "inherit" }}>{header}</button><div style={{ display: "flex", gap: 6 }}><IconBtn onClick={onEdit} kind="edit" /><IconBtn onClick={onDel} kind="del" /></div></div>{isOpen && body && <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 13, color: C.sub, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{body}</div>}{!isOpen && body && <div style={{ marginTop: 4, fontSize: 11, color: C.faint }}>タップで全文表示</div>}</div>);
  };

  return (
    <div>
      <Section kicker="書いたものを貯める" title="保管庫" />
      <div style={{ display: "flex", gap: 4, marginBottom: 18, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 4 }}>
        <button onClick={() => setTab("es")} style={tabBtn(tab === "es", C.yellow)}>📝 ES設問</button>
        <button onClick={() => setTab("mat")} style={tabBtn(tab === "mat", C.green)}>💎 ES素材</button>
        <button onClick={() => setTab("qa")} style={tabBtn(tab === "qa", C.red)}>🎤 想定問答</button>
      </div>

      {tab === "es" && (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}><button onClick={() => setEsView("company")} style={tabBtn(esView === "company", "#0ea5e9")}>🏢 企業別</button><button onClick={() => setEsView("category")} style={tabBtn(esView === "category", C.yellow)}>📂 種別</button></div>
          {esView === "category" && (<div style={{ marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showCatEdit ? 8 : 0 }}><span style={{ fontSize: 11, color: C.faint }}>設問種別を管理</span><button onClick={() => setShowCatEdit(!showCatEdit)} style={{ background: "none", border: "none", color: C.teal, fontSize: 11, cursor: "pointer" }}>{showCatEdit ? "閉じる" : "編集"}</button></div>{showCatEdit && (<div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 12 }}><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>{esCats.map((c, i) => (<div key={c} style={{ display: "flex", alignItems: "center", gap: 4, background: `${C.yellow}18`, border: `1px solid ${C.yellow}44`, borderRadius: 99, padding: "4px 10px" }}><span style={{ fontSize: 12, color: C.yellow }}>{c}</span>{esCats.length > 1 && <button onClick={() => saveEsCats(esCats.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 11, padding: 0 }}>✕</button>}</div>))}</div><div style={{ display: "flex", gap: 8 }}><input style={{ ...inputStyle, flex: 1, padding: "8px 12px", fontSize: 13 }} value={newCatInput} onChange={(e) => setNewCatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newCatInput.trim()) { saveEsCats([...esCats, newCatInput.trim()]); setNewCatInput(""); }}} placeholder="新しい種別を追加" /><Btn onClick={() => { if (newCatInput.trim()) { saveEsCats([...esCats, newCatInput.trim()]); setNewCatInput(""); }}} style={{ padding: "8px 14px", flexShrink: 0 }}>追加</Btn></div></div>)}</div>)}
          <div style={{ marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showPhaseEdit ? 8 : 0 }}><span style={{ fontSize: 11, color: C.faint }}>選考フェーズを管理</span><button onClick={() => setShowPhaseEdit(!showPhaseEdit)} style={{ background: "none", border: "none", color: C.teal, fontSize: 11, cursor: "pointer" }}>{showPhaseEdit ? "閉じる" : "編集"}</button></div>{showPhaseEdit && (<div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 12 }}><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>{esPhases.map((p, i) => (<div key={p} style={{ display: "flex", alignItems: "center", gap: 4, background: `${phaseColor(p)}18`, border: `1px solid ${phaseColor(p)}44`, borderRadius: 99, padding: "4px 10px" }}><span style={{ fontSize: 12, color: phaseColor(p) }}>{p}</span>{esPhases.length > 1 && <button onClick={() => saveEsPhases(esPhases.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 11, padding: 0 }}>✕</button>}</div>))}</div><div style={{ display: "flex", gap: 8 }}><input style={{ ...inputStyle, flex: 1, padding: "8px 12px", fontSize: 13 }} value={newPhaseInput} onChange={(e) => setNewPhaseInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newPhaseInput.trim()) { saveEsPhases([...esPhases, newPhaseInput.trim()]); setNewPhaseInput(""); }}} placeholder="例：リクルーター面談" /><Btn onClick={() => { if (newPhaseInput.trim()) { saveEsPhases([...esPhases, newPhaseInput.trim()]); setNewPhaseInput(""); }}} style={{ padding: "8px 14px", flexShrink: 0 }}>追加</Btn></div></div>)}</div>
          {esAnswers.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.faint }}>企業ごとの設問と回答を記録しよう<br /><span style={{ fontSize: 12 }}>「この企業はこういう設問で、こう書いた」</span></div>}
          {esView === "company" ? renderEsByCompany() : renderEsByCategory()}
        </div>
      )}

      {tab === "qa" && (<QATab qaLibrary={qaLibrary} deleteQA={deleteQA} openEdit={(q) => open("qa", q)} />)}

      {tab === "mat" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {esMaterials.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.faint }}>エピソードの「素材」を貯めよう<br /><span style={{ fontSize: 12 }}>例：サークル幹事経験 → 参加率2倍</span></div>}
          {esMaterials.length > 0 && (() => {
            const [matView, setMatView] = matViewState;
            const indGroups = {}; esMaterials.forEach((m) => { const k = m.industries || "未分類"; if (!indGroups[k]) indGroups[k] = []; indGroups[k].push(m); });
            const kindGroups = {}; esMaterials.forEach((m) => { const k = m.mat_kind || "種別未設定"; if (!kindGroups[k]) kindGroups[k] = []; kindGroups[k].push(m); });
            const matCard = (m) => expandCard(m.id, <div><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{m.theme}</div><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{m.metric && <Badge color={C.green} style={{ fontSize: 10 }}>{m.metric}</Badge>}{m.mat_kind && <Badge color={C.purple} style={{ fontSize: 10 }}>{m.mat_kind}</Badge>}</div></div>, m.episode, () => open("mat", m), () => deleteMat(m.id));
            const renderFolderGroup = (groups, color) => Object.entries(groups).map(([cat, items]) => { const isOpen = !!matFolders[`mat_${cat}`]; return (<div key={cat}><button onClick={() => setMatFolders((p) => ({ ...p, [`mat_${cat}`]: !p[`mat_${cat}`] }))} style={{ ...fldrBtn(isOpen) }}><span style={{ fontSize: 11, color: isOpen ? color : C.faint, display: "inline-block", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>▶</span><span style={{ fontSize: 13, fontWeight: 600 }}>{cat}</span><span style={{ fontSize: 10, background: "#0ea5e922", color: "#0ea5e9", fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{items.length}</span></button>{isOpen && <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 4 }}>{items.map(matCard)}</div>}</div>); });
            return (<div><div style={{ display: "flex", gap: 4, marginBottom: 12, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4 }}><button onClick={() => setMatView("ind")} style={tabBtn(matView === "ind", C.green)}>🏭 業界別</button><button onClick={() => setMatView("kind")} style={tabBtn(matView === "kind", C.purple)}>📂 種別</button></div>{matView === "ind" ? renderFolderGroup(indGroups, C.green) : renderFolderGroup(kindGroups, C.purple)}</div>);
          })()}
        </div>
      )}

      <FloatingAdd onClick={() => open(tab, null)} />

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "編集" : tab === "es" ? "ES設問を追加" : tab === "qa" ? "想定問答を追加" : "ES素材を追加"}>
        {tab === "es" && (<>
          <Field label="企業（任意）">{(companies || []).length > 0 && (<div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{(companies || []).map((c) => <button key={c.id} onClick={() => setForm((f) => ({ ...f, company: c.name, company_id: c.id }))} style={chipBtn((form.company_id === c.id || form.company === c.name), "#0ea5e9")}>{c.name}</button>)}</div>)}<input style={inputStyle} value={form.company || ""} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value, company_id: "" }))} placeholder="または手動入力 / 鉄板設問なら空欄でOK" /></Field>
          <Field label="選考フェーズ（任意）"><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{esPhases.map((p) => <button key={p} onClick={() => setForm((f) => ({ ...f, selection_phase: f.selection_phase === p ? "" : p }))} style={chipBtn(form.selection_phase === p, phaseColor(p))}>{p}</button>)}</div><input style={inputStyle} value={form.selection_phase || ""} onChange={(e) => setForm((f) => ({ ...f, selection_phase: e.target.value }))} placeholder="または手動入力" /></Field>
          <Field label="設問種別（任意）"><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{esCats.map((c) => <button key={c} onClick={() => setForm((f) => ({ ...f, es_category: f.es_category === c ? "" : c }))} style={chipBtn(form.es_category === c, C.yellow)}>{c}</button>)}</div><input style={inputStyle} value={form.es_category || ""} onChange={(e) => setForm((f) => ({ ...f, es_category: e.target.value }))} placeholder="または手動入力" /></Field>
          <Field label="設問"><textarea style={{ ...inputStyle, height: 70, resize: "vertical" }} value={form.question || ""} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} placeholder="例：学生時代に力を入れたこと" /></Field>
          <Field label="見出し・キャッチコピー（任意）"><input style={inputStyle} value={form.subtitle || ""} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} placeholder="例：選んだ記事のタイトル、自分のキャッチコピーなど" /></Field>
        <Field label="文字数制限（任意）"><input style={inputStyle} type="number" value={form.char_limit || ""} onChange={(e) => setForm((f) => ({ ...f, char_limit: e.target.value }))} placeholder="例：400" /></Field>
          <Field label="回答"><textarea style={{ ...inputStyle, height: 160, resize: "vertical" }} value={form.answer || ""} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} placeholder="書いた回答を貼り付け" /><div style={{ fontSize: 12, color: (form.answer || "").length > 0 ? C.teal : C.faint, textAlign: "right", marginTop: 4 }}>{(form.answer || "").length}字{form.char_limit && ` / ${form.char_limit}字`}</div></Field>
        </>)}
        {tab === "qa" && (<>
          <Field label="想定質問"><textarea style={{ ...inputStyle, height: 70, resize: "vertical" }} value={form.question || ""} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} placeholder="例：なぜこの業界を選んだか？" /></Field>
          <Field label="タグ（種別）"><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{QA_TAGS.map((t) => <button key={t} onClick={() => setForm((f) => ({ ...f, tag: f.tag === t ? "" : t }))} style={chipBtn(form.tag === t, C.purple)}>{t}</button>)}</div><input style={inputStyle} value={form.tag || ""} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))} placeholder="または手動入力" /></Field>
          <Field label="業界（任意）"><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{INDUSTRIES.map((ind) => (<button key={ind} onClick={() => setForm((f) => ({ ...f, industry: f.industry === ind ? "" : ind }))} style={chipBtn(form.industry === ind, "#0ea5e9")}>{ind}</button>))}</div><input style={inputStyle} value={form.industry || ""} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} placeholder="上にない場合は手動入力" /></Field>
          <Field label="自分の回答"><textarea style={{ ...inputStyle, height: 160, resize: "vertical" }} value={form.answer || ""} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} placeholder="話す内容のメモ" /><div style={{ fontSize: 12, color: C.faint, textAlign: "right", marginTop: 4 }}>{(form.answer || "").length}字</div></Field>
        </>)}
        {tab === "mat" && (<>
          <Field label="テーマ"><input style={inputStyle} value={form.theme || ""} onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))} placeholder="例：サークルの幹事経験" /></Field>
          <Field label="種別（任意）"><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{["ガクチカ", "自己PR", "困難・挫折", "リーダーシップ", "チームワーク", "志望動機補強", "その他"].map((k) => (<button key={k} onClick={() => setForm((f) => ({ ...f, mat_kind: f.mat_kind === k ? "" : k }))} style={chipBtn(form.mat_kind === k, C.purple)}>{k}</button>))}</div><input style={inputStyle} value={form.mat_kind || ""} onChange={(e) => setForm((f) => ({ ...f, mat_kind: e.target.value }))} placeholder="または手動入力" /></Field>
          <Field label="数字・成果（任意）"><input style={inputStyle} value={form.metric || ""} onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))} placeholder="例：参加率2倍 / 新入生3→12人" /></Field>
          <Field label="使える業界（任意）"><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{INDUSTRIES.map((ind) => (<button key={ind} onClick={() => setForm((f) => ({ ...f, industries: f.industries === ind ? "" : ind }))} style={chipBtn(form.industries === ind, C.green)}>{ind}</button>))}</div><input style={inputStyle} value={form.industries || ""} onChange={(e) => setForm((f) => ({ ...f, industries: e.target.value }))} placeholder="上にない場合は手動入力" /></Field>
          <Field label="エピソード本文"><textarea style={{ ...inputStyle, height: 160, resize: "vertical" }} value={form.episode || ""} onChange={(e) => setForm((f) => ({ ...f, episode: e.target.value }))} placeholder="状況・課題・行動・結果など" /><div style={{ fontSize: 12, color: C.faint, textAlign: "right", marginTop: 4 }}>{(form.episode || "").length}字</div></Field>
        </>)}
        <div style={{ display: "flex", gap: 10 }}><Btn variant="ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>キャンセル</Btn><Btn onClick={save} style={{ flex: 2 }}>{editing ? "更新" : "追加"}</Btn></div>
      </Modal>
    </div>
  );
}
