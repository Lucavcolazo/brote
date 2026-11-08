import { AnimatePresence, motion, useAnimationControls, type TargetAndTransition } from "motion/react";
import { useEffect } from "react";
import type { HandsId } from "./model";

// Manos estilo emoji. Cada mano se arma con formas simples (óvalos y "cápsulas" para los dedos)
// que se dibujan dos veces: primero un poco más gruesas en el color del borde, después en el color
// de la mano. Así el contorno queda solo por fuera, como una sola silueta.
// Coordenadas locales: el centro de la palma en (0,0), los dedos hacia arriba (y negativa).

type Prim =
  | { e: [cx: number, cy: number, rx: number, ry: number, rot?: number] }
  | { l: [x1: number, y1: number, x2: number, y2: number, w: number] };

const O = 1.25; // grosor del borde

function Blob({ prims, fill, line, details }: { prims: Prim[]; fill: string; line: string; details?: string[] }) {
  const draw = (color: string, extra: number) =>
    prims.map((p, i) =>
      "e" in p ? (
        <ellipse
          key={i}
          cx={p.e[0]}
          cy={p.e[1]}
          rx={p.e[2] + extra}
          ry={p.e[3] + extra}
          transform={p.e[4] ? `rotate(${p.e[4]} ${p.e[0]} ${p.e[1]})` : undefined}
          fill={color}
        />
      ) : (
        <line key={i} x1={p.l[0]} y1={p.l[1]} x2={p.l[2]} y2={p.l[3]} stroke={color} strokeWidth={p.l[4] + extra * 2} strokeLinecap="round" />
      ),
    );
  return (
    <g>
      {draw(line, O)}
      {draw(fill, 0)}
      {details?.map((d, i) => (
        <path key={i} d={d} stroke={line} strokeWidth={0.95} strokeLinecap="round" fill="none" opacity={0.55} />
      ))}
    </g>
  );
}

// ---- poses de una mano (derecha, vista de frente) ----
const POSES = {
  // ☝️ puño con el índice para arriba
  point: {
    prims: [{ e: [0.6, 2.4, 6.2, 6.6] }, { l: [-1.8, -1, -1.8, -15.5, 4.6] }, { e: [3.4, -2.2, 2.6, 2.4] }] as Prim[],
    details: ["M0.6 -0.6 Q2.4 0.4 5.6 -0.2", "M0.8 3 Q3 3.8 6.2 3.2", "M-5.2 4.4 Q-1.6 6.6 2.2 4.6"],
  },
  // 👍 puño con el pulgar arriba
  thumbs: {
    prims: [{ e: [1, 2.4, 6.8, 6.2] }, { l: [-3, -1.5, -3.4, -13, 5] }] as Prim[],
    details: ["M1.6 -1.2 H7", "M1.6 2.4 H7.6", "M1.6 6 H7"],
  },
  // ✌️ dos dedos en V
  peace: {
    prims: [{ e: [0.4, 3, 6.2, 6.4] }, { l: [-2.2, -1, -5, -15, 4.3] }, { l: [2.4, -1, 5, -15, 4.3] }] as Prim[],
    details: ["M-5 4.6 Q-1 7 2.8 4.2", "M1.4 0.2 Q4 1 6.4 0.2"],
  },
  // 👋 mano abierta
  open: {
    prims: [
      { e: [0, 2.4, 6.6, 7] },
      { l: [-4.3, -2, -6.4, -11.6, 3.8] },
      { l: [-1.4, -3, -2, -14, 3.9] },
      { l: [1.7, -3, 2.4, -13.4, 3.9] },
      { l: [4.4, -2, 6.4, -10.2, 3.6] },
      { l: [-5.4, 3.6, -11, -0.6, 3.9] },
    ] as Prim[],
    details: ["M-2.6 5 Q0 6.6 2.8 5"],
  },
  // mano tranquila al costado
  rest: {
    prims: [{ e: [0, 0, 5.2, 6.4] }, { l: [-3.6, -0.6, -6.6, -4.4, 3.4] }] as Prim[],
    details: [],
  },
};

type Pose = keyof typeof POSES;

interface HandSpec {
  pose: Pose;
  x: number;
  y: number;
  rot?: number;
  mirror?: boolean;
  scale?: number;
  // Los orígenes de giro van en coordenadas del SVG (transformBox "view-box"), no relativos a cada forma.
  /** El movimiento en loop (solo con el avatar "vivo"). */
  loop?: TargetAndTransition;
}

const S = 1.45; // las manos de los emojis son grandes: casi media cara

