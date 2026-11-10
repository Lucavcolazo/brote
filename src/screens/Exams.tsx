import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import { PiCheckBold, PiClockBold, PiExamBold, PiEyeBold, PiPlusBold, PiXBold } from "react-icons/pi";
import { api, type Exam, type Profile } from "../api";
import type { Ctx } from "../App";
import { Avatar } from "../avatar/Avatar";
import { COLOR_HEX } from "../avatar/model";
import { Valance } from "../components/Valance";
import { avatarOf } from "../config";
import { useI18n } from "../i18n";
import { canReview, localToday, timeAgo } from "../lib/dates";
import { Sheet, ease, errMsg, press, spring, useToast } from "../ui";

/** Desde esta nota se aprueba (igual que private.exam_pass_grade() en la base). */
export const PASS_GRADE = 6;

export function fmtGrade(n: number, locale: string): string {
  return n.toLocaleString(locale, { maximumFractionDigits: 1 });
}

/** "7,5" o "7.5" → 7.5. null si no es una nota de 0 a 10. */
function parseGrade(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!/^\d{1,2}(\.\d)?$/.test(s)) return null;
  const n = Number(s);
  return n >= 0 && n <= 10 ? n : null;
}

export function Exams({ ctx }: { ctx: Ctx }) {
  const { t, locale } = useI18n();
  const { me, data } = ctx;
  const [adding, setAdding] = useState(false);
  const partnerName = me.partner?.name ?? "";
  const people = [me.profile, me.partner].filter(Boolean) as Profile[];

  const toReview = data.exams.filter((e) => e.user_id !== me.userId && e.review === null && canReview(e.local_date));
  const rest = data.exams.filter((e) => !toReview.includes(e));

  return (
    <>
      <header className="page-head">
        <h1 className="title">{t("Notas")}</h1>
      </header>
      <Valance color={COLOR_HEX[avatarOf(me.profile).color]} />

      <section className="exam-stats" aria-label={t("Promedios")}>
        {people.map((p, i) => {
          const counted = data.exams.filter((e) => e.user_id === p.id && e.review !== "rejected");
          const avg = counted.length ? counted.reduce((s, e) => s + e.grade, 0) / counted.length : null;
          const passed = counted.filter((e) => e.grade >= PASS_GRADE).length;
          return (
            <motion.div
              key={p.id}
              className="exam-stat"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: i * 0.06 }}
            >
              <div className="exam-stat-who">
                <Avatar config={avatarOf(p)} size={34} mode="still" title={p.name} />
                <b>{p.id === me.userId ? t("Vos") : p.name}</b>
              </div>
              <span className="exam-stat-avg num">{avg === null ? "–" : fmtGrade(Math.round(avg * 10) / 10, locale)}</span>
              <span className="exam-stat-sub">
                {counted.length === 0
                  ? t("Sin notas")
                  : t("{ok} de {n} aprobadas", { ok: passed, n: counted.length })}
              </span>
            </motion.div>
          );
        })}
      </section>

      <div className="block">
        <p className="section-note" style={{ margin: "0 0 12px" }}>
          {me.partner
            ? t("6 o más: +1 punto para vos. Menos de 6: +1 para {name}.", { name: partnerName })
            : t("6 o más: +1 punto para vos. Menos de 6: +1 para tu pareja.")}
        </p>
        <motion.button className="btn btn-ink btn-block" onClick={() => setAdding(true)} whileTap={press}>
          <PiPlusBold aria-hidden />
          {t("Cargar nota")}
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {toReview.length > 0 && (
          <motion.section
            key="review"
            className="block"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease }}
          >
            <h2 className="section-title">{t("Para revisar")}</h2>
            <div className="exams">
              <AnimatePresence initial={false}>
                {toReview.map((e) => (
                  <ExamCard key={e.id} exam={e} ctx={ctx} />
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="block">
        <h2 className="section-title">{t("Todas las notas")}</h2>
        {rest.length === 0 ? (
          <div className="empty" style={{ margin: 0 }}>
            <PiExamBold aria-hidden style={{ width: 34, height: 34 }} />
            <b>{t("Todavía no hay notas")}</b>
            <p>{t("Cuando rindas un examen, cargá la nota acá.")}</p>
          </div>
        ) : (
          <div className="exams">
            <AnimatePresence initial={false}>
              {rest.map((e) => (
                <ExamCard key={e.id} exam={e} ctx={ctx} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      <NewExamSheet open={adding} onClose={() => setAdding(false)} ctx={ctx} />
    </>
  );
}

function ExamCard({ exam, ctx }: { exam: Exam; ctx: Ctx }) {
  const { t, locale } = useI18n();
  const { me, reload } = ctx;
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const mine = exam.user_id === me.userId;
  const partnerName = me.partner?.name ?? "";
  const pass = exam.grade >= PASS_GRADE;
  const open = canReview(exam.local_date);
  // Si vale, el punto es de quien la sacó (6 o más) o de su pareja (menos de 6).
  const winnerIsMe = pass === mine;
  const autoHint = exam.local_date === localToday() ? t("Si no se revisa, mañana a las 8:00 se aprueba sola.") : t("Si no se revisa antes de las 8:00, se aprueba sola.");

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
      className={`exam ${exam.review === "rejected" ? "rejected" : ""}`}
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, ease }}
    >
      <div className="exam-top">
        <span className={`grade-tag ${pass ? "pass" : "fail"}`}>
          <b className="num">{fmtGrade(exam.grade, locale)}</b>
        </span>
        <div className="exam-main">
          <b>{exam.subject}</b>
          <span>
            {mine ? t("Vos") : partnerName} · {timeAgo(exam.created_at, t)}
          </span>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {exam.review && (
            <motion.span
              key={exam.review}
              className={`exam-verdict ${exam.review === "ok" ? "ok" : "no"}`}
              initial={{ scale: 1.8, rotate: -14, opacity: 0 }}
              animate={{ scale: 1, rotate: -6, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 22 }}
            >
              {exam.review === "ok" ? <PiCheckBold aria-hidden /> : <PiXBold aria-hidden />}
              {exam.review === "ok" ? t("Vale") : t("No cuenta")}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {!mine && exam.review === null && open ? (
        <>
          <div className="post-actions">
            <motion.button className="btn btn-sm btn-vale" disabled={busy} whileTap={press} onClick={() => act(() => api.reviewExam(exam.id, "ok"), t("Aprobada"))}>
              <PiCheckBold aria-hidden />
              {t("Vale")}
            </motion.button>
            <motion.button className="btn btn-sm btn-no" disabled={busy} whileTap={press} onClick={() => act(() => api.reviewExam(exam.id, "rejected"), t("Marcada: no cuenta"))}>
              <PiXBold aria-hidden />
              {t("No cuenta")}
            </motion.button>
          </div>
          <p className="post-hint">
            <PiClockBold aria-hidden />
            {pass ? t("Si vale, +1 punto para {name}.", { name: partnerName }) : t("Si vale, +1 punto para vos.")}
          </p>
        </>
      ) : (
        <div className="post-actions">
          {exam.review === null && (
            <span className="post-status">
              <PiEyeBold aria-hidden />
              <span>
                {t("Esperando a {name}", { name: partnerName })}
                <small>{autoHint}</small>
              </span>
            </span>
          )}
          {exam.review === "ok" && (
            <span className={`exam-point ${winnerIsMe ? "plus" : "minus"}`}>
              {winnerIsMe ? t("+1 punto para vos") : t("+1 punto para {name}", { name: partnerName })}
              {exam.review_auto && <small>{t("Se aprobó sola")}</small>}
            </span>
          )}
          {exam.review === "rejected" && <span className="post-status">{t("No suma puntos")}</span>}
          <span className="post-tools">
            {!mine && exam.review !== null && open && (
              <button className="link" disabled={busy} onClick={() => act(() => api.reviewExam(exam.id, exam.review === "ok" ? "rejected" : "ok"), t("Cambiado"))}>
                {t("Cambiar")}
              </button>
            )}
            {mine && exam.review !== "ok" && (
              <button className="link danger" disabled={busy} onClick={() => confirm(t("¿Borrar esta nota?")) && act(() => api.deleteExam(exam.id), t("Borrada"))}>
                {t("Borrar")}
              </button>
            )}
          </span>
        </div>
      )}
    </motion.article>
  );
}

function NewExamSheet({ open, onClose, ctx }: { open: boolean; onClose: () => void; ctx: Ctx }) {
  const { t } = useI18n();
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const grade = parseGrade(raw);
  const partnerName = ctx.me.partner?.name ?? "";

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      setSubject("");
      setRaw("");
    }, 300);
    return () => clearTimeout(timer);
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (grade === null || !subject.trim()) return;
    setBusy(true);
    try {
      await api.addExam({ subject: subject.trim(), grade });
      toast(t("Nota cargada"));
      onClose();
      await ctx.reload();
    } catch (err) {
      toast(errMsg(err, t), "error");
    } finally {
      setBusy(false);
    }
  }

  const outcome = grade === null ? null : grade >= PASS_GRADE ? "pass" : "fail";

  return (
    <Sheet open={open} onClose={onClose} title={t("¿Cuánto te sacaste?")}>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span>{t("Materia")}</span>
          <input className="input" required maxLength={60} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("Ej: Análisis Matemático")} />
        </label>

        <label className="field">
          <span>{t("Nota")}</span>
          <input
            className={`input grade-input ${outcome ?? ""}`}
            inputMode="decimal"
            autoComplete="off"
            value={raw}
            maxLength={4}
            onChange={(e) => setRaw(e.target.value.replace(/[^\d.,]/g, ""))}
            placeholder="0 – 10"
            aria-invalid={raw !== "" && grade === null}
          />
        </label>

        <div className="grade-outcome" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {outcome ? (
              <motion.span
                key={outcome}
                className={`exam-point ${outcome === "pass" ? "plus" : "minus"}`}
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={spring}
              >
                {outcome === "pass"
                  ? t("Si {name} la aprueba: +1 punto para vos", { name: partnerName || t("tu pareja") })
                  : t("Si {name} la aprueba: +1 punto para {name}", { name: partnerName || t("tu pareja") })}
              </motion.span>
            ) : raw !== "" ? (
              <motion.span key="bad" className="muted small" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {t("La nota va de 0 a 10")}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>

        <motion.button className="btn btn-ink btn-block" disabled={busy || grade === null || !subject.trim()} whileTap={press}>
          <PiExamBold aria-hidden />
          {busy ? t("Guardando…") : t("Cargar nota")}
        </motion.button>
      </form>
    </Sheet>
  );
}
