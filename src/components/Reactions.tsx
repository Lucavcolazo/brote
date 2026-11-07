import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PiSmileyBold } from "react-icons/pi";
import { api, type Meal, type MealReaction, type Profile } from "../api";
import { Avatar } from "../avatar/Avatar";
import { avatarOf } from "../config";
import { useI18n } from "../i18n";
import { errMsg, press, spring, useToast } from "../ui";

/** Las reacciones que se pueden dejar en una foto. Doble toque en la foto deja la primera. */
export const REACTIONS = ["❤️", "🤤", "💪", "👏", "😂", "🤢"] as const;
export const QUICK_REACTION = REACTIONS[0];

/** Estado de reacciones de una foto con cambios optimistas (se ve al instante, se corrige si falla). */
export function useReactions(meal: Meal, userId: string) {
  const { t } = useI18n();
  const toast = useToast();
  const [list, setList] = useState<MealReaction[]>(meal.reactions);
  const pending = useRef(0);
  const serverKey = JSON.stringify(meal.reactions);

  // Lo que llega del servidor manda, salvo que haya un cambio mío en vuelo.
  useEffect(() => {
    if (pending.current === 0) setList(meal.reactions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  const mine = list.find((r) => r.user_id === userId)?.emoji ?? null;

  const react = useCallback(
    async (emoji: string | null) => {
      const prev = list;
      const next = emoji === null || emoji === mine ? null : emoji;
      const others = list.filter((r) => r.user_id !== userId);
      setList(next ? [...others, { user_id: userId, emoji: next }] : others);
      pending.current++;
      try {
        await api.reactMeal(meal.id, next);
      } catch (e) {
        setList(prev);
        toast(errMsg(e, t), "error");
      } finally {
        pending.current--;
      }
    },
    [list, mine, meal.id, userId, t, toast],
  );

  return { list, mine, react };
}

type People = { me: Profile; partner: Profile | null };

export function ReactionBar({
  list,
  mine,
  react,
  people,
}: {
  list: MealReaction[];
  mine: string | null;
  react: (emoji: string | null) => void;
  people: People;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  const who = (uid: string) => (uid === people.me.id ? people.me : people.partner);

  return (
    <div className="rx" ref={wrap}>
      <ul className="rx-list" aria-label={t("Reacciones")}>
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((r) => {
            const p = who(r.user_id);
            const isMine = r.user_id === people.me.id;
            const body = (
              <>
                <Avatar config={avatarOf(p)} size={22} mode="still" title={p?.name} />
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={r.emoji}
                    className="rx-emoji"
                    initial={{ scale: 0.3, rotate: -25, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0.3, opacity: 0, transition: { duration: 0.12 } }}
                    transition={{ type: "spring", stiffness: 600, damping: 18 }}
                  >
                    {r.emoji}
                  </motion.span>
                </AnimatePresence>
              </>
            );
            return (
              <motion.li
                key={r.user_id}
                layout
                initial={{ opacity: 0, scale: 0.6, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
                transition={spring}
              >
                {isMine ? (
                  <motion.button type="button" className="rx-chip mine" onClick={() => react(null)} whileTap={press} aria-label={t("Sacar tu reacción")}>
                    {body}
                  </motion.button>
                ) : (
                  <span className="rx-chip">{body}</span>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <motion.button
        type="button"
        className={`rx-add ${open ? "on" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t("Reaccionar")}
        whileTap={{ scale: 0.88 }}
        transition={spring}
      >
        <PiSmileyBold aria-hidden />
        {!mine && <span>{t("Reaccionar")}</span>}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="rx-palette"
            role="group"
            aria-label={t("Elegí una reacción")}
            initial={{ opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 6, transition: { duration: 0.14 } }}
            transition={{ type: "spring", stiffness: 520, damping: 30 }}
          >
            {REACTIONS.map((e, i) => (
              <motion.button
                key={e}
                type="button"
                className={`rx-option ${mine === e ? "on" : ""}`}
                aria-pressed={mine === e}
                initial={{ opacity: 0, y: 12, scale: 0.4 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 560, damping: 20, delay: 0.03 + i * 0.03 }}
                whileHover={{ scale: 1.25, y: -4 }}
                whileTap={{ scale: 0.8 }}
                onClick={() => {
                  react(e);
                  setOpen(false);
                }}
              >
                {e}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** El emoji grande que salta sobre la foto con el doble toque. */
export function ReactionBurst({ emoji, burstKey }: { emoji: string; burstKey: number }) {
  return (
    <AnimatePresence>
      {burstKey > 0 && (
        <motion.span
          key={burstKey}
          className="rx-burst"
          aria-hidden
          initial={{ scale: 0, opacity: 0, rotate: -12 }}
          animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 1], rotate: [-12, 6, 0] }}
          exit={{ scale: 1.4, opacity: 0, y: -30, transition: { duration: 0.35 } }}
          transition={{ duration: 0.5, times: [0, 0.6, 1], ease: "easeOut" }}
        >
          {emoji}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
