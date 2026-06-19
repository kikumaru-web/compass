import { useState } from "react";
import { C } from "../constants.js";
import { signIn, signUp } from "../lib/supabase.js";
import { Btn, Field, inputStyle } from "./UI.jsx";

export default function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      let data;
      if (mode === "signup") {
        data = await signUp(email, password);
        if (data.user && !data.session) {
          setError("確認メールを送りました。メールを確認してからログインしてください。");
          setLoading(false); return;
        }
      } else {
        data = await signIn(email, password);
      }
      if (data.access_token) onLogin(data);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🧭</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0 }}>Compass</h1>
          <p style={{ color: C.sub, fontSize: 14, marginTop: 8 }}>就活OS</p>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 20, padding: 28 }}>
          <Field label="メールアドレス">
            <input style={inputStyle} type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" />
          </Field>
          <Field label="パスワード">
            <input style={inputStyle} type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="8文字以上" />
          </Field>
          {error && <div style={{ fontSize: 13, color: C.red, marginBottom: 14, lineHeight: 1.5 }}>{error}</div>}
          <Btn onClick={submit} style={{ width: "100%", opacity: loading ? 0.6 : 1 }}>
            {loading ? "処理中…" : mode === "login" ? "ログイン" : "アカウント作成"}
          </Btn>
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            style={{ width: "100%", background: "none", border: "none", color: C.sub, fontSize: 13, marginTop: 16, cursor: "pointer", fontFamily: "inherit" }}>
            {mode === "login" ? "アカウントを作成する" : "ログインに戻る"}
          </button>
        </div>
      </div>
    </div>
  );
}
