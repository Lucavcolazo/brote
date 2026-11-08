// Las piezas del mundo Feira: el toldo a rayas (entrada) y los números que ruedan.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef } from "react";

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
