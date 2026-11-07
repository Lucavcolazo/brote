import { useState } from "react";
import type { Profile, WeeklySummary } from "../api";
import type { Ctx } from "../App";
import { useI18n } from "../i18n";
import { addDays, localToday, mondayOf, shortDate, weekdayShort } from "../lib/dates";
import { Avatar, KIND_META } from "../ui";

export function Week({ ctx }: { ctx: Ctx }) {
  const { t, locale } = useI18n();
  const { me, data } = ctx;
  const today = localToday();
  const monday = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const people = [me.profile, me.partner].filter(Boolean) as Profile[];
  const nameOf = (id: string | null) => (id === me.userId ? t("Vos") : id === me.partner?.id ? me.partner.name : "—");

  const status = (uid: string, d: string): "ok" | "miss" | "today" | "future" => {
    if (d > today) return "future";
    if (data.meals.some((m) => m.user_id === uid && m.local_date === d && m.review !== "rejected")) return "ok";
    return d === today ? "today" : "miss";
  };

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">{t("Semana del {date}", { date: shortDate(monday, locale) })}</p>
        <h1>{t("Cómo vienen")}</h1>
      </header>

      <section className="card week-card">
        <div className="week-row head">
          <span />
          {days.map((d) => (
            <span key={d} className={d === today ? "is-today" : ""}>{weekdayShort(d, locale).slice(0, 1).toUpperCase()}</span>
          ))}
        </div>
        {people.map((p) => (
          <div key={p.id} className="week-row">
            <span className="week-who">
              <Avatar p={p} size={28} /> <small>{days.filter((d) => status(p.id, d) === "ok").length}/7</small>
            </span>
            {days.map((d) => {
              const s = status(p.id, d);
              return (
                <span key={d} className={`dot dot-${s}`} title={`${p.name} · ${d}`}>
                  {s === "ok" ? "✓" : s === "miss" ? "✕" : ""}
                </span>
              );
            })}
          </div>
        ))}
        <p className="week-legend">{t("El domingo a la noche les llega el resumen. Las fotos se archivan el miércoles siguiente.")}</p>
      </section>

      <section className="block">
        <h3 className="block-title">{t("Resúmenes")}</h3>
        {data.summaries.length === 0 && <p className="muted-text">{t("El primero llega este domingo a las 21 hs.")}</p>}
        {data.summaries.map((s) => (
          <SummaryCard key={s.id} s={s} meId={me.userId} />
        ))}
      </section>

      <section className="block">
        <h3 className="block-title">{t("Movimientos de puntos")}</h3>
        {data.points.length === 0 && <p className="muted-text">{t("Todavía nadie falló. 💪")}</p>}
        {data.points.slice(0, 30).map((p) => (
          <div key={p.id} className="row-card slim">
            <span className={`amount ${p.amount > 0 ? "plus" : "minus"}`}>{p.amount > 0 ? `+${p.amount}` : p.amount}</span>
            <div className="row-main">
              <b>{nameOf(p.user_id)}</b>
              <small>
                {p.kind === "miss" && p.ref_date
                  ? t("{name} no comió nada verde el {date}", {
                      name: nameOf(p.source_user_id),
                      date: `${weekdayShort(p.ref_date, locale)} ${shortDate(p.ref_date, locale)}`,
                    })
                  : p.note?.startsWith("Canje: ")
                    ? t("Canje: {title}", { title: p.note.slice(7) })
                    : p.note ?? t("Ajuste")}
              </small>
            </div>
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
    <article className="card summary">
      <button className="summary-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <b>{shortDate(s.data.week_start, locale)} – {shortDate(s.data.week_end, locale)}</b>
        <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>
      <div className="summary-grid">
        {members.map((m) => (
          <div key={m.user_id} className="summary-member">
            <div className="summary-name"><Avatar p={m} size={26} /> {m.user_id === meId ? t("Vos") : m.name}</div>
            <div className="summary-stats">
              <span><b>{m.days_ok}</b>/7 {t("días")}</span>
              <span>🍎 {m.fruits}</span>
              <span>🥦 {m.veggies}</span>
            </div>
            <div className="summary-points">+{m.points_week} {t("pts")} · {m.balance}</div>
          </div>
        ))}
      </div>
      {open && (
        <div className="summary-meals">
          {members.map((m) => (
            <div key={m.user_id}>
              <h4>{m.user_id === meId ? t("Vos") : m.name}</h4>
              {m.meals.length === 0 && <p className="muted-text">{t("Nada esta semana.")}</p>}
              <ul>
                {m.meals.map((ml, i) => (
                  <li key={i} className={ml.rejected ? "struck" : ""}>
                    <span className="li-day">{weekdayShort(ml.date, locale)}</span>
                    {KIND_META[ml.kind].emoji} {ml.description || t(KIND_META[ml.kind].label)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
