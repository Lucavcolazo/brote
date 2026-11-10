import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { PiCaretDownBold, PiCarrotBold, PiCheckBold, PiFireFill, PiOrangeSliceBold, PiTrophyBold, PiXBold } from "react-icons/pi";
import type { AlbumItem, Profile, WeeklySummary } from "../api";
import type { Ctx } from "../App";
import { Avatar } from "../avatar/Avatar";
import { RollingNumber } from "../components/feira";
import { Player } from "../components/Players";
import { avatarOf } from "../config";
import { useI18n } from "../i18n";
import { addDays, localToday, mondayOf, shortDate, weekdayShort } from "../lib/dates";
import { KIND_META, ease } from "../ui";
import { fmtGrade } from "./Exams";

export function Week({ ctx }: { ctx: Ctx }) {
  const { t, locale } = useI18n();
  const { me, data, streakOf } = ctx;
  const today = localToday();
  const monday = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const people = [me.profile, me.partner].filter(Boolean) as Profile[];
  const nameOf = (id: string | null) => (id === me.userId ? t("Vos") : id === me.partner?.id ? me.partner.name : "");

  // Movimiento de una nota: "Sacaste 8 en Análisis" / "Gio sacó 4 en Física".
  const examLine = (examId: string | null | undefined, who: string | null, note: string | null) => {
    const ex = data.exams.find((e) => e.id === examId);
    if (!ex) return note ?? t("Nota de examen");
    const vars = { grade: fmtGrade(ex.grade, locale), subject: ex.subject };
    return who === me.userId ? t("Sacaste {grade} en {subject}", vars) : t("{name} sacó {grade} en {subject}", { ...vars, name: nameOf(who) });
  };

  const status = (uid: string, d: string): "ok" | "miss" | "today" | "future" => {
    if (d > today) return "future";
    if (data.meals.some((m) => m.user_id === uid && m.local_date === d && m.review !== "rejected")) return "ok";
    return d === today ? "today" : "miss";
  };

  return (
    <>
      <header className="page-head">
        <h1 className="title">{t("Semana")}</h1>
        <span className="muted small">{t("Desde el {date}", { date: `${weekdayShort(monday, locale)} ${shortDate(monday, locale)}` })}</span>
      </header>

      <section className="duo duo-week" aria-label={t("Rachas")}>
        {people.map((p, i) => {
          const st = streakOf(p.id);
          return (
            <Player key={p.id} id={p.id} name={p.name} avatar={avatarOf(p)} size={104} mood={st.current_streak > 0 ? "happy" : "neutral"} index={i}>
              <span className="player-name">{p.id === me.userId ? t("Vos") : p.name}</span>
              <span className="player-score streak-score">
                <motion.span
                  className="streak-flame"
                  animate={st.current_streak > 0 ? { scale: [1, 1.12, 1], rotate: [0, -6, 0] } : { opacity: 0.35 }}
                  transition={{ duration: 1.6, repeat: st.current_streak > 0 ? Infinity : 0, ease: "easeInOut" }}
                >
                  <PiFireFill aria-hidden />
                </motion.span>
                <RollingNumber value={st.current_streak} />
              </span>
              <span className="player-sub">{st.current_streak === 1 ? t("día seguido") : t("días seguidos")}</span>
              <span className="player-streak">
                <PiTrophyBold aria-hidden /> {t("Mejor racha: {n}", { n: st.best_streak })}
              </span>
            </Player>
          );
        })}
      </section>

      <section className="block" aria-label={t("Esta semana")}>
        <h2 className="section-title">{t("Esta semana")}</h2>
        <div className="week-grid">
          <div className="week-row head">
            <span />
            {days.map((d) => (
              <span key={d} className={d === today ? "is-today" : ""}>{weekdayShort(d, locale).slice(0, 3)}</span>
            ))}
          </div>
          {people.map((p) => (
            <div key={p.id} className="week-row">
              <Avatar config={avatarOf(p)} size={34} mode="still" title={p.name} />
              {days.map((d, i) => {
                const s = status(p.id, d);
                return (
                  <motion.span
                    key={d}
                    className={`cell ${s === "today" ? "is-today" : s}`}
                    title={`${p.name} · ${d}`}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28, delay: 0.1 + i * 0.03 }}
                  >
                    {s === "ok" ? <PiCheckBold aria-label={t("Cumplió")} /> : s === "miss" ? <PiXBold aria-label={t("Falló")} /> : null}
                  </motion.span>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <Album ctx={ctx} people={people} monday={monday} />

      <section className="block">
        <h2 className="section-title">{t("Resúmenes")}</h2>
        {data.summaries.length === 0 && <p className="muted small">{t("El primero llega el domingo a las 21.")}</p>}
        {data.summaries.map((s) => (
          <SummaryCard key={s.id} s={s} meId={me.userId} />
        ))}
      </section>

      <section className="block">
        <h2 className="section-title">{t("Movimientos de puntos")}</h2>
        {data.points.length === 0 && <p className="muted small">{t("Nadie falló todavía.")}</p>}
        {data.points.slice(0, 30).map((p) => (
          <div key={p.id} className="history-row">
            <span className={`amount num ${p.amount > 0 ? "plus" : "minus"}`}>{p.amount > 0 ? `+${p.amount}` : p.amount}</span>
            <span className="grow">
              <b>{nameOf(p.user_id)}</b>
              <small>
                {p.kind === "exam" || p.exam_id
                  ? examLine(p.exam_id, p.source_user_id, p.note)
                  : p.kind === "miss" && p.ref_date
                  ? p.source_user_id === me.userId
                    ? t("No subiste fruta ni verdura el {date}", { date: `${weekdayShort(p.ref_date, locale)} ${shortDate(p.ref_date, locale)}` })
                    : t("{name} no subió fruta ni verdura el {date}", { name: nameOf(p.source_user_id), date: `${weekdayShort(p.ref_date, locale)} ${shortDate(p.ref_date, locale)}` })
                  : p.note?.startsWith("Canje: ")
                    ? t("Canje: {title}", { title: p.note.slice(7) })
                    : p.note ?? t("Ajuste")}
              </small>
            </span>
          </div>
        ))}
      </section>
    </>
  );
}

function SummaryCard({ s, meId }: { s: WeeklySummary; meId: string }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const members = [...s.data.members].sort((a) => (a.user_id === meId ? -1 : 1));
  return (
    <article className="summary">
      <button className="summary-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        {shortDate(s.data.week_start, locale)} – {shortDate(s.data.week_end, locale)}
        <PiCaretDownBold aria-hidden />
      </button>
      <div className="summary-cols">
        {members.map((m) => (
          <div key={m.user_id} className="summary-col">
            <div className="who">{m.user_id === meId ? t("Vos") : m.name}</div>
            <div className="big num">{m.days_ok}/7</div>
            <div className="meta">
              <span><PiOrangeSliceBold aria-hidden /> {m.fruits}</span>
              <span><PiCarrotBold aria-hidden /> {m.veggies}</span>
              {typeof m.streak === "number" && <span><PiFireFill aria-hidden style={{ color: "var(--crate-fruta)" }} /> {m.streak}</span>}
            </div>
            <div className="meta">{t("+{n} pts en la semana", { n: m.points_week })}</div>
          </div>
        ))}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="meals"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            style={{ overflow: "hidden" }}
          >
            <div className="summary-meals">
              {members.map((m) => (
                <div key={m.user_id}>
                  <h4>{m.user_id === meId ? t("Vos") : m.name}</h4>
                  {m.meals.length === 0 && <p className="muted small">{t("Nada esta semana.")}</p>}
                  <ul>
                    {m.meals.map((ml, i) => {
                      const K = KIND_META[ml.kind];
                      return (
                        <li key={i} className={ml.rejected ? "struck" : ""}>
                          <span className="d">{weekdayShort(ml.date, locale)}</span>
                          <K.Icon aria-hidden style={{ width: 15, height: 15, flex: "none" }} />
                          {ml.description || t(K.label)}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

/** Cada fruta y verdura distinta que comió cada uno. Se arma sola con lo que escriben en cada foto. */
function Album({ ctx, people, monday }: { ctx: Ctx; people: Profile[]; monday: string }) {
  const { t } = useI18n();
  const { me, data } = ctx;
  const [open, setOpen] = useState(false);
  const LIMIT = 14;
  const byUser = (uid: string) => data.album.filter((a) => a.user_id === uid).sort((x, y) => y.first_date.localeCompare(x.first_date));
  const cap = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);
  const anyMore = people.some((p) => byUser(p.id).length > LIMIT);

  return (
    <section className="block" aria-label={t("Álbum")}>
      <h2 className="section-title">{t("Álbum")}</h2>
      <p className="section-note">{t("Cada fruta y verdura distinta que comieron. Se arma solo con lo que escriben en cada foto.")}</p>
      <div className="album">
        {people.map((p) => {
          const list = byUser(p.id);
          const shown: AlbumItem[] = open ? list : list.slice(0, LIMIT);
          return (
            <div key={p.id} className="album-col">
              <div className="album-head">
                <Avatar config={avatarOf(p)} size={30} mode="still" />
                <b>{p.id === me.userId ? t("Vos") : p.name}</b>
                <span className="album-count num">
                  <RollingNumber value={list.length} />
                  <small>{list.length === 1 ? t("distinta") : t("distintas")}</small>
                </span>
              </div>
              {list.length === 0 ? (
                <p className="muted small">{t("Todavía nada. Escribí qué es en cada foto.")}</p>
              ) : (
                <motion.ul className="album-chips" layout>
                  <AnimatePresence initial={false}>
                    {shown.map((a, i) => (
                      <motion.li
                        key={a.item}
                        layout
                        className={a.first_date >= monday ? "new" : ""}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30, delay: Math.min(i, 12) * 0.02 }}
                        title={a.first_date >= monday ? t("Nueva esta semana") : undefined}
                      >
                        {cap(a.label)}
                        {a.times > 1 && <small className="num">×{a.times}</small>}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>
              )}
            </div>
          );
        })}
      </div>
      {anyMore && (
        <button type="button" className="album-more" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? t("Ver menos") : t("Ver todas")}
          <PiCaretDownBold aria-hidden style={{ rotate: open ? "180deg" : "0deg", transition: "rotate 0.3s" }} />
        </button>
      )}
    </section>
  );
}
