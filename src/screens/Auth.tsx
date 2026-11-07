import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { PiArrowLeftBold, PiArrowRightBold, PiEnvelopeSimpleBold } from "react-icons/pi";
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
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.sendLoginEmail(email.trim().toLowerCase());
      setStep("code");
    } catch (err) {
      setError(errMsg(err, t));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.verifyLoginCode(email.trim().toLowerCase(), code.trim());
    } catch (err) {
      setError(errMsg(err, t));
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <LoginHeader />
      <AnimatePresence mode="wait" initial={false}>
        {step === "email" ? (
          <motion.form
            key="email"
            className="login-body"
            onSubmit={sendEmail}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.28, ease }}
          >
            <h1>{t("Entrá con tu email")}</h1>
            <label className="field">
              <span>{t("Email")}</span>
              <input
                className="input"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@mail.com"
              />
            </label>
            <LangPicker value={lang} onChange={setLang} />
            {error && <p className="error-text" role="alert">{error}</p>}
            <motion.button className="btn btn-ink btn-block" disabled={busy || !email} whileTap={press}>
              <PiEnvelopeSimpleBold aria-hidden />
              {busy ? t("Enviando…") : t("Mandame el acceso")}
            </motion.button>
          </motion.form>
        ) : (
          <motion.form
            key="code"
            className="login-body"
            onSubmit={verify}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.28, ease }}
          >
            <h1>{t("Revisá tu mail")}</h1>
            <p>{t("Te mandamos un link y un código a {email}. Tocá el link o escribí el código acá.", { email })}</p>
            <label className="field">
              <span>{t("Código")}</span>
              <input
                className="input code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoFocus
              />
            </label>
            {error && <p className="error-text" role="alert">{error}</p>}
            <motion.button className="btn btn-ink btn-block" disabled={busy || code.length < 6} whileTap={press}>
              {busy ? t("Entrando…") : t("Entrar")}
              <PiArrowRightBold aria-hidden />
            </motion.button>
            <motion.button type="button" className="btn btn-soft btn-block" onClick={() => setStep("email")} whileTap={press}>
              <PiArrowLeftBold aria-hidden />
              {t("Usar otro email")}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
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
