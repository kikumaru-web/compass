import { useState, useCallback } from "react";
import { sbRest } from "../lib/supabase.js";
import { todayStr } from "../constants.js";

export default function useAppData(userId) {
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [obVisits, setObVisits] = useState([]);
  const [esAnswers, setEsAnswers] = useState([]);
  const [qaLibrary, setQaLibrary] = useState([]);
  const [esMaterials, setEsMaterials] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [userLinks, setUserLinks] = useState([]);
  const [studyProblems, setStudyProblems] = useState([]);
  const [studyLogs, setStudyLogs] = useState([]);
  const [spendable, setSpendable] = useState(0);
  const [currentGoal, setCurrentGoal] = useState(null);

  const loadAll = useCallback(async () => {
    if (!userId) { console.warn("[Compass] loadAll skipped: no userId"); return; }
    console.log("[Compass] loadAll start, userId=", userId);
    const safe = (p) => p.catch((e) => { console.warn("[Compass] table skip:", e.message); return null; });
    try {
      const [t,l,c,d,r,red,ob,es,qa,mat,id,lnk,sp,sl,settings] = await Promise.all([
        safe(sbRest("GET", "tasks?order=created_at.desc")),
        safe(sbRest("GET", "action_logs?order=created_at.desc")),
        safe(sbRest("GET", "companies?order=sort_order.asc,created_at.desc")),
        safe(sbRest("GET", "deadlines?order=due_date.asc")),
        safe(sbRest("GET", "rewards?order=cost.asc")),
        safe(sbRest("GET", "reward_redemptions?order=redeemed_at.desc")),
        safe(sbRest("GET", "ob_visits?order=visit_at.desc")),
        safe(sbRest("GET", "es_answers?order=created_at.desc")),
        safe(sbRest("GET", "qa_library?order=created_at.desc")),
        safe(sbRest("GET", "es_materials?order=created_at.desc")),
        safe(sbRest("GET", "ideas?order=created_at.desc")),
        safe(sbRest("GET", "user_links?order=sort_order.asc")),
        safe(sbRest("GET", "study_problems?order=created_at.desc")),
        safe(sbRest("GET", "study_logs?order=created_at.desc")),
        safe(sbRest("GET", `user_settings?user_id=eq.${userId}`)),
      ]);
      if(t!==null) setTasks(t); if(l!==null) setLogs(l); if(c!==null) setCompanies(c);
      console.log("[Compass] loaded:", { companies: (c||[]).length, tasks: (t||[]).length, logs: (l||[]).length });
      if(d!==null) setDeadlines(d); if(r!==null) setRewards(r); if(red!==null) setRedemptions(red);
      if(ob!==null) setObVisits(ob); if(es!==null) setEsAnswers(es); if(qa!==null) setQaLibrary(qa);
      if(mat!==null) setEsMaterials(mat); if(id!==null) setIdeas(id); if(lnk!==null) setUserLinks(lnk);
      if(sp!==null) setStudyProblems(sp); if(sl!==null) setStudyLogs(sl);

      const totalPts = (l||[]).reduce((s,x) => s+(x.points||0), 0);
      const usedPts = (red||[]).reduce((s,x) => s+(x.cost||0), 0);
      setSpendable(totalPts - usedPts);

      const setting = (settings||[])[0];
      if (setting) {
        if (setting.week_goal) setCurrentGoal(setting.week_goal);
        if (setting.daily_done) {
          try { localStorage.setItem(setting.daily_done, "done"); } catch {}
        }
      }

      window._compassUpsertSettings = async (patch) => {
        try {
          const existing = await sbRest("GET", `user_settings?user_id=eq.${userId}`);
          if (existing && existing.length > 0) {
            await sbRest("PATCH", `user_settings?user_id=eq.${userId}`, patch);
          } else {
            await sbRest("POST", "user_settings", { user_id: userId, ...patch });
          }
        } catch(e) { console.error("settings error:", e); }
      };
    } catch(e) { console.error("[Compass] loadAll error:", e); }
  }, [userId]);

  function makeCrud(table, setter, getter) {
    return {
      add: async (data) => {
        try {
          const [row] = await sbRest("POST", table, { user_id: userId, ...data });
          setter((p) => [row, ...p]);
        } catch { setter((p) => [{ id: Date.now(), ...data }, ...p]); }
      },
      update: async (id, data) => {
        const old = getter().find((x) => x.id === id);
        setter((p) => p.map((x) => x.id === id ? { ...x, ...data } : x));
        try { await sbRest("PATCH", `${table}?id=eq.${id}`, data); } catch {}
        if (table === "companies" && old && data.name && old.name !== data.name) {
          const oldName = old.name;
          const newName = data.name;
          try {
            await sbRest("PATCH", `es_answers?company=eq.${encodeURIComponent(oldName)}`, { company: newName });
            await sbRest("PATCH", `deadlines?company_name=eq.${encodeURIComponent(oldName)}`, { company_name: newName });
            await sbRest("PATCH", `ob_visits?company=eq.${encodeURIComponent(oldName)}`, { company: newName });
            setEsAnswers((p) => p.map((x) => x.company === oldName ? { ...x, company: newName } : x));
            setDeadlines((p) => p.map((x) => x.company_name === oldName ? { ...x, company_name: newName } : x));
            setObVisits((p) => p.map((x) => x.company === oldName ? { ...x, company: newName } : x));
          } catch (e) { console.warn("[Compass] rename sync error:", e); }
        }
      },
      del: async (id) => {
        if (!window.confirm("本当に削除しますか？この操作は取り消せません。")) return;
        setter((p) => p.filter((x) => x.id !== id));
        try { await sbRest("DELETE", `${table}?id=eq.${id}`); } catch {}
      },
    };
  }

  const addLog = async (entry) => {
    try {
      const [row] = await sbRest("POST", "action_logs", { user_id: userId, ...entry });
      setLogs((p) => [row||entry, ...p]);
      setSpendable((s) => s+(entry.points||0));
    } catch {
      setLogs((p) => [{ id: Date.now(), ...entry }, ...p]);
      setSpendable((s) => s+(entry.points||0));
    }
  };

  const deleteLog = async (id) => {
    const log = logs.find((l) => l.id === id);
    setLogs((p) => p.filter((l) => l.id !== id));
    if (log) setSpendable((s) => s-(log.points||0));
    try { await sbRest("DELETE", `action_logs?id=eq.${id}`); } catch {}
  };

  const saveWeekGoal = async (goal) => {
    setCurrentGoal(goal);
    if (window._compassUpsertSettings) await window._compassUpsertSettings({ week_goal: goal });
  };

  const redeem = async (reward) => {
    try {
      const [row] = await sbRest("POST", "reward_redemptions", {
        user_id: userId, reward_id: reward.id,
        reward_title: reward.title, reward_emoji: reward.emoji, cost: reward.cost,
      });
      setRedemptions((p) => [row, ...p]);
      setSpendable((s) => s-reward.cost);
    } catch {}
  };

  return {
    tasks, setTasks, logs, setLogs, companies, setCompanies,
    deadlines, setDeadlines, rewards, setRewards, redemptions, setRedemptions,
    obVisits, setObVisits, esAnswers, setEsAnswers, qaLibrary, setQaLibrary,
    esMaterials, setEsMaterials, ideas, setIdeas, userLinks, setUserLinks,
    studyProblems, setStudyProblems, studyLogs, setStudyLogs,
    spendable, setSpendable, currentGoal,
    loadAll, addLog, deleteLog, saveWeekGoal, redeem,
    taskCrud: makeCrud("tasks", setTasks, () => tasks),
    companyCrud: makeCrud("companies", setCompanies, () => companies),
    deadlineCrud: makeCrud("deadlines", setDeadlines, () => deadlines),
    rewardCrud: makeCrud("rewards", setRewards, () => rewards),
    obCrud: makeCrud("ob_visits", setObVisits, () => obVisits),
    esCrud: makeCrud("es_answers", setEsAnswers, () => esAnswers),
    qaCrud: makeCrud("qa_library", setQaLibrary, () => qaLibrary),
    matCrud: makeCrud("es_materials", setEsMaterials, () => esMaterials),
    ideaCrud: makeCrud("ideas", setIdeas, () => ideas),
    linkCrud: makeCrud("user_links", setUserLinks),
  };
}
