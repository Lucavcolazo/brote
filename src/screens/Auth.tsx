import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { PiArrowRightBold } from "react-icons/pi";
import { api } from "../api";
import { Avatar } from "../avatar/Avatar";
import { DEFAULT_AVATARS } from "../avatar/model";
import { Awning } from "../components/feira";
import { LANGS, useI18n, type Lang } from "../i18n";
import { Segmented, ease, errMsg, press } from "../ui";

export function LangPicker({ value, onChange }: { value: Lang; onChange: (l: Lang) => void }) {
  const { t } = useI18n();
  return <Segmented label={t("Idioma")} value={value} onChange={onChange} options={LANGS.map((l) => ({ value: l.id, label: l.label }))} />;
}

function LoginHeader() {
  return (
    <div className="login-market" style={{ ["--leader" as string]: "#3D8BE0" }}>
      <div className="wordmark">Brote</div>
      <div className="login-duo" aria-hidden>
        <div style={{ width: 120 }}>
          <Awning color="#3D8BE0" />
          <div style={{ display: "grid", placeItems: "center", marginTop: -4 }}>
            <Avatar config={DEFAULT_AVATARS.luca} size={74} />
          </div>
        </div>
        <div style={{ width: 120 }}>
          <Awning color="#E8432E" delay={0.08} />
          <div style={{ display: "grid", placeItems: "center", marginTop: -4 }}>
            <Avatar config={DEFAULT_AVATARS.giovanna} size={74} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginScreen() {
  const { t, lang, setLang } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.signIn(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(errMsg(err, t));
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <LoginHeader />
      <motion.form
        className="login-body"
        onSubmit={submit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease }}
      >
        <h1>{t("Entrá a tu puesto")}</h1>
        <label className="field">
          <span>{t("Email")}</span>
          <input
            className="input"
            type="email"
            inputMode="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@mail.com"
          />
        </label>
        <label className="field">
          <span>{t("Contraseña")}</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <LangPicker value={lang} onChange={setLang} />
        <AnimatePresence>
          {error && (
            <motion.p className="error-text" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {error}
            </motion.p>
          )}
        </AnimatePresence>
        <motion.button className="btn btn-ink btn-block" disabled={busy || !email || !password} whileTap={press}>
          {busy ? t("Entrando…") : t("Entrar")}
          <PiArrowRightBold aria-hidden />
        </motion.button>
      </motion.form>
    </div>
  );
}

export function SetupScreen({ onDone }: { onDone: () => void }) {
  const { t, lang, setLang } = useI18n();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createProfile({ name: name.trim(), lang });
      onDone();
    } catch (err) {
      setError(errMsg(err, t));
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <LoginHeader />
      <form className="login-body" onSubmit={submit}>
        <h1>{t("¿Cómo te llamamos?")}</h1>
        <label className="field">
          <span>{t("Nombre")}</span>
          <input className="input" required maxLength={30} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <LangPicker value={lang} onChange={setLang} />
        {error && <p className="error-text" role="alert">{error}</p>}
        <motion.button className="btn btn-ink btn-block" disabled={busy || !name.trim()} whileTap={press}>
          {t("Empezar")}
          <PiArrowRightBold aria-hidden />
        </motion.button>
        <button type="button" className="link" onClick={() => api.signOut()}>
          {t("Salir")}
        </button>
      </form>
    </div>
  );
}
