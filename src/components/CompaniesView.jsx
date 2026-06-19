import { useState, useMemo } from "react";
import { C, INDUSTRIES, TIERS, STAGES, TIER_COLOR } from "../constants";
import {
  Badge,
  Card,
  Btn,
  Modal,
  Field,
  IconBtn,
  Section,
  FloatingAdd,
  chipBtn,
  inputStyle,
} from "./UI";

export default function CompaniesView({
  companies,
  addCompany,
  updateCompany,
  deleteCompany,
  saveCompanyOrder,
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sortMode, setSortMode] = useState(false);
  const [openFolders, setOpenFolders] = useState({});
  const [localOrder, setLocalOrder] = useState([]);

  const empty = {
    name: "",
    industry: "",
    customIndustry: "",
    tier: "B",
    stage: "気になる",
    memo: "",
    next_action: "",
    url: "",
    login_id: "",
  };
  const [form, setForm] = useState(empty);

  const [copied, setCopied] = useState(null);

  /* ── 並べ替え ── */
  const saveOrder = (ids) => {
    setLocalOrder(ids);
    if (saveCompanyOrder) saveCompanyOrder(ids);
  };

  const sortedCompanies = useMemo(() => {
    if (localOrder.length === 0) return companies;
    const ordered = [];
    localOrder.forEach((id) => {
      const c = companies.find((x) => x.id === id);
      if (c) ordered.push(c);
    });
    companies.forEach((c) => {
      if (!localOrder.includes(c.id)) ordered.push(c);
    });
    return ordered;
  }, [companies, localOrder]);

  const filtered = sortedCompanies.filter(
    (c) => filter === "all" || c.industry === filter
  );

  /* ── 業界フォルダグループ ── */
  const groups = {};
  filtered.forEach((c) => {
    const k = c.industry || "未分類";
    (groups[k] = groups[k] || []).push(c);
  });
  const tierRank = { S: 0, A: 1, B: 2, C: 3 };
  Object.values(groups).forEach((arr) =>
    arr.sort((a, b) => (tierRank[a.tier] ?? 9) - (tierRank[b.tier] ?? 9))
  );
  const groupKeys = Object.keys(groups).sort((a, b) => {
    if (a === "その他" || a === "未分類") return 1;
    if (b === "その他" || b === "未分類") return -1;
    return a.localeCompare(b, "ja");
  });

  /* ── CRUD ── */
  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setShowModal(true);
  };
  const openEdit = (c) => {
    setEditing(c.id);
    const known = INDUSTRIES.includes(c.industry);
    setForm({
      ...empty,
      ...c,
      industry: known ? c.industry : "その他",
      customIndustry: known ? "" : c.industry || "",
      url: c.url || "",
      login_id: c.login_id || "",
    });
    setShowModal(true);
  };
  const save = async () => {
    if (!form.name.trim()) return;
    const industry =
      form.industry === "その他" && form.customIndustry.trim()
        ? form.customIndustry.trim()
        : form.industry;
    const payload = {
      name: form.name,
      industry,
      tier: form.tier,
      stage: form.stage,
      memo: form.memo,
      next_action: form.next_action,
      url: form.url,
      login_id: form.login_id,
    };
    if (editing) {
      updateCompany(editing, payload);
    } else {
      await addCompany(payload);
    }
    setShowModal(false);
  };

  /* ── ユーティリティ ── */
  const copyToClipboard = (text, id) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(id);
        setTimeout(() => setCopied(null), 1500);
      })
      .catch(() => {
        const el = document.createElement("textarea");
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(id);
        setTimeout(() => setCopied(null), 1500);
      });
  };

  const toggleFolder = (k) =>
    setOpenFolders((p) => ({
      ...p,
      [k]: p[k] !== false ? false : true,
    }));

  const moveItem = (idx, dir) => {
    const copy = [...filtered];
    const target = idx + dir;
    if (target < 0 || target >= copy.length) return;
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    saveOrder(copy.map((c) => c.id));
  };

  /* ── レンダリング ── */
  return (
    <div>
      <Section
        kicker="選考を可視化する"
        title="企業管理"
        sub={`${companies.length}社登録中`}
        subColor={C.teal}
      />

      {/* フィルター & 並べ替えトグル */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 4,
            flex: 1,
          }}
        >
          <button
            onClick={() => setFilter("all")}
            style={chipBtn(filter === "all", C.teal)}
          >
            すべて
          </button>
          {INDUSTRIES.map((i) => (
            <button
              key={i}
              onClick={() => setFilter(i)}
              style={chipBtn(filter === i, "#0ea5e9")}
            >
              {i}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortMode(!sortMode)}
          style={{
            flexShrink: 0,
            marginLeft: 8,
            background: sortMode ? `${C.teal}22` : "none",
            border: `1px solid ${sortMode ? C.teal : C.cardBorder}`,
            color: sortMode ? C.teal : C.sub,
            borderRadius: 10,
            padding: "6px 10px",
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {sortMode ? "✓ 完了" : "⇅"}
        </button>
      </div>

      {/* 並べ替えモード */}
      {sortMode && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 12,
              color: C.teal,
              marginBottom: 8,
              background: `${C.teal}15`,
              padding: "8px 12px",
              borderRadius: 10,
            }}
          >
            ↑↓ボタンで並べ替えできます
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map((c, idx) => (
              <div
                key={c.id}
                style={{
                  background: C.card,
                  border: `1px solid ${C.cardBorder}`,
                  borderRadius: 12,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <button
                    onClick={() => moveItem(idx, -1)}
                    disabled={idx === 0}
                    style={{
                      background: "none",
                      border: `1px solid ${C.cardBorder}`,
                      borderRadius: 6,
                      padding: "2px 6px",
                      cursor: idx === 0 ? "default" : "pointer",
                      color: idx === 0 ? C.faint : C.text,
                      fontSize: 10,
                    }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveItem(idx, 1)}
                    disabled={idx === filtered.length - 1}
                    style={{
                      background: "none",
                      border: `1px solid ${C.cardBorder}`,
                      borderRadius: 6,
                      padding: "2px 6px",
                      cursor:
                        idx === filtered.length - 1 ? "default" : "pointer",
                      color:
                        idx === filtered.length - 1 ? C.faint : C.text,
                      fontSize: 10,
                    }}
                  >
                    ↓
                  </button>
                </div>
                <Badge color={TIER_COLOR(c.tier)} solid>
                  {c.tier}
                </Badge>
                <span
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: 700,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.name}
                </span>
                <span style={{ fontSize: 11, color: C.faint }}>
                  {c.industry}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 通常表示（業界フォルダ） */}
      {!sortMode && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groupKeys.length === 0 && (
            <div
              style={{ textAlign: "center", padding: "24px 0", color: C.faint }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>🏢</div>
              <div style={{ fontSize: 14, marginBottom: 12 }}>
                気になる企業を追加しよう
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  padding: 16,
                  textAlign: "left",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.45)",
                  lineHeight: 1.8,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  登録すると：
                </div>
                📌 S/A/B/Cで志望度を整理できる
                <br />
                📌 選考状況（ES済・一次…）を追跡できる
                <br />
                📌 採用ページURLを紐付けられる
                <br />
                <br />
                「気になる」から登録してOK
              </div>
            </div>
          )}

          {groupKeys.map((gk) => {
            const arr = groups[gk];
            const isOpen = !!openFolders[gk];
            return (
              <div
                key={gk}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${C.cardBorder}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => toggleFolder(gk)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: C.text,
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: C.sub,
                        transform: isOpen ? "rotate(90deg)" : "none",
                        transition: "transform 0.2s",
                      }}
                    >
                      ▶
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{gk}</span>
                    <Badge color="#0ea5e9">{arr.length}</Badge>
                  </span>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: "0 12px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {arr.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          background: C.card,
                          border: `1px solid ${C.cardBorder}`,
                          borderRadius: 10,
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 6,
                          }}
                        >
                          <Badge color={TIER_COLOR(c.tier)} solid>
                            {c.tier || "B"}
                          </Badge>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              flex: 1,
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {c.name}
                          </span>
                          <IconBtn onClick={() => openEdit(c)} kind="edit" />
                          <IconBtn
                            onClick={() => deleteCompany(c.id)}
                            kind="del"
                          />
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "nowrap",
                            gap: 5,
                            alignItems: "center",
                            overflow: "hidden",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 7px",
                              borderRadius: 99,
                              background: `${C.purple}22`,
                              color: C.purple,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            {c.stage}
                          </span>
                          {c.next_action && (
                            <span
                              style={{
                                fontSize: 10,
                                color: C.teal,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              → {c.next_action.slice(0, 10)}
                              {c.next_action.length > 10 ? "…" : ""}
                            </span>
                          )}
                          {c.url && (
                            <button
                              onClick={() => window.open(c.url, "_blank")}
                              style={{
                                fontSize: 10,
                                color: C.teal,
                                background: `${C.teal}15`,
                                padding: "2px 6px",
                                borderRadius: 99,
                                border: `1px solid ${C.teal}33`,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              🔗 採用ページ
                            </button>
                          )}
                          {c.login_id && (
                            <button
                              onClick={() => copyToClipboard(c.login_id, c.id)}
                              style={{
                                fontSize: 10,
                                color:
                                  copied === c.id ? C.green : C.purple,
                                background:
                                  copied === c.id
                                    ? `${C.green}15`
                                    : `${C.purple}15`,
                                padding: "2px 7px",
                                borderRadius: 99,
                                border: `1px solid ${
                                  copied === c.id
                                    ? C.green + "44"
                                    : C.purple + "33"
                                }`,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                transition: "all 0.2s",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              {copied === c.id
                                ? "✓ コピーした"
                                : `🔑 ${c.login_id}`}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <FloatingAdd onClick={openNew} />

      {/* 追加/編集モーダル */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "企業を編集" : "企業を追加"}
      >
        <Field label="企業名">
          <input
            style={inputStyle}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="例：電通"
          />
        </Field>

        <Field label="業界">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {INDUSTRIES.map((i) => (
              <button
                key={i}
                onClick={() => setForm((f) => ({ ...f, industry: i }))}
                style={chipBtn(form.industry === i, "#0ea5e9")}
              >
                {i}
              </button>
            ))}
          </div>
          {form.industry === "その他" && (
            <input
              style={{ ...inputStyle, marginTop: 8 }}
              value={form.customIndustry}
              onChange={(e) =>
                setForm((f) => ({ ...f, customIndustry: e.target.value }))
              }
              placeholder="業界名を自由に入力（例：玩具メーカー）"
            />
          )}
        </Field>

        <Field label="志望層">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TIERS.map((t) => (
              <button
                key={t.id}
                onClick={() => setForm((f) => ({ ...f, tier: t.id }))}
                style={chipBtn(form.tier === t.id, t.color)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="選考状況">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => setForm((f) => ({ ...f, stage: s }))}
                style={chipBtn(form.stage === s, C.purple)}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        <Field label="採用ページURL（任意）">
          <input
            style={inputStyle}
            type="url"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://recruit.example.com/"
          />
        </Field>

        <Field label="マイページ ログインID（任意）">
          <input
            style={inputStyle}
            value={form.login_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, login_id: e.target.value }))
            }
            placeholder="例：12345678"
          />
        </Field>

        <Field label="次のアクション（任意）">
          <input
            style={inputStyle}
            value={form.next_action}
            onChange={(e) =>
              setForm((f) => ({ ...f, next_action: e.target.value }))
            }
            placeholder="例：説明会に申込む"
          />
        </Field>

        <Field label="メモ">
          <textarea
            style={{ ...inputStyle, height: 80, resize: "vertical" }}
            value={form.memo}
            onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
            placeholder="志望動機のポイント、選考メモなど"
          />
        </Field>

        <div style={{ fontSize: 11, color: C.faint, marginBottom: 12 }}>
          ※ 締切は「締切」タブで企業ごとに複数登録できます
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Btn
            variant="ghost"
            onClick={() => setShowModal(false)}
            style={{ flex: 1 }}
          >
            キャンセル
          </Btn>
          <Btn onClick={save} style={{ flex: 2 }}>
            {editing ? "更新" : "追加"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
