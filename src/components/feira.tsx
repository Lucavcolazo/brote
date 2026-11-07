// Las piezas del mundo Feira: el toldo a rayas, el cartel de precio que cuelga y los números que ruedan.
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { PiCrownSimpleFill, PiFireFill } from "react-icons/pi";
import { Avatar } from "../avatar/Avatar";
import type { AvatarConfig } from "../avatar/model";
import { COLOR_HEX } from "../avatar/model";
import { useI18n } from "../i18n";
import { ease } from "../ui";

/** Toldo a rayas con borde festoneado, en el color del jugador. Se desenrolla una vez al aparecer. */
export function Awning({ color, delay = 0 }: { color: string; delay?: number }) {
  const id = useId();
  const reduce = useReducedMotion();
  const W = 168, H = 62, stripe = 14, n = W / stripe, scallop = stripe / 2, base = H - scallop;
  let edge = `M0,0 H${W} V${base}`;
  for (let i = n; i > 0; i--) edge += ` A${scallop},${scallop} 0 0 1 ${(i - 1) * stripe},${base}`;
  edge += " Z";
  return (
    <motion.svg
      className="awning"
      viewBox={`0 -4 ${W} ${H + 4}`}
      aria-hidden
      initial={reduce ? false : { scaleY: 0.05, opacity: 0.4 }}
      animate={{ scaleY: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 170, damping: 17, delay }}
    >
      <defs>
        <clipPath id={id}>
          <path d={edge} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect x="0" y="0" width={W} height={H} fill="#fff" />
        {Array.from({ length: n }, (_, i) =>
          i % 2 === 0 ? <rect key={i} x={i * stripe} y="0" width={stripe} height={H} fill={color} /> : null,
        )}
        <rect x="0" y="0" width={W} height="10" fill="#1e1b16" opacity="0.08" />
      </g>
      <rect x="-3" y="-4" width={W + 6} height="6" rx="3" fill="#1e1b16" />
    </motion.svg>
  );
}

/** Número que rueda (sube o baja) cuando cambia. */
export function RollingNumber({ value, className }: { value: number; className?: string }) {
  const prev = useRef(value);
  const dir = value >= prev.current ? 1 : -1;
  useEffect(() => {
    prev.current = value;
  }, [value]);
  return (
    <span className={`digits num ${className ?? ""}`}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.span
          key={value}
          className="roll"
          custom={dir}
          variants={{
            enter: (d: number) => ({ y: d > 0 ? "100%" : "-100%", opacity: 0 }),
            center: { y: "0%", opacity: 1 },
            exit: (d: number) => ({ y: d > 0 ? "-100%" : "100%", opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Cartel de precio fluo colgado de dos hilos. Se balancea cuando cambian los puntos. */
export function Placard({ points, streak, swingKey }: { points: number; streak: number; swingKey?: unknown }) {
  const { t } = useI18n();
  const controls = useAnimationControls();
  const reduce = useReducedMotion();
  const first = useRef(true);

  useEffect(() => {
    if (reduce) return;
    const amp = first.current ? 7 : 11;
    first.current = false;
    controls.start({
      rotate: [amp, -amp * 0.6, amp * 0.32, -amp * 0.14, 0],
      transition: { duration: 1.5, ease: "easeOut", times: [0, 0.25, 0.5, 0.75, 1] },
    });
  }, [points, swingKey, controls, reduce]);

  return (
    <motion.div className="placard-wrap" animate={controls}>
      <div className="placard">
        <span className="placard-num">
          <RollingNumber value={points} />
          <span className="unit">{t("pts")}</span>
        </span>
        <span className="placard-streak">
          <PiFireFill aria-hidden />
          {t("Racha {n}", { n: streak })}
        </span>
      </div>
    </motion.div>
  );
}

export interface StallPlayer {
  id: string;
  name: string;
  avatar: AvatarConfig;
  points: number;
  streak: number;
  doneToday: boolean;
}

/** Un puesto: toldo, avatar, nombre y cartel. */
export function Stall({ p, leader, isMe, index }: { p: StallPlayer; leader: boolean; isMe: boolean; index: number }) {
  const { t } = useI18n();
  return (
    <div className={`stall ${leader ? "leader" : ""}`}>
      <Awning color={COLOR_HEX[p.avatar.color]} delay={index * 0.08} />
      <motion.div
        className="stall-face"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease, delay: 0.15 + index * 0.08 }}
      >
        <Avatar config={p.avatar} size={64} mood={p.doneToday ? "happy" : "neutral"} title={p.name} />
        <span className="stall-name">{isMe ? t("Vos") : p.name}</span>
      </motion.div>
      <div style={{ position: "relative" }}>
        <Placard points={p.points} streak={p.streak} />
          <AnimatePresence>
          {leader && (
            <motion.span
              className="stall-lead"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 500, damping: 26 }}
            >
              <PiCrownSimpleFill aria-hidden />
              {t("Gana")}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
