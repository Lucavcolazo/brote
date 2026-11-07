import { useState, type FormEvent } from "react";
import { api } from "../api";
import { USERS, type AppUser } from "../config";
import { LANGS, useI18n, type Lang } from "../i18n";
import { errMsg } from "../ui";

const PENDING_KEY = "brote-pending-profile";

/** Lo que eligió en la pantalla de entrada; se aplica después del login (crear perfil / idioma). */
export function takePendingProfile(): { name: string; emoji: string; lang: Lang } | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthScreen() {
  const { t, lang, setLang } = useI18n();
  const [user, setUser] = useState<AppUser | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function pick(u: AppUser) {
    setUser(u);
    setError("");
    setPassword("");
    setLang(u.defaultLang);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const email = api.demo ? `${user.key}@demo` : user.email;
    if (!email) {
      setError(t("Falta configurar el email de {name} (VITE_{KEY}_EMAIL).", { name: user.name, KEY: user.key.toUpperCase() }));
      return;
    }
    setBusy(true);
    setError("");
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ name: user.name, emoji: user.emoji, lang }));
      await api.signIn(email, password);
    } catch (err) {
      setError(errMsg(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="brand">
        <div className="brand-mark" aria-hidden>🌱</div>
        <h1>Brote</h1>
        <p>{t("Fruta o verdura todos los días. Si fallás, tu pareja suma.")}</p>
      </div>

      {!user ? (
        <div className="stack">
          <h2 className="center-title">{t("¿Quién sos?")}</h2>
          <div className="profile-pick">
            {USERS.map((u) => (
              <button key={u.key} className="profile-opt" onClick={() => pick(u)}>
                <span className="profile-opt-emoji">{u.emoji}</span>
                <b>{u.name}</b>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form className="card form" onSubmit={submit}>
          <div className="profile-chosen">
            <span className="profile-opt-emoji small">{user.emoji}</span>
            <b>{user.name}</b>
          </div>

          <div className="field-label">{t("Idioma")}</div>
          <LangPicker value={lang} onChange={setLang} />

          {!api.demo && (
            <label>
              {t("Contraseña")}
              <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          )}
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" disabled={busy}>{busy ? "…" : t("Entrar")}</button>
          <button type="button" className="btn btn-ghost" onClick={() => setUser(null)}>{t("Volver")}</button>
        </form>
      )}
    </div>
  );
}

export function LangPicker({ value, onChange }: { value: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="segmented" role="radiogroup" aria-label="Idioma">
      {LANGS.map((l) => (
        <button type="button" key={l.id} role="radio" aria-checked={value === l.id} className={value === l.id ? "on" : ""} onClick={() => onChange(l.id)}>
          <span aria-hidden>{l.flag}</span> {l.label}
        </button>
      ))}
    </div>
  );
}
