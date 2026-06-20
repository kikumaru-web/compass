import React from "react";
import { C } from "../constants.js";

/* ===== Card ===== */
export function Card({ children, style = {}, glow, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.card, border: `1px solid ${C.cardBorder}`,
      borderRadius: 18, padding: 20,
      ...(glow ? { boxShadow: `0 0 30px ${glow}22` } : {}),
      ...(onClick ? { cursor: "pointer" } : {}),
      ...style,
    }}>{children}</div>
  );
}

/* ===== Badge ===== */
export function Badge({ children, color = C.sub, solid, style: s = {} }) {
  return (
    <span style={{
      fontSize: 11, padding: "3px 10px", borderRadius: 99,
      background: solid ? color : color + "22",
      color: solid ? "#0f0e17" : color,
      fontWeight: 700, whiteSpace: "nowrap", ...s,
    }}>{children}</span>
  );
}

/* ===== Btn ===== */
export function Btn({ children, onClick, variant = "primary", style: s = {} }) {
  const variants = {
    primary: { background: "linear-gradient(135deg,#4ECDC4,#2d9e97)", color: "#0f0e17", fontWeight: 800, border: "none" },
    ghost: { background: "rgba(255,255,255,0.06)", color: C.sub, border: `1px solid ${C.cardBorder}`, fontWeight: 600 },
    danger: { background: "rgba(255,107,107,0.15)", color: C.red, border: `1px solid ${C.red}44`, fontWeight: 600 },
  };
  return (
    <button onClick={onClick} style={{
      padding: "12px 20px", borderRadius: 12, cursor: "pointer",
      fontSize: 14, fontFamily: "inherit",
      ...(variants[variant] || variants.primary), ...s,
    }}>{children}</button>
  );
}

/* ===== IconBtn ===== */
export function IconBtn({ onClick, kind }) {
  const icon = kind === "edit" ? "✎" : "✕";
  const color = kind === "edit" ? C.sub : C.red;
  return (
    <button onClick={onClick} style={{
      background: "none", border: `1px solid ${C.cardBorder}`,
      color, borderRadius: 8, width: 28, height: 28,
      cursor: "pointer", fontSize: kind === "edit" ? 14 : 13,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, fontFamily: "inherit",
    }}>{icon}</button>
  );
}

/* ===== Section ===== */
export function Section({ kicker, title, sub, subColor }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.teal, textTransform: "uppercase", marginBottom: 4 }}>{kicker}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>{title}</h1>
        {sub && <span style={{ fontSize: 13, color: subColor || C.sub, fontWeight: subColor ? 700 : 400 }}>{sub}</span>}
      </div>
    </div>
  );
}

/* ===== Field ===== */
export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: C.sub, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

/* ===== Modal ===== */
export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.bg, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", padding: "24px 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.sub, fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ===== FloatingAdd =====
 * CSS変数 --nav-h（App.jsxが設定）を参照して
 * 左辺からの距離 = ナビ上端からの距離 になるよう配置
 * ボタン直径52px → 辺からの距離 = 18px とすると中心は 18+26=44px
 */
const FAB_MARGIN = 20;
export function FloatingAdd({ onClick }) {
  return (
    <button onClick={onClick} style={{
      position: "fixed",
      bottom: `calc(var(--nav-h, 101px) + env(safe-area-inset-bottom, 0px) + ${FAB_MARGIN}px)`,
      left: FAB_MARGIN,
      width: 52, height: 52,
      borderRadius: "50%", background: "linear-gradient(135deg,#4ECDC4,#2d9e97)",
      border: "none", color: "#0f0e17", fontSize: 26, cursor: "pointer",
      boxShadow: "0 4px 20px rgba(78,205,196,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>+</button>
  );
}

/* ===== inputStyle ===== */
export const inputStyle = {
  width: "100%", padding: "13px 15px", borderRadius: 12,
  border: `1px solid ${C.cardBorder}`, background: "rgba(255,255,255,0.05)",
  color: C.text, fontSize: 15, boxSizing: "border-box",
  fontFamily: "inherit", outline: "none",
};

/* ===== chipBtn ===== */
export function chipBtn(active, color) {
  return {
    flexShrink: 0, whiteSpace: "nowrap",
    padding: "6px 13px", borderRadius: 99, fontSize: 12, cursor: "pointer",
    fontFamily: "inherit", fontWeight: 600,
    border: `1px solid ${active ? color : "rgba(255,255,255,0.15)"}`,
    background: active ? color + "22" : "transparent",
    color: active ? color : C.sub,
  };
}

/* ===== tabBtn ===== */
export function tabBtn(active, color) {
  return {
    flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer",
    fontFamily: "inherit", fontSize: 12, fontWeight: active ? 700 : 400,
    background: active ? color + "33" : "transparent",
    color: active ? color : "rgba(255,255,255,0.5)",
  };
}

/* ===== fldrBtn ===== */
export function fldrBtn(isOpen) {
  return {
    width: "100%", background: isOpen ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
    border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: "9px 12px",
    cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
    color: C.text, fontFamily: "inherit", marginBottom: isOpen ? 6 : 0,
  };
}

/* ===== Expand（アニメーション付き開閉ラッパー） =====
 * 使い方: <Expand open={isOpen}><div>折りたたみ内容</div></Expand>
 * 各画面のフォルダ開閉をこれに置き換えると、ぬるっと動く。
 */
export function Expand({ open, children }) {
  const innerRef = React.useRef(null);
  const [style, setStyle] = React.useState({
    overflow: "hidden",
    height: open ? "auto" : "0px",
    opacity: open ? 1 : 0,
    transition: "height 0.25s ease, opacity 0.2s ease",
  });

  React.useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (open) {
      const h = el.scrollHeight;
      setStyle((s) => ({ ...s, height: h + "px", opacity: 1 }));
      const t = setTimeout(() => setStyle((s) => ({ ...s, height: "auto" })), 260);
      return () => clearTimeout(t);
    } else {
      const h = el.scrollHeight;
      setStyle((s) => ({ ...s, height: h + "px", opacity: 1 }));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setStyle((s) => ({ ...s, height: "0px", opacity: 0 }));
        });
      });
    }
  }, [open]);

  return React.createElement("div", { ref: innerRef, style }, children);
}
