import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import {
  COLOR_HEX,
  bodyPath,
  featureColor,
  lerpRadii,
  radii,
  topY,
  type AvatarConfig,
  type EyesId,
  type MouthId,
} from "./model";

const SPRING = { type: "spring", stiffness: 260, damping: 24, mass: 0.9 } as const;
const SWAP = { type: "spring", stiffness: 420, damping: 30 } as const;

interface Props {
  config: AvatarConfig;
  size?: number;
  /** "alive" = parpadea y mira; "still" = quieto (listas, marcadores chicos) */
  mode?: "alive" | "still";
  mood?: "neutral" | "happy" | "sad";
  title?: string;
}

export function Avatar({ config, size = 48, mode = "alive", mood = "neutral", title }: Props) {
  const reduce = useReducedMotion();
  const alive = mode === "alive" && !reduce;
  const clipId = useId();

  // ---- morph del cuerpo ----
  const from = useRef(radii(config.shape));
  const to = useRef(radii(config.shape));
  const progress = useMotionValue(1);
  const d = useTransform(progress, (p) => bodyPath(lerpRadii(from.current, to.current, p)));

  useEffect(() => {
    const next = radii(config.shape);
    if (next === to.current) return;
    from.current = lerpRadii(from.current, to.current, progress.get());
    to.current = next;
    progress.set(0);
    const c = animate(progress, 1, reduce ? { duration: 0 } : SPRING);
    return () => c.stop();
  }, [config.shape, progress, reduce]);

  // ---- vida: parpadeo y mirada ----
  const [blink, setBlink] = useState(false);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!alive) return;
    let t1: ReturnType<typeof setTimeout>, t2: ReturnType<typeof setTimeout>;
    const loopBlink = () => {
      t1 = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        loopBlink();
      }, 2200 + Math.random() * 3400);
    };
    const loopGaze = () => {
      t2 = setTimeout(() => {
        setGaze(Math.random() < 0.4 ? { x: 0, y: 0 } : { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 2.4 });
        loopGaze();
      }, 1600 + Math.random() * 2600);
    };
    loopBlink();
    loopGaze();
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [alive]);

  const fill = COLOR_HEX[config.color];
  const ink = featureColor(config.color);
  const top = topY(config.shape);
  const eyes = mood === "happy" && config.eyes !== "wink" ? "happy" : config.eyes;
  const mouth = mood === "sad" ? "flat" : config.mouth;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      style={{ display: "block", overflow: "visible", flex: "none" }}
    >
      {title && <title>{title}</title>}
      <motion.g
        animate={alive ? { scaleY: [1, 1.018, 1], scaleX: [1, 0.992, 1] } : undefined}
        transition={alive ? { duration: 3.6, repeat: Infinity, ease: "easeInOut" } : undefined}
        style={{ originX: "50px", originY: "88px" }}
      >
        <motion.path d={d} fill={fill} animate={{ fill }} transition={{ duration: 0.35 }} />
        <clipPath id={clipId}>
          <motion.path d={d} />
        </clipPath>

        {/* accesorio de arriba */}
        <AnimatePresence initial={false}>
          {config.extra !== "none" && (
            <motion.g
              key={config.extra}
              initial={{ opacity: 0, y: -8, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.7 }}
              transition={SWAP}
              style={{ originX: "50px", originY: `${top}px` }}
            >
              <Extra id={config.extra} top={top} fill={fill} />
            </motion.g>
          )}
        </AnimatePresence>

        {/* cachetes */}
        <AnimatePresence initial={false}>
          {config.cheeks && (
            <motion.g key="cheeks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} clipPath={`url(#${clipId})`}>
              <ellipse cx="31" cy="62" rx="6" ry="3.6" fill="#FF8FA3" opacity={0.75} />
              <ellipse cx="69" cy="62" rx="6" ry="3.6" fill="#FF8FA3" opacity={0.75} />
            </motion.g>
          )}
        </AnimatePresence>

        {/* ojos */}
        <motion.g animate={{ x: gaze.x, y: gaze.y }} transition={{ type: "spring", stiffness: 120, damping: 16 }}>
          <motion.g
            animate={{ scaleY: blink && eyes !== "happy" ? 0.1 : 1 }}
            transition={{ duration: 0.07 }}
            style={{ originX: "50px", originY: "48px" }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.g
                key={eyes}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={SWAP}
                style={{ originX: "50px", originY: "48px" }}
              >
                <Eyes id={eyes} ink={ink} />
              </motion.g>
            </AnimatePresence>
          </motion.g>
        </motion.g>

        {/* boca */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.g
            key={mouth}
            initial={{ opacity: 0, scaleX: 0.3 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0.3 }}
            transition={SWAP}
            style={{ originX: "50px", originY: "64px" }}
          >
            <Mouth id={mouth} ink={ink} body={fill} />
          </motion.g>
        </AnimatePresence>
      </motion.g>
    </svg>
  );
}

