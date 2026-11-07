import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  PiArrowRightBold,
  PiCameraBold,
  PiCheckBold,
  PiCheckCircleFill,
  PiEyeBold,
  PiImageBrokenBold,
  PiHourglassMediumBold,
  PiXBold,
} from "react-icons/pi";
import { api, type Meal, type Profile } from "../api";
import type { Ctx } from "../App";
import { Avatar } from "../avatar/Avatar";
import { COLOR_HEX } from "../avatar/model";
import { EmptyStall, Stall, type StallPlayer } from "../components/feira";
import { QUICK_REACTION, ReactionBar, ReactionBurst, useReactions } from "../components/Reactions";
import { avatarOf } from "../config";
import { useI18n } from "../i18n";
import { addDays, canLogYesterday, clock, dayLabel, localToday } from "../lib/dates";
import { KindTag, ease, errMsg, press, spring, useToast } from "../ui";

export function Home({ ctx }: { ctx: Ctx }) {
  const { t, locale } = useI18n();
  const { me, data, balances, streakOf, openComposer } = ctx;
  const today = localToday();
  const ateToday = (uid: string) => data.meals.some((m) => m.user_id === uid && m.local_date === today && m.review !== "rejected");

  const people = [me.profile, me.partner].filter(Boolean) as Profile[];
  const players: StallPlayer[] = people.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: avatarOf(p),
    points: balances[p.id] ?? 0,
    streak: streakOf(p.id).current_streak,
    doneToday: ateToday(p.id),
  }));
  const [a, b] = players;
  const leader = b && a.points !== b.points ? (a.points > b.points ? a : b) : null;
  const leaderColor = leader ? COLOR_HEX[leader.avatar.color] : "#C9C4BA";
  const gap = b ? Math.abs(a.points - b.points) : 0;

  const groups: { date: string; meals: Meal[] }[] = [];
  for (const m of data.meals) {
    const g = groups.find((x) => x.date === m.local_date);
    if (g) g.meals.push(m);
    else groups.push({ date: m.local_date, meals: [m] });
  }
  groups.sort((x, y) => y.date.localeCompare(x.date));

  return (
    <>
      <section className="market" style={{ ["--leader" as string]: leaderColor }} aria-label={t("Marcador")}>
        <div className="market-head">
          <span className="wordmark">Brote</span>
          <span className="market-note">
            {!me.partner ? "" : !leader ? t("Empate") : leader.id === me.userId ? t("Vas ganando por {n}", { n: gap }) : t("{name} gana por {n}", { name: leader.name, n: gap })}
          </span>
        </div>
        <div className="stalls">
          {players.map((p, i) => (
            <Stall key={p.id} p={p} leader={leader?.id === p.id} isMe={p.id === me.userId} index={i} />
          ))}
          {!me.partner && <EmptyStall index={1} />}
        </div>
      </section>

      <div className="today">
        {players.map((p) => (
          <motion.div
            key={p.id}
            className={`today-pill ${p.doneToday ? "ok" : "pending"}`}
            layout
            transition={spring}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={String(p.doneToday)}
                style={{ display: "inline-flex" }}
                initial={{ scale: 0.4, rotate: -30, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 24 }}
              >
                {p.doneToday ? <PiCheckCircleFill aria-hidden /> : <PiHourglassMediumBold aria-hidden />}
              </motion.span>
            </AnimatePresence>
            {p.id === me.userId ? (p.doneToday ? t("Ya cumpliste hoy") : t("Te falta hoy")) : p.doneToday ? t("{name} cumplió", { name: p.name }) : t("{name} no subió", { name: p.name })}
          </motion.div>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {!ateToday(me.userId) && (
          <motion.button
            key="cta"
            className="post-cta"
            onClick={openComposer}
            whileTap={press}
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 26 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
            transition={{ duration: 0.35, ease }}
          >
            <span className="cta-icon">
              <PiCameraBold aria-hidden />
            </span>
            <span>
              <b>{t("Subí lo de hoy")}</b>
            </span>
            <PiArrowRightBold className="cta-arrow" aria-hidden />
          </motion.button>
        )}
      </AnimatePresence>

      {groups.length === 0 && (
        <div className="empty">
          <PiCameraBold aria-hidden style={{ width: 34, height: 34 }} />
          <b>{t("Todavía no hay fotos")}</b>
          <p>{t("La primera foto abre el puesto.")}</p>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.date} aria-label={dayLabel(g.date, t, locale)}>
          <h2 className="day-title">{dayLabel(g.date, t, locale)}</h2>
          <AnimatePresence initial={false}>
            {g.meals.map((m) => (
              <MealPost key={m.id} meal={m} ctx={ctx} />
            ))}
          </AnimatePresence>
        </section>
      ))}
    </>
  );
}

