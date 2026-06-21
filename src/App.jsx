import { useState, useEffect, useRef } from "react";
import { C, NAV, todayStr, SUPABASE_URL, SUPABASE_ANON_KEY } from "./constants.js";
import { signOut, getUser } from "./lib/supabase.js";
import AuthScreen from "./components/AuthScreen.jsx";
import useAppData from "./hooks/useAppData.js";
import CompaniesView from "./components/CompaniesView.jsx";
import DeadlinesView from "./components/DeadlinesView.jsx";
import VaultView from "./components/VaultView.jsx";
import DashboardView from "./components/DashboardView.jsx";
import TasksView from "./components/TasksView.jsx";
import ActionLogView from "./components/ActionLogView.jsx";
import RewardsView from "./components/RewardsView.jsx";
import IdeasView from "./components/IdeasView.jsx";
import OBView from "./components/OBView.jsx";
import LinksView from "./components/LinksView.jsx";
import StudyView from "./components/StudyView.jsx";
import InterviewLabView from "./components/InterviewLabView.jsx";
import { DeadlineReminderModal, DailyChallengeModal } from "./components/Modals.jsx";

const SESSION_KEY = "compass_session";

/* ── トークンリフレッシュ ── */
async function refreshSession(session) {
  if (!session?.refresh_token) return null;
  try {
    const res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  });
  const [view, setView] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 820);
  const [navHidden, setNavHidden] = useState(false);
  const [showDailyChallenge, setShowDailyChallenge] = useState(false);
  const [showDeadlineReminder, setShowDeadlineReminder] = useState(false);
  const navRef = useRef(null);

  const userId = session?.user?.id;
  const data = useAppData(userId);

  /* ── セッション復元 ── */
  useEffect(() => {
    if (!session) { setLoading(false); return; }
    (async () => {
      let user = await getUser(session.access_token);
      if (!user) {
        const renewed = await refreshSession(session);
        if (renewed) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(renewed));
          window._compassToken = renewed.access_token;
          setSession(renewed);
          setLoading(false);
          return;
        }
        localStorage.removeItem(SESSION_KEY);
        setSession(null);
      } else {
        window._compassToken = session.access_token;
      }
      setLoading(false);
    })();
  }, []);

  /* ── データ読み込み＋定期リフレッシュ ── */
  useEffect(() => {
    if (!session || loading) return;
    data.loadAll().then(() => checkDailyChallenge());
    const timer = setInterval(async () => {
      const cur = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      const renewed = await refreshSession(cur);
      if (renewed) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(renewed));
        window._compassToken = renewed.access_token;
        setSession(renewed);
      }
    }, 50 * 60 * 1000);
    return () => clearInterval(timer);
  }, [session, loading]);

  /* ── リサイズ ── */
  useEffect(() => {
    const fn = () => setIsDesktop(window.innerWidth >= 820);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  /* ── ナビ高さCSS変数 ── */
  useEffect(() => {
    if (navHidden || isDesktop) {
      document.documentElement.style.setProperty("--nav-h", "0px");
    } else {
      document.documentElement.style.setProperty("--nav-h", "101px");
    }
  }, [navHidden, isDesktop]);

  /* ── 認証 ── */
  const onLogin = (s) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    window._compassToken = s.access_token;
    setSession(s);
    setLoading(false);
  };
  const onLogout = async () => {
    if (session?.access_token) await signOut(session.access_token);
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  /* ── Daily Challenge ── */
  const getDailyKey = () => {
    const now = new Date(), reset = new Date(now);
    reset.setHours(4, 0, 0, 0);
    if (now < reset) reset.setDate(reset.getDate() - 1);
    return "compass_daily_" + reset.toISOString().slice(0, 10);
  };
  const getDailyDone = () => localStorage.getItem(getDailyKey()) === "done";
  const checkDailyChallenge = () => {
    const key = getDailyKey(), done = localStorage.getItem(key), skipped = localStorage.getItem(key + "_skip");
    const dlKey = key.replace("compass_daily_", "compass_dlremind_");
    if (!localStorage.getItem(dlKey)) setShowDeadlineReminder(true);
    else if (!done && !skipped) setShowDailyChallenge(true);
  };
  const dismissDeadlineReminder = () => {
    localStorage.setItem(getDailyKey().replace("compass_daily_", "compass_dlremind_"), "seen");
    setShowDeadlineReminder(false);
    const key = getDailyKey();
    if (!localStorage.getItem(key) && !localStorage.getItem(key + "_skip")) setShowDailyChallenge(true);
  };
  const skipDailyChallenge = (p) => {
    const key = getDailyKey();
    localStorage.setItem(key + "_skip", "1");
    if (p) try { localStorage.setItem(key + "_saved_problem", JSON.stringify(p)); } catch {}
    setShowDailyChallenge(false);
  };
  const completeDailyChallenge = (pts) => {
    const key = getDailyKey();
    localStorage.setItem(key, "done");
    localStorage.removeItem(key + "_skip");
    localStorage.removeItem(key + "_saved_problem");
    if (window._compassUpsertSettings) window._compassUpsertSettings({ daily_done: key });
    setShowDailyChallenge(false);
    if (pts > 0) data.addLog({ date: todayStr(), content: "Daily Challenge クリア", minutes: 5, points: pts });
  };

  const totalXP = data.logs.reduce((s, l) => s + (l.points || 0), 0);

  /* ── ローディング / 未ログイン ── */
  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.teal, fontSize: 16 }}>読み込み中…</div>
    </div>
  );
  if (!session) return <AuthScreen onLogin={onLogin} />;

  /* ── 画面ルーティング ── */
  const renderView = () => {
    switch (view) {
      case "dashboard": return <DashboardView tasks={data.tasks||[]} companies={data.companies||[]} logs={data.logs||[]} deadlines={data.deadlines||[]} rewards={data.rewards||[]} spendable={data.spendable} weekGoal={data.currentGoal} saveWeekGoal={data.saveWeekGoal} setView={setView} addLog={data.addLog} onShowDailyChallenge={() => setShowDailyChallenge(true)} dailyDone={getDailyDone()} />;
      case "companies": return <CompaniesView companies={data.companies||[]} addCompany={data.companyCrud.add} updateCompany={data.companyCrud.update} deleteCompany={data.companyCrud.del} />;
      case "deadlines": return <DeadlinesView deadlines={data.deadlines||[]} companies={data.companies||[]} addDeadline={data.deadlineCrud.add} updateDeadline={data.deadlineCrud.update} deleteDeadline={data.deadlineCrud.del} />;
      case "vault": return <VaultView esAnswers={data.esAnswers||[]} addES={data.esCrud.add} updateES={data.esCrud.update} deleteES={data.esCrud.del} qaLibrary={data.qaLibrary||[]} addQA={data.qaCrud.add} updateQA={data.qaCrud.update} deleteQA={data.qaCrud.del} esMaterials={data.esMaterials||[]} addMat={data.matCrud.add} updateMat={data.matCrud.update} deleteMat={data.matCrud.del} companies={data.companies||[]} />;
      case "tasks": return <TasksView tasks={data.tasks||[]} addTask={data.taskCrud.add} updateTask={data.taskCrud.update} deleteTask={data.taskCrud.del} logAction={data.addLog} logs={data.logs||[]} deleteLog={data.deleteLog} />;
      case "log": return <ActionLogView logs={data.logs||[]} addLog={data.addLog} deleteLog={data.deleteLog} />;
      case "rewards": return <RewardsView spendable={data.spendable} totalXP={totalXP} rewards={data.rewards||[]} redemptions={data.redemptions||[]} redeem={data.redeem} addReward={data.rewardCrud.add} updateReward={data.rewardCrud.update} deleteReward={data.rewardCrud.del} />;
      case "ideas": return <IdeasView ideas={data.ideas||[]} addIdea={data.ideaCrud.add} deleteIdea={data.ideaCrud.del} updateIdea={data.ideaCrud.update} />;
      case "ob": return <OBView obVisits={data.obVisits||[]} addOB={data.obCrud.add} updateOB={data.obCrud.update} deleteOB={data.obCrud.del} companies={data.companies||[]} />;
      case "links": return <LinksView userId={userId} />;
      case "study": return <StudyView studyProblems={data.studyProblems||[]} setStudyProblems={data.setStudyProblems} studyLogs={data.studyLogs||[]} setStudyLogs={data.setStudyLogs} addLog={data.addLog} userId={userId} />;
      case "interview": return <InterviewLabView addLog={data.addLog} userId={userId} />;
      default: return null;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter','Helvetica Neue',sans-serif", display: "flex" }}>

      {/* デスクトップサイドバー */}
      {isDesktop && (
        <div style={{ width: 200, background: C.card, borderRight: `1px solid ${C.cardBorder}`, display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100 }}>
          <div style={{ padding: "20px 16px", borderBottom: `1px solid ${C.cardBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#4ECDC4,#2d9e97)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧭</div>
              <div><div style={{ fontWeight: 800, fontSize: 14 }}>Compass</div><div style={{ fontSize: 10, color: C.sub }}>就活OS・同期済</div></div>>
            </div>
            <button onClick={onLogout} style={{ background: "none", border: "none", color: C.faint, fontSize: 11, cursor: "pointer", fontFamily: "inherit", marginTop: 6 }}>ログアウト</button>
          </div>
          <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {NAV.map((n) => (
              <button key={n.id} onClick={() => setView(n.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: view === n.id ? C.teal + "22" : "none", border: "none", borderLeft: `3px solid ${view === n.id ? C.teal : "transparent"}`, color: view === n.id ? C.teal : C.sub, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
                <span>{n.icon}</span><span>{n.label}</span>
              </button>
            ))}
          </nav>
          <div style={{ padding: "0 16px 48px" }}>
            <div onClick={() => setView("rewards")} style={{ background: C.bg, borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${C.cardBorder}`, cursor: "pointer" }}>
              <div style={{ fontSize: 10, color: C.faint, marginBottom: 4 }}>使えるpt</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.yellow }}>{data.spendable}pt</div>
              <div style={{ fontSize: 10, color: C.teal, marginTop: 4 }}>ご褒美を見る →</div>
            </div>
            
          </div>
        </div>
      )}

      {/* モバイルヘッダー */}
      {!isDesktop && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: C.bg, borderBottom: `1px solid ${C.cardBorder}`, padding: "10px 16px", paddingTop: "calc(env(safe-area-inset-top,0px) + 10px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🧭</span>
            <div><div style={{ fontWeight: 800, fontSize: 14 }}>Compass</div><div style={{ fontSize: 10, color: C.sub }}>同期済</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: C.yellow + "33", border: `1px solid ${C.yellow}44`, borderRadius: 99, padding: "4px 12px", fontSize: 13, fontWeight: 800, color: C.yellow }}>{data.spendable}pt</div>
            <button onClick={onLogout} style={{ background: "none", border: "none", color: C.faint, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>ログアウト</button>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <div style={{ flex: 1, marginLeft: isDesktop ? 200 : 0, paddingTop: isDesktop ? 0 : "calc(env(safe-area-inset-top,0px) + 64px)", width: isDesktop ? "calc(100% - 200px)" : "100%", overflow: "hidden" }}>
        <div style={{ padding: isDesktop ? "32px 40px" : "16px 14px 150px", maxWidth: 680, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
          {renderView()}
        </div>
      </div>

      {/* モバイルボトムナビ */}
      {!isDesktop && (<>
        <button onClick={() => setNavHidden(!navHidden)} style={{ position: "fixed", bottom: navHidden ? 8 : "calc(var(--nav-h, 101px) + env(safe-area-inset-bottom, 0px) + 6px)", right: 10, zIndex: 200, background: "rgba(26,25,41,0.95)", border: `1px solid ${C.cardBorder}`, borderRadius: 10, width: 32, height: 32, cursor: "pointer", color: C.sub, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {navHidden ? "▲" : "▼"}
        </button>
        {!navHidden && (
          <nav ref={navRef} style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(26,25,41,0.97)", borderTop: `1px solid ${C.cardBorder}`, display: "grid", gridTemplateColumns: "repeat(6,1fr)", zIndex: 150, paddingBottom: "env(safe-area-inset-bottom)" }}>
            {NAV.map((n) => (
              <button key={n.id} onClick={() => setView(n.id)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: view === n.id ? C.teal : "rgba(255,255,255,0.6)", fontFamily: "inherit", padding: "5px 2px", cursor: "pointer" }}>
                <span style={{ fontSize: 15 }}>{n.icon}</span>
                <span style={{ fontSize: 9, fontWeight: view === n.id ? 700 : 400, whiteSpace: "nowrap" }}>{n.label}</span>
              </button>
            ))}
          </nav>
        )}
      </>)}

      {/* 締切リマインダー */}
      {showDeadlineReminder && (
        <DeadlineReminderModal deadlines={data.deadlines||[]} onClose={dismissDeadlineReminder} />
      )}

      {/* Daily Challenge */}
      {showDailyChallenge && (
        <DailyChallengeModal
          studyProblems={data.studyProblems||[]}
          setStudyProblems={data.setStudyProblems}
          studyLogs={data.studyLogs||[]}
          setStudyLogs={data.setStudyLogs}
          userId={userId}
          onComplete={completeDailyChallenge}
          onSkip={skipDailyChallenge}
        />
      )}
    </div>
  );
}