function Eyes({ id, ink }: { id: EyesId; ink: string }) {
  const s = { stroke: ink, strokeWidth: 3.4, strokeLinecap: "round" as const, fill: "none" };
  switch (id) {
    case "dots":
      return (
        <>
          <circle cx="39" cy="48" r="3.6" fill={ink} />
          <circle cx="61" cy="48" r="3.6" fill={ink} />
        </>
      );
    case "big":
      return (
        <>
          <ellipse cx="39" cy="47" rx="5.4" ry="7" fill={ink} />
          <ellipse cx="61" cy="47" rx="5.4" ry="7" fill={ink} />
          <circle cx="41" cy="44.4" r="1.9" fill="#fff" />
          <circle cx="63" cy="44.4" r="1.9" fill="#fff" />
        </>
      );
    case "happy":
      return (
        <>
          <path d="M33.5 50 Q39 43 44.5 50" {...s} />
          <path d="M55.5 50 Q61 43 66.5 50" {...s} />
        </>
      );
    case "sleepy":
      return (
        <>
          <path d="M33.5 47 Q39 52 44.5 47" {...s} />
          <path d="M55.5 47 Q61 52 66.5 47" {...s} />
        </>
      );
    case "wink":
      return (
        <>
          <circle cx="39" cy="48" r="3.8" fill={ink} />
          <path d="M55.5 49 Q61 44 66.5 49" {...s} />
        </>
      );
    case "side":
      return (
        <>
          <ellipse cx="39" cy="48" rx="5.6" ry="5" fill="#fff" />
          <ellipse cx="61" cy="48" rx="5.6" ry="5" fill="#fff" />
          <circle cx="42" cy="48.5" r="2.8" fill="#2A2622" />
          <circle cx="64" cy="48.5" r="2.8" fill="#2A2622" />
        </>
      );
    case "focused":
      return (
        <>
          <circle cx="39" cy="49" r="3.4" fill={ink} />
          <circle cx="61" cy="49" r="3.4" fill={ink} />
          <path d="M32.5 40.5 L44.5 43" {...s} strokeWidth={3} />
          <path d="M67.5 40.5 L55.5 43" {...s} strokeWidth={3} />
        </>
      );
    case "wide":
      return (
        <>
          <circle cx="38.5" cy="47.5" r="6.4" fill="#fff" />
          <circle cx="61.5" cy="47.5" r="6.4" fill="#fff" />
          <circle cx="38.5" cy="48" r="3" fill="#2A2622" />
          <circle cx="61.5" cy="48" r="3" fill="#2A2622" />
        </>
      );
  }
}

function Mouth({ id, ink, body }: { id: MouthId; ink: string; body: string }) {
  const s = { stroke: ink, strokeWidth: 3.2, strokeLinecap: "round" as const, fill: "none" };
  switch (id) {
    case "smile":
      return <path d="M42 61 Q50 68 58 61" {...s} />;
    case "grin":
      return <path d="M40.5 60 Q50 60 59.5 60 Q58 71 50 71 Q42 71 40.5 60 Z" fill={ink} />;
    case "flat":
      return <path d="M43.5 64 L56.5 64" {...s} />;
    case "oh":
      return <ellipse cx="50" cy="64" rx="3.8" ry="4.6" fill={ink} />;
    case "smirk":
      return <path d="M43 63.5 Q51 65 57.5 59.5" {...s} />;
    case "tongue":
      return (
        <>
          <path d="M41.5 60.5 Q50 67 58.5 60.5" {...s} />
          <path d="M47 64.6 Q47 71 51.2 71 Q55 71 54.6 64.4" fill="#FF6F8A" stroke={ink} strokeWidth={2.2} />
        </>
      );
    case "teeth":
      return (
        <>
          <rect x="41" y="59" width="18" height="9" rx="4.5" fill={ink} />
          <rect x="43.5" y="59" width="13" height="4" rx="1.5" fill={body === "#FFFFFF" ? "#eee" : "#fff"} />
        </>
      );
  }
}

function Extra({ id, top, fill }: { id: AvatarConfig["extra"]; top: number; fill: string }) {
  const ink = "#2A2622";
  switch (id) {
    case "sprout":
      return (
        <g>
          <path d={`M50 ${top + 3} Q50 ${top - 6} 50 ${top - 10}`} stroke="#2F9E57" strokeWidth={3} strokeLinecap="round" fill="none" />
          <path d={`M50 ${top - 9} Q40 ${top - 20} 33 ${top - 12} Q41 ${top - 5} 50 ${top - 9} Z`} fill="#2F9E57" />
          <path d={`M50 ${top - 10} Q61 ${top - 23} 69 ${top - 15} Q60 ${top - 6} 50 ${top - 10} Z`} fill="#55C27A" />
        </g>
      );
    case "glasses":
      return (
        <g stroke={ink} strokeWidth={2.6} fill="none">
          <circle cx="39" cy="48" r="8.2" fill="#ffffff33" />
          <circle cx="61" cy="48" r="8.2" fill="#ffffff33" />
          <path d="M47.2 47 Q50 45 52.8 47" />
        </g>
      );
    case "cap":
      return (
        <g>
          <path d={`M27 ${top + 13} Q29 ${top - 8} 50 ${top - 9} Q71 ${top - 8} 73 ${top + 13} Z`} fill={ink} />
          <path d={`M60 ${top + 12} Q78 ${top + 9} 88 ${top + 15} Q76 ${top + 18} 62 ${top + 16} Z`} fill={ink} />
          <circle cx="50" cy={top - 8.5} r="2.6" fill={fill} />
        </g>
      );
    case "headband":
      return <path d={`M21 ${top + 15} Q50 ${top + 1} 79 ${top + 15}`} stroke="#fff" strokeWidth={6.5} strokeLinecap="round" fill="none" opacity={0.95} />;
    case "bow":
      return (
        <g transform={`translate(66 ${top + 6}) rotate(18)`}>
          <path d="M0 0 L-11 -7 Q-13 0 -11 7 Z" fill="#FF6F8A" />
          <path d="M0 0 L11 -7 Q13 0 11 7 Z" fill="#FF6F8A" />
          <circle r="3.2" fill="#E14E6E" />
        </g>
      );
    default:
      return null;
  }
}