/** Dónde va cada mano y cómo se mueve, por gesto. */
function layout(id: HandsId): HandSpec[] {
  switch (id) {
    case "point":
      return [
        {
          pose: "point", x: 85, y: 71, rot: 6,
          loop: { y: [0, -3, 0, -3, 0], rotate: [6, 0, 6, 0, 6], transition: { duration: 1.3, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" } },
        },
      ];
    case "thumbs":
      return [
        {
          pose: "thumbs", x: 85, y: 72,
          loop: { rotate: [0, -14, 0], y: [0, -3, 0], scale: [S, S * 1.1, S], transition: { duration: 0.7, repeat: Infinity, repeatDelay: 1.6, ease: "easeOut" } },
        },
      ];
    case "peace":
      return [
        {
          pose: "peace", x: 85, y: 71, rot: 4,
          loop: { rotate: [-4, 10, -4], transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } },
        },
      ];
    case "wave":
      return [
        {
          pose: "open", x: 85, y: 64, rot: 8, scale: 1.38,
          loop: { rotate: [8, 26, -6, 26, 8], transition: { duration: 1.2, repeat: Infinity, repeatDelay: 0.9, ease: "easeInOut" } },
        },
      ];
    case "clap":
      return [
        { pose: "open", x: 37, y: 88, rot: 32, mirror: true, scale: 1.15, loop: { x: [0, 5, 0, 5, 0], transition: { duration: 0.8, repeat: Infinity, repeatDelay: 1.2 } } },
        { pose: "open", x: 63, y: 88, rot: -32, scale: 1.15, loop: { x: [0, -5, 0, -5, 0], transition: { duration: 0.8, repeat: Infinity, repeatDelay: 1.2 } } },
      ];
    case "raise":
      return [
        { pose: "open", x: 14, y: 44, rot: -16, mirror: true, scale: 1.25, loop: { rotate: [-16, -6, -16], y: [0, -2, 0], transition: { duration: 0.45, repeat: Infinity, repeatType: "mirror" } } },
        { pose: "open", x: 86, y: 44, rot: 16, scale: 1.25, loop: { rotate: [16, 6, 16], y: [0, -2, 0], transition: { duration: 0.45, repeat: Infinity, repeatType: "mirror", delay: 0.12 } } },
      ];
    case "rest":
      return [
        { pose: "rest", x: 15, y: 75, rot: 24, mirror: true, scale: 1.25, loop: { y: [0, -1.4, 0], transition: { duration: 3.6, repeat: Infinity, ease: "easeInOut" } } },
        { pose: "rest", x: 85, y: 75, rot: -24, scale: 1.25, loop: { y: [0, -1.4, 0], transition: { duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.3 } } },
      ];
    default:
      return [];
  }
}

export function Hands({ id, fill, line, alive }: { id: HandsId; fill: string; line: string; alive: boolean }) {
  const hands = layout(id);
  return (
    <AnimatePresence initial={false} mode="popLayout">
      {hands.length > 0 && (
        <motion.g
          key={id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
        >
          {hands.map((h, i) => (
            <Hand key={i} spec={h} fill={fill} line={line} alive={alive} />
          ))}
        </motion.g>
      )}
    </AnimatePresence>
  );
}

function Hand({ spec: h, fill, line, alive }: { spec: HandSpec; fill: string; line: string; alive: boolean }) {
  const scale = h.scale ?? S;
  const rest = { rotate: h.rot ?? 0, scale, x: 0, y: 0 };
  const controls = useAnimationControls();
  const loopKey = JSON.stringify(h.loop);

  // El loop se arranca a mano (no con `animate`): dentro de un AnimatePresence con initial={false}
  // Motion saltea las animaciones del primer render, y el loop nunca empezaría.
  useEffect(() => {
    controls.set({ ...rest, scale: scale * 0.4 });
    void controls.start({ scale, transition: { type: "spring", stiffness: 420, damping: 16 } }).then(() => {
      if (alive && h.loop) void controls.start({ ...h.loop, scale: h.loop.scale ?? scale });
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alive, loopKey, scale]);

  const pose = POSES[h.pose];
  return (
    // La posición va en un <g> fijo; el movimiento, en uno de adentro, que gira desde la muñeca.
    <g transform={`translate(${h.x} ${h.y})`}>
      <motion.g initial={false} animate={controls} style={{ ...rest, originX: "0px", originY: "7px", transformBox: "view-box" }}>
        <g transform={h.mirror ? "scale(-1 1)" : undefined}>
          <Blob prims={pose.prims} details={pose.details} fill={fill} line={line} />
        </g>
      </motion.g>
    </g>
  );
}
