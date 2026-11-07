import { useState } from "react";
import { api, type Meal, type Profile } from "../api";
import type { Ctx } from "../App";
import { useI18n } from "../i18n";
import { addDays, canLogYesterday, clock, dayLabel, localToday, longToday } from "../lib/dates";
import { Avatar, KindChip, errMsg, useToast } from "../ui";

export function Feed({ ctx, onNew }: { ctx: Ctx; onNew: () => void }) {
  const { t, locale } = useI18n();
  const { me, data, balances } = ctx;
  const today = localToday();
  const people = [me.profile, me.partner].filter(Boolean) as Profile[];
  const ateToday = (uid: string) => data.meals.some((m) => m.user_id === uid && m.local_date === today && m.review !== "rejected");

  const groups: { date: string; meals: Meal[] }[] = [];
  for (const m of data.meals) {
    const g = groups.find((x) => x.date === m.local_date);
    if (g) g.meals.push(m);
    else groups.push({ date: m.local_date, meals: [m] });
  }
  groups.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">{longToday(locale)}</p>
        <h1>{t("¿Comieron algo verde?")}</h1>
      </header>

      <section className="today-grid">
        {people.map((p) => {
          const ok = ateToday(p.id);
          return (
            <div key={p.id} className={`today-card ${ok ? "ok" : "pending"}`}>
              <div className="today-top">
                <Avatar p={p} size={34} />
                <span className="today-points">{balances[p.id] ?? 0} <small>{t("pts")}</small></span>
              </div>
              <div className="today-name">{p.id === me.userId ? t("Vos") : p.name}</div>
              <div className="today-state">{ok ? t("✅ Cumplió hoy") : t("⏳ Todavía nada")}</div>
            </div>
          );
        })}
      </section>

      {!ateToday(me.userId) && (
        <button className="cta-card" onClick={onNew}>
          <span className="cta-emoji" aria-hidden>📸</span>
          <span>
            <b>{t("Subí lo de hoy")}</b>
            <small>{t("Foto + qué es. Si no, {name} se lleva 1 punto.", { name: me.partner?.name ?? "—" })}</small>
          </span>
          <span aria-hidden className="cta-arrow">→</span>
        </button>
      )}

      {groups.length === 0 && (
        <div className="empty">
          <div className="empty-emoji">🥕</div>
          <p>{t("Todavía no hay nada. ¡Arrancá vos!")}</p>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.date} className="day-group">
          <h3 className="day-title">{dayLabel(g.date, t, locale)}</h3>
          {g.meals.map((m) => (
            <MealCard key={m.id} meal={m} ctx={ctx} />
          ))}
        </section>
      ))}
    </>
  );
}

function MealCard({ meal, ctx }: { meal: Meal; ctx: Ctx }) {
  const { t, locale } = useI18n();
  const { me, reload } = ctx;
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  const mine = meal.user_id === me.userId;
  const author = mine ? me.profile : me.partner;
  const partnerName = me.partner?.name ?? "—";
  const today = localToday();
  const canDelete = mine && (meal.local_date === today || (meal.local_date === addDays(today, -1) && canLogYesterday()));

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
    <article className={`meal ${meal.review === "rejected" ? "rejected" : ""}`}>
      <div className="meal-head">
        <Avatar p={author} size={38} />
        <div className="meal-who">
          <b>{mine ? t("Vos") : author?.name}</b>
          <span>{clock(meal.created_at, locale)}</span>
        </div>
        <KindChip kind={meal.kind} />
      </div>

      {meal.photo_url ? (
        <button className="meal-photo" onClick={() => setZoom(true)} aria-label={t("Ver foto grande")}>
          <img src={meal.photo_url} alt={meal.description || meal.kind} loading="lazy" />
        </button>
      ) : (
        <div className="meal-photo gone">
          <span>🧹</span>
          <small>{meal.photo_deleted_at ? t("Foto archivada (la data queda)") : t("Foto no disponible")}</small>
        </div>
      )}

      {meal.description && <p className="meal-desc">{meal.description}</p>}

      <div className="meal-foot">
        {meal.review === "ok" && <span className="verdict ok">{mine ? t("✅ {name} lo aprobó", { name: partnerName }) : t("✅ Aprobado")}</span>}
        {meal.review === "rejected" && <span className="verdict no">{mine ? t("❌ {name} dice que no cuenta", { name: partnerName }) : t("❌ No cuenta")}</span>}
        {meal.review === null && mine && <span className="verdict wait">{t("👀 Esperando que {name} lo vea", { name: partnerName })}</span>}

        {!mine && meal.review === null && (
          <div className="review-btns">
            <button className="btn btn-small btn-ok" disabled={busy} onClick={() => act(() => api.reviewMeal(meal.id, "ok"), t("Aprobado ✅"))}>{t("✅ Vale")}</button>
            <button className="btn btn-small btn-no" disabled={busy} onClick={() => act(() => api.reviewMeal(meal.id, "rejected"), t("Marcado como que no cuenta"))}>{t("❌ No cuenta")}</button>
          </div>
        )}
        {!mine && meal.review !== null && (
          <button className="link-btn" disabled={busy} onClick={() => act(() => api.reviewMeal(meal.id, meal.review === "ok" ? "rejected" : "ok"), t("Cambiado"))}>
            {t("cambiar")}
          </button>
        )}
        {canDelete && (
          <button className="link-btn danger" disabled={busy} onClick={() => confirm(t("¿Borrar esta comida?")) && act(() => api.deleteMeal(meal), t("Borrada"))}>
            {t("borrar")}
          </button>
        )}
      </div>

      {zoom && meal.photo_url && (
        <div className="lightbox" onClick={() => setZoom(false)}>
          <img src={meal.photo_url} alt={meal.description} />
        </div>
      )}
    </article>
  );
}
