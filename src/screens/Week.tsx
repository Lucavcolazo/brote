import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { PiCaretDownBold, PiCarrotBold, PiCheckBold, PiFireFill, PiOrangeSliceBold, PiTrophyBold, PiXBold } from "react-icons/pi";
import type { Profile, WeeklySummary } from "../api";
import type { Ctx } from "../App";
import { Avatar } from "../avatar/Avatar";
import { COLOR_HEX } from "../avatar/model";
import { Awning, RollingNumber } from "../components/feira";
import { avatarOf } from "../config";
import { useI18n } from "../i18n";
import { addDays, localToday, mondayOf, shortDate, weekdayShort } from "../lib/dates";
import { KIND_META, ease } from "../ui";

export function Week({ ctx }: { ctx: Ctx }) {
  const { t, locale } = useI18n();
  const { me, data, streakOf } = ctx;
  const today = localToday();
  const monday = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const people = [me.profile, me.partner].filter(Boolean) as Profile[];
  const nameOf = (id: string | null) => (id === me.userId ? t("Vos") : id === me.partner?.id ? me.partner.name : "");

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

      <section className="streaks" aria-label={t("Rachas")}>
        {people.map((p, i) => {
          const st = streakOf(p.id);
          const av = avatarOf(p);
          return (
            <div key={p.id} className="streak-stall">
              <Awning color={COLOR_HEX[av.color]} delay={i * 0.08} />
              <div className="streak-who">
                <Avatar config={av} size={30} mode="still" />
                {p.id === me.userId ? t("Vos") : p.name}
              </div>
              <div className="placard-wrap streak-hang">
              <div className="placard streak-placard">
                <span className="placard-num">
                  <motion.span
                    className="streak-flame"
                    animate={st.current_streak > 0 ? { scale: [1, 1.12, 1], rotate: [0, -6, 0] } : { opacity: 0.35 }}
                    transition={{ duration: 1.6, repeat: st.current_streak > 0 ? Infinity : 0, ease: "easeInOut" }}
                  >
                    <PiFireFill aria-hidden />
                  </motion.span>
                  <RollingNumber value={st.current_streak} />
                </span>
                <span className="streak-label">{st.current_streak === 1 ? t("día seguido") : t("días seguidos")}</span>
              </div>
              </div>
              <div className="streak-best">
                <PiTrophyBold aria-hidden /> {t("Mejor racha: {n}", { n: st.best_streak })}
              </div>
            </div>
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
                {p.kind === "miss" && p.ref_date
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
