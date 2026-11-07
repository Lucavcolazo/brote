import { useEffect, useState } from "react";
import { api } from "../api";
import type { Ctx } from "../App";
import { useI18n, type Lang } from "../i18n";
import { enablePush, isIos, pushState, type PushState } from "../lib/push";
import { Avatar, EmojiPicker, errMsg, useToast } from "../ui";
import { LangPicker } from "./Auth";

const PUSH_TEXT: Record<PushState, string> = {
  enabled: "Activadas en este celu ✅",
  available: "Todavía no las activaste en este celu",
  denied: "Las bloqueaste. Activalas desde Ajustes del celu > Notificaciones > Brote.",
  "ios-install": "En iPhone primero agregá la app a la pantalla de inicio (ver abajo).",
  unsupported: "Este navegador no soporta notificaciones.",
  "not-configured": "Falta configurar VITE_VAPID_PUBLIC_KEY.",
};

export function MeScreen({ ctx, reloadMe }: { ctx: Ctx; reloadMe: () => Promise<void> }) {
  const { t, lang, setLang } = useI18n();
  const { me } = ctx;
  const toast = useToast();
  const [push, setPush] = useState<PushState | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me.profile.name);
  const [emoji, setEmoji] = useState(me.profile.emoji);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pushState().then(setPush);
  }, []);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast(errMsg(e, t), "error");
    } finally {
      setBusy(false);
    }
  }

  const changeLang = (l: Lang) =>
    run(async () => {
      setLang(l);
      await api.updateProfile({ lang: l }); // también define el idioma de tus notificaciones
      await reloadMe();
    });

  return (
    <>
      <header className="page-head">
        <p className="eyebrow plain">{me.email}</p>
        <h1>{t("Yo")}</h1>
      </header>

      <section className="card profile-card">
        {editing ? (
          <div className="form">
            <label>
              {t("Nombre")}
              <input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
            </label>
            <EmojiPicker value={emoji} onChange={setEmoji} />
            <button
              className="btn btn-primary"
              disabled={busy || !name.trim()}
              onClick={() =>
                run(async () => {
                  await api.updateProfile({ name: name.trim(), emoji });
                  await reloadMe();
                  setEditing(false);
                  toast(t("Guardado"));
                })
              }
            >
              {t("Guardar")}
            </button>
          </div>
        ) : (
          <div className="profile-row">
            <Avatar p={me.profile} size={56} />
            <div className="row-main">
              <b className="profile-name">{me.profile.name}</b>
              {me.partner && <small>{t("En pareja con {name}", { name: `${me.partner.emoji} ${me.partner.name}` })}</small>}
            </div>
            <button className="link-btn" onClick={() => setEditing(true)}>{t("editar")}</button>
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="block-title">🌐 {t("Idioma")}</h3>
        <LangPicker value={lang} onChange={changeLang} />
      </section>

      <section className="card">
        <h3 className="block-title">{t("🔔 Notificaciones")}</h3>
        <p className="muted-text">{push ? t(PUSH_TEXT[push]) : "…"}</p>
        {push === "available" && (
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const s = await enablePush();
                setPush(s);
                toast(s === "enabled" ? t("Notificaciones activadas 🔔") : t("No se activaron"), s === "enabled" ? "ok" : "error");
              })
            }
          >
            {t("Activar notificaciones")}
          </button>
        )}
        <ul className="schedule">
          <li><b>12:30</b> {t("recordatorio si no subiste nada")}</li>
          <li><b>21:30</b> {t("última llamada")}</li>
          <li><b>10:00</b> {t("se cierra el día anterior y se reparten puntos")}</li>
          <li><b>{t("Dom 21:00")}</b> {t("resumen semanal")}</li>
          <li>{t("Cada vez que tu pareja sube algo o canjea un premio")}</li>
        </ul>
      </section>

      {(push === "ios-install" || isIos()) && (
        <section className="card">
          <h3 className="block-title">{t("📲 Instalar en iPhone")}</h3>
          <ol className="steps">
            <li>{t("Abrí la app en Safari.")}</li>
            <li>{t("Tocá Compartir (el cuadrado con la flecha).")}</li>
            <li>{t("Elegí Agregar a pantalla de inicio.")}</li>
            <li>{t("Abrila desde el ícono y activá las notificaciones acá.")}</li>
          </ol>
        </section>
      )}

      <button className="btn btn-ghost full" onClick={() => api.signOut()}>{t("Cerrar sesión")}</button>
      <p className="footnote">{t("Brote · las fotos se archivan solas cada miércoles, los puntos y comidas quedan.")}</p>
    </>
  );
}