function MealPost({ meal, ctx }: { meal: Meal; ctx: Ctx }) {
  const { t, locale } = useI18n();
  const { me, reload } = ctx;
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  const mine = meal.user_id === me.userId;
  const author = mine ? me.profile : me.partner;
  const partnerName = me.partner?.name ?? "";
  const today = localToday();
  const canDelete = mine && (meal.local_date === today || (meal.local_date === addDays(today, -1) && canLogYesterday()));
  const { list: reactions, mine: myReaction, react } = useReactions(meal, me.userId);
  const [burst, setBurst] = useState(0);
  const [photoReady, setPhotoReady] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // Si la foto ya estaba en caché puede terminar de cargar antes de que React escuche el evento.
  useEffect(() => {
    if (imgRef.current?.complete) setPhotoReady(true);
  }, [meal.photo_url]);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!burst) return;
    const id = setTimeout(() => setBurst(0), 650);
    return () => clearTimeout(id);
  }, [burst]);
  useEffect(() => () => clearTimeout(tapTimer.current), []);

  // Un toque abre la foto; doble toque deja la reacción rápida (no la saca si ya estaba).
  function onPhotoTap() {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = undefined;
      setBurst(Date.now());
      if (myReaction !== QUICK_REACTION) react(QUICK_REACTION);
      return;
    }
    tapTimer.current = setTimeout(() => {
      tapTimer.current = undefined;
      setZoom(true);
    }, 260);
  }

  async function act(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      await reload();
    } catch (e) {
      toast(errMsg(e, t), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.article
      layout
      className={`post ${meal.review === "rejected" ? "rejected" : ""}`}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease }}
    >
      <div className="post-head">
        <Avatar config={avatarOf(author)} size={38} mode="still" title={author?.name} />
        <div className="post-who">
          <b>{mine ? t("Vos") : author?.name}</b>
          <span className="num">{clock(meal.created_at, locale)}</span>
        </div>
        <KindTag kind={meal.kind} />
      </div>

      {meal.photo_url ? (
        <button className={`post-photo ${photoReady ? "" : "loading"}`} onClick={onPhotoTap} aria-label={t("Ver foto grande")}>
          <motion.img
            ref={imgRef}
            // Motion maneja la opacidad de esta imagen (por el layoutId), así que el fundido va acá y no en CSS.
            initial={false}
            animate={{ opacity: !photoReady ? 0 : meal.review === "rejected" ? 0.6 : 1 }}
            transition={{ duration: 0.45, ease }}
            onLoad={() => setPhotoReady(true)}
            onError={() => setPhotoReady(true)}
            src={meal.photo_url} alt={meal.description || t(meal.kind === "fruta" ? "Fruta" : meal.kind === "verdura" ? "Verdura" : "Las dos")} loading="lazy" layoutId={`photo-${meal.id}`} />
          <AnimatePresence>
            {meal.review && (
              <motion.span
                key={meal.review}
                className={`stamp ${meal.review === "ok" ? "ok" : "no"}`}
                initial={{ scale: 2.2, rotate: -18, opacity: 0 }}
                animate={{ scale: 1, rotate: -8, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 600, damping: 22 }}
              >
                {meal.review === "ok" ? <PiCheckBold aria-hidden /> : <PiXBold aria-hidden />}
                {meal.review === "ok" ? t("Vale") : t("No cuenta")}
              </motion.span>
            )}
          </AnimatePresence>
          <ReactionBurst emoji={QUICK_REACTION} burstKey={burst} />
        </button>
      ) : (
        <div className="post-photo gone">
          <PiImageBrokenBold aria-hidden />
          {meal.photo_deleted_at ? t("Foto archivada") : t("Foto no disponible")}
        </div>
      )}

      <div className="post-body">
        {meal.description && <p className="post-desc">{meal.description}</p>}

        {me.partner && <ReactionBar list={reactions} mine={myReaction} react={react} people={{ me: me.profile, partner: me.partner }} />}

        {!mine && meal.review === null ? (
          <div className="post-actions">
            <motion.button className="btn btn-sm btn-vale" disabled={busy} whileTap={press} onClick={() => act(() => api.reviewMeal(meal.id, "ok"), t("Aprobada"))}>
              <PiCheckBold aria-hidden />
              {t("Vale")}
            </motion.button>
            <motion.button className="btn btn-sm btn-no" disabled={busy} whileTap={press} onClick={() => act(() => api.reviewMeal(meal.id, "rejected"), t("Marcada: no cuenta"))}>
              <PiXBold aria-hidden />
              {t("No cuenta")}
            </motion.button>
          </div>
        ) : (
          <div className="post-actions">
            {mine && meal.review === null && (
              <span className="post-status">
                <PiEyeBold aria-hidden />
                {t("Esperando a {name}", { name: partnerName })}
              </span>
            )}
            {mine && meal.review !== null && (
              <span className="post-status">
                {meal.review === "ok" ? <PiCheckBold aria-hidden style={{ color: "var(--vale)" }} /> : <PiXBold aria-hidden style={{ color: "var(--nocuenta)" }} />}
                {meal.review === "ok" ? t("{name} la aprobó", { name: partnerName }) : t("{name} dice que no cuenta", { name: partnerName })}
              </span>
            )}
            <span className="post-tools">
              {!mine && meal.review !== null && (
                <button className="link" disabled={busy} onClick={() => act(() => api.reviewMeal(meal.id, meal.review === "ok" ? "rejected" : "ok"), t("Cambiado"))}>
                  {t("Cambiar")}
                </button>
              )}
              {canDelete && (
                <button className="link danger" disabled={busy} onClick={() => confirm(t("¿Borrar esta comida?")) && act(() => api.deleteMeal(meal), t("Borrada"))}>
                  {t("Borrar")}
                </button>
              )}
            </span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {zoom && meal.photo_url && (
          <motion.div className="lightbox" onClick={() => setZoom(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.img src={meal.photo_url} alt={meal.description} layoutId={`photo-${meal.id}`} transition={spring} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
