// Los dos personajes grandes del marcador y de la semana. Reaccionan a lo que pasa:
// festejan cuando suman puntos o cumplen el día, el otro te hace 👍 cuando te aprueba la foto,
// y si los tocás hacen un gesto.
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { PiCrownSimpleFill, PiHourglassMediumBold } from "react-icons/pi";
import { Avatar } from "../avatar/Avatar";
import type { AvatarConfig, HandsId } from "../avatar/model";
import { useI18n } from "../i18n";
import { ease } from "../ui";

/** Algo que pasó y que el personaje festeja una sola vez (se recuerda en este dispositivo). */
export interface PlayerEvent {
  key: string;
  gesture: HandsId;
}

const SEEN = "brote-seen-";
function seen(key: string): boolean {
  try {
    return localStorage.getItem(SEEN + key) !== null;
  } catch {
    return true; // sin almacenamiento, mejor no repetir festejos en cada carga
  }
}
function markSeen(key: string) {
  try {
    localStorage.setItem(SEEN + key, "1");
  } catch {
    /* nada */
  }
}

/** Puntos que este dispositivo ya vio de cada uno: si suben, el personaje aplaude. */
function lastPoints(id: string): number | null {
  try {
    const v = localStorage.getItem(`brote-pts-${id}`);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}
function savePoints(id: string, n: number) {
  try {
    localStorage.setItem(`brote-pts-${id}`, String(n));
  } catch {
    /* nada */
  }
}

const POKES: HandsId[] = ["wave", "peace", "thumbs", "point", "raise"];
const GESTURE_MS = 3600;

export function Player({
  id,
  name,
  avatar,
  size = 128,
  mood = "neutral",
  leader = false,
  points,
  events = [],
  index = 0,
  children,
}: {
  id: string;
  name: string;
  avatar: AvatarConfig;
  size?: number;
  mood?: "neutral" | "happy" | "worried";
  leader?: boolean;
  /** Si se pasa, el personaje aplaude cuando los puntos suben desde la última vez que se vieron. */
  points?: number;
  events?: PlayerEvent[];
  index?: number;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  const [gesture, setGesture] = useState<HandsId | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const hop = useAnimationControls();

  const play = useCallback(
    (g: HandsId) => {
      clearTimeout(timer.current);
      setGesture(g);
      void hop.start({ y: [0, -10, 0], transition: { duration: 0.45, ease: "easeOut" } });
      timer.current = setTimeout(() => setGesture(null), GESTURE_MS);
    },
    [hop],
  );
  useEffect(() => () => clearTimeout(timer.current), []);

  // Puntos que subieron → aplauso. La primera vez solo se guarda dónde estamos.
  const [cheerPoints, setCheerPoints] = useState(false);
  useEffect(() => {
    if (points === undefined) return;
    const before = lastPoints(id);
    savePoints(id, points);
    if (before !== null && points > before) setCheerPoints(true);
  }, [id, points]);

  // De a un festejo por vez: cuando termina uno, arranca el siguiente que falte ver.
  const eventsKey = events.map((e) => e.key).join("|");
  useEffect(() => {
    if (gesture) return;
    const next: PlayerEvent | undefined = cheerPoints ? { key: "", gesture: "clap" } : events.find((e) => !seen(e.key));
    if (!next) return;
    const wait = setTimeout(() => {
      if (next.key) markSeen(next.key);
      else setCheerPoints(false);
      play(next.gesture);
    }, 600 + index * 300);
    return () => clearTimeout(wait);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsKey, cheerPoints, gesture, play, index]);

  function poke() {
    const options = POKES.filter((g) => g !== gesture && g !== avatar.hands);
    play(options[Math.floor(Math.random() * options.length)]);
  }

  return (
    <motion.div
      className="player"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease, delay: 0.05 + index * 0.08 }}
    >
      <div className="player-stage">
        <AnimatePresence>
          {leader && (
            <motion.span
              className="player-lead"
              initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 8 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
            >
              <PiCrownSimpleFill aria-hidden />
              {t("Gana")}
            </motion.span>
          )}
        </AnimatePresence>
        <motion.button type="button" className="player-avatar" onClick={poke} animate={hop} whileTap={{ scale: 0.94 }} aria-label={t("Saludar a {name}", { name })}>
          <Avatar config={avatar} size={size} mood={mood} gesture={gesture} title={name} />
        </motion.button>
        <span className="player-floor" style={{ width: size * 0.62 }} aria-hidden />
      </div>
      {children}
    </motion.div>
  );
}

/** Lugar vacío: la pareja todavía no entró a la app. */
export function EmptyPlayer({ size = 128 }: { size?: number }) {
  const { t } = useI18n();
  return (
    <div className="player player-empty">
      <div className="player-stage">
        <span className="player-ghost" style={{ width: size * 0.7, height: size * 0.7 }}>
          <PiHourglassMediumBold aria-hidden />
        </span>
        <span className="player-floor" style={{ width: size * 0.62 }} aria-hidden />
      </div>
      <span className="player-name">{t("Esperando a tu pareja")}</span>
      <span className="player-sub">{t("Todavía no entró")}</span>
    </div>
  );
}
