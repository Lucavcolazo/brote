import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  PiArrowCounterClockwiseBold,
  PiBellBold,
  PiCheckBold,
  PiDeviceMobileBold,
  PiShuffleBold,
  PiSignOutBold,
  PiTranslateBold,
  PiUserBold,
} from "react-icons/pi";
import { api } from "../api";
import type { Ctx } from "../App";
import { Avatar } from "../avatar/Avatar";
import {
  COLORS,
  COLOR_HEX,
  EXTRAS,
  EYES,
  FACES,
  HANDS,
  MOUTHS,
  SHAPES,
  type AvatarConfig,
} from "../avatar/model";
import { avatarOf } from "../config";
import { useI18n, type Lang } from "../i18n";
import { enablePush, isIos, pushState, type PushState } from "../lib/push";
import { Segmented, Switch, errMsg, press, spring, useToast } from "../ui";
import { LangPicker } from "./Auth";
import { Valance } from "../components/Valance";
import type { ConfigSection } from "../components/TopBar";

type Part = "shape" | "color" | "eyes" | "mouth" | "extra" | "face" | "hands";

const PUSH_TEXT: Record<PushState, string> = {
  enabled: "Activadas en este celu",
  available: "Todavía no las activaste en este celu",
  denied: "Las bloqueaste. Activalas en Ajustes del celu, Notificaciones, Brote.",
  "ios-install": "En iPhone primero agregá Brote a la pantalla de inicio.",
  unsupported: "Este navegador no soporta notificaciones.",
  "not-configured": "Falta configurar VITE_VAPID_PUBLIC_KEY.",
};

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function ConfigScreen({ ctx, focus }: { ctx: Ctx; focus?: { section: ConfigSection; at: number } }) {
  const { t, lang, setLang } = useI18n();
  const { me, reloadMe } = ctx;
  const toast = useToast();
  const saved = avatarOf(me.profile);
  const [draft, setDraft] = useState<AvatarConfig>(saved);
  const [part, setPart] = useState<Part>("shape");
  const [name, setName] = useState(me.profile.name);
  const [push, setPush] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pushState().then(setPush);
  }, []);

  // Desde el menú de arriba: "Configuración" baja directo a los ajustes (después de que entra la pantalla).
  useEffect(() => {
    if (focus?.section !== "ajustes") return;
    const id = setTimeout(() => document.getElementById("ajustes")?.scrollIntoView({ behavior: "smooth", block: "start" }), 320);
    return () => clearTimeout(id);
  }, [focus?.section, focus?.at]);

  const avatarDirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const nameDirty = name.trim() !== me.profile.name && name.trim().length > 0;
  const dirty = avatarDirty || nameDirty;

  async function run(fn: () => Promise<void>, ok?: string) {
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok);
    } catch (e) {
      toast(errMsg(e, t), "error");
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      await api.updateProfile({ ...(avatarDirty ? { avatar: draft } : {}), ...(nameDirty ? { name: name.trim() } : {}) });
      await reloadMe();
    }, t("Guardado"));

  const changeLang = (l: Lang) =>
    run(async () => {
      setLang(l);
      await api.updateProfile({ lang: l }); // también es el idioma de tus notificaciones
      await reloadMe();
    });

  const shuffle = () =>
    setDraft({
      shape: pick(SHAPES),
      color: pick(COLORS),
      eyes: pick(EYES),
      mouth: pick(MOUTHS),
      extra: Math.random() < 0.7 ? pick(EXTRAS) : "none",
      face: Math.random() < 0.45 ? pick(FACES) : "none",
      hands: Math.random() < 0.7 ? pick(HANDS) : "none",
      cheeks: Math.random() < 0.4,
      freckles: Math.random() < 0.3,
    });

  const parts: { value: Part; label: string }[] = [
    { value: "shape", label: t("Forma") },
    { value: "color", label: t("Color") },
    { value: "eyes", label: t("Ojos") },
    { value: "mouth", label: t("Boca") },
    { value: "extra", label: t("Cabeza") },
    { value: "face", label: t("Cara") },
    { value: "hands", label: t("Manos") },
  ];

  const options: { key: string; preview: AvatarConfig }[] =
    part === "shape" ? SHAPES.map((v) => ({ key: v, preview: { ...draft, shape: v } }))
    : part === "color" ? COLORS.map((v) => ({ key: v, preview: { ...draft, color: v } }))
    : part === "eyes" ? EYES.map((v) => ({ key: v, preview: { ...draft, eyes: v } }))
    : part === "mouth" ? MOUTHS.map((v) => ({ key: v, preview: { ...draft, mouth: v } }))
    : part === "extra" ? EXTRAS.map((v) => ({ key: v, preview: { ...draft, extra: v } }))
    : part === "face" ? FACES.map((v) => ({ key: v, preview: { ...draft, face: v } }))
    : HANDS.map((v) => ({ key: v, preview: { ...draft, hands: v } }));

  const selectedKey = draft[part] as string;

  return (
    <>
      <header className="page-head">
        <h1 className="title">{t("Config")}</h1>
      </header>
      <Valance color={COLOR_HEX[draft.color]} />

      <section aria-label={t("Tu avatar")}>
        <div className="stage" style={{ ["--stage" as string]: COLOR_HEX[draft.color] }}>
          <div className="stage-tools">
            <AnimatePresence>
              {avatarDirty && (
                <motion.button
                  key="undo"
                  className="icon-btn"
                  aria-label={t("Deshacer cambios")}
                  onClick={() => setDraft(saved)}
                  whileTap={press}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={spring}
                >
                  <PiArrowCounterClockwiseBold />
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button className="icon-btn" aria-label={t("Avatar al azar")} onClick={shuffle} whileTap={{ scale: 0.88, rotate: 180 }} transition={spring}>
              <PiShuffleBold />
            </motion.button>
          </div>
          <Avatar config={draft} size={176} title={t("Tu avatar")} />
          <div className="stage-floor" />
        </div>

        <div className="part-tabs">
          <Segmented label={t("Parte del avatar")} value={part} onChange={setPart} options={parts} />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={part}
            className="options"
            role="radiogroup"
            aria-label={parts.find((p) => p.value === part)?.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22 }}
          >
            {options.map((o, i) => (
              <motion.button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={selectedKey === o.key}
                aria-label={o.key}
                className="option"
                whileTap={{ scale: 0.92 }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 480, damping: 30, delay: i * 0.02 }}
                onClick={() => setDraft({ ...draft, [part]: o.key } as AvatarConfig)}
              >
                {part === "color" ? (
                  <span className="swatch" style={{ background: COLOR_HEX[o.key as keyof typeof COLOR_HEX] }} />
                ) : (
                  <Avatar config={o.preview} size={60} mode="still" />
                )}
                <AnimatePresence>
                  {selectedKey === o.key && (
                    <motion.span className="option-check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring}>
                      <PiCheckBold />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {part === "face" && (
            <motion.div key="face-toggles" className="toggles" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <div className="toggle-row">
                {t("Cachetes")}
                <Switch checked={draft.cheeks} onChange={(v) => setDraft({ ...draft, cheeks: v })} label={t("Cachetes")} />
              </div>
              <div className="toggle-row">
                {t("Pecas")}
                <Switch checked={draft.freckles} onChange={(v) => setDraft({ ...draft, freckles: v })} label={t("Pecas")} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="settings" id="ajustes">
        <div className="setting">
          <div className="setting-head">
            <PiUserBold aria-hidden />
            {t("Nombre")}
          </div>
          <input className="input" style={{ background: "var(--ground)" }} value={name} maxLength={30} onChange={(e) => setName(e.target.value)} aria-label={t("Nombre")} />
        </div>

        <div className="setting">
          <div className="setting-head">
            <PiTranslateBold aria-hidden />
            {t("Idioma")}
          </div>
          <LangPicker value={lang} onChange={changeLang} />
        </div>

        <div className="setting">
          <div className="setting-head">
            <PiBellBold aria-hidden />
            {t("Notificaciones")}
          </div>
          <p>{push ? t(PUSH_TEXT[push]) : ""}</p>
          {push === "available" && (
            <motion.button
              className="btn btn-ink btn-block"
              disabled={busy}
              whileTap={press}
              onClick={() =>
                run(async () => {
                  const s = await enablePush();
                  setPush(s);
                  toast(s === "enabled" ? t("Notificaciones activadas") : t("No se activaron"), s === "enabled" ? "ok" : "error");
                })
              }
            >
              <PiBellBold aria-hidden />
              {t("Activar notificaciones")}
            </motion.button>
          )}
          <ul className="schedule">
            <li><b>12:30</b> {t("recordatorio si no subiste nada")}</li>
            <li><b>21:30</b> {t("última llamada")}</li>
            <li><b>8:00</b> {t("se cierra el día anterior: lo que nadie revisó se aprueba solo y se reparten puntos")}</li>
            <li><b>{t("Dom 21:00")}</b> {t("resumen semanal")}</li>
          </ul>
        </div>

        {(push === "ios-install" || isIos()) && (
          <div className="setting">
            <div className="setting-head">
              <PiDeviceMobileBold aria-hidden />
              {t("Instalar en iPhone")}
            </div>
            <ol className="steps">
              <li>{t("Abrí Brote en Safari.")}</li>
              <li>{t("Tocá Compartir.")}</li>
              <li>{t("Elegí Agregar a pantalla de inicio.")}</li>
              <li>{t("Abrila desde el ícono y activá las notificaciones acá.")}</li>
            </ol>
          </div>
        )}

        <motion.button className="btn btn-soft btn-block" onClick={() => api.signOut()} whileTap={press}>
          <PiSignOutBold aria-hidden />
          {t("Cerrar sesión")}
        </motion.button>
      </div>

      <AnimatePresence>
        {dirty && (
          <motion.div
            key="save"
            className="save-bar"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={spring}
          >
            <motion.button className="btn btn-ink btn-block" disabled={busy} onClick={save} whileTap={press} style={{ boxShadow: "var(--shadow-2)" }}>
              <PiCheckBold aria-hidden />
              {busy ? t("Guardando…") : t("Guardar cambios")}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
