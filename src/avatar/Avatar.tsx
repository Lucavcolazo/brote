import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Hands } from "./Hands";
import {
  COLOR_HEX,
  accentFor,
  bodyPath,
  featureColor,
  shade,
  lerpRadii,
  radii,
  topY,
  type AvatarConfig,
  type EyesId,
  type FaceId,
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
  /** Mostrar las manos. Por defecto solo cuando el avatar es lo bastante grande para que se lean. */
  hands?: boolean;
}

export function Avatar({ config, size = 48, mode = "alive", mood = "neutral", title, hands = size >= 34 }: Props) {
  const reduce = useReducedMotion();
  const alive = mode === "alive" && !reduce;
  const uid = useId();
  const clipId = `${uid}-clip`;
  const shadeId = `${uid}-shade`;

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
  const handFill = shade(fill, config.color === "ink" ? 0.2 : 0.1);
  const handLine = shade(fill, config.color === "ink" ? -0.6 : -0.38);

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
        style={{ originX: "50px", originY: "88px", transformBox: "view-box" }}
      >
        <motion.path d={d} fill={fill} animate={{ fill }} transition={{ duration: 0.35 }} />
        <clipPath id={clipId}>
          <motion.path d={d} />
        </clipPath>
        {/* volumen: luz arriba a la izquierda, sombra suave abajo */}
        <radialGradient id={shadeId} cx="36%" cy="30%" r="78%">
          <stop offset="0" stopColor="#fff" stopOpacity={0.3} />
          <stop offset="0.42" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.74" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.16} />
        </radialGradient>
        <g clipPath={`url(#${clipId})`} pointerEvents="none">
          <rect x="0" y="0" width="100" height="100" fill={`url(#${shadeId})`} />
          <ellipse cx="33" cy="31" rx="7" ry="3.6" transform="rotate(-32 33 31)" fill="#fff" opacity={0.32} />
        </g>

        {/* accesorio de arriba */}
        <AnimatePresence initial={false}>
          {config.extra !== "none" && (
            <motion.g
              key={config.extra}
              initial={{ opacity: 0, y: -8, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.7 }}
              transition={SWAP}
              style={{ originX: "50px", originY: `${top}px`, transformBox: "view-box" }}
            >
              <Extra id={config.extra} top={top} fill={fill} accent={accentFor(config.color)} alive={alive} />
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

        {/* pecas */}
        <AnimatePresence initial={false}>
          {config.freckles && (
            <motion.g key="freckles" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={SWAP} style={{ originX: "50px", originY: "58px", transformBox: "view-box" }} clipPath={`url(#${clipId})`}>
              <Freckles ink={ink} />
            </motion.g>
          )}
        </AnimatePresence>

        {/* ojos */}
        <motion.g animate={{ x: gaze.x, y: gaze.y }} transition={{ type: "spring", stiffness: 120, damping: 16 }}>
          <motion.g
            animate={{ scaleY: blink && eyes !== "happy" ? 0.1 : 1 }}
            transition={{ duration: 0.07 }}
            style={{ originX: "50px", originY: "48px", transformBox: "view-box" }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.g
                key={eyes}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={SWAP}
                style={{ originX: "50px", originY: "48px", transformBox: "view-box" }}
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
            style={{ originX: "50px", originY: "64px", transformBox: "view-box" }}
          >
            <Mouth id={mouth} ink={ink} body={fill} />
          </motion.g>
        </AnimatePresence>

        {/* accesorio de la cara */}
        <AnimatePresence initial={false}>
          {config.face !== "none" && (
            <motion.g
              key={config.face}
              initial={{ opacity: 0, y: -6, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.8 }}
              transition={SWAP}
              style={{ originX: "50px", originY: "50px", transformBox: "view-box" }}
            >
              <Face id={config.face} ink={ink} />
            </motion.g>
          )}
        </AnimatePresence>

        {hands && <Hands id={config.hands} fill={handFill} line={handLine} alive={alive} />}
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

function Freckles({ ink }: { ink: string }) {
  const light = ink === "#FFFFFF";
  const c = light ? "#FFFFFF" : "#7A3A16";
  const dots: [number, number, number][] = [[27.5, 57.6, 1.15], [31.4, 56, 1], [34.6, 58.4, 1.1], [30, 60.4, 0.95]];
  return (
    <g fill={c} opacity={light ? 0.5 : 0.55}>
      {dots.map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} />
          <circle cx={100 - x} cy={y} r={r} />
        </g>
      ))}
    </g>
  );
}

const HEART = "M0 4.6 C-6.6 0.4 -6.4 -5.6 -2.6 -5.6 Q-0.9 -5.6 0 -3.8 Q0.9 -5.6 2.6 -5.6 C6.4 -5.6 6.6 0.4 0 4.6 Z";

function Face({ id, ink }: { id: FaceId; ink: string }) {
  const dark = "#2A2622";
  switch (id) {
    case "glasses":
      return (
        <g stroke={dark} strokeWidth={2.6} fill="none">
          <circle cx="39" cy="48" r="8.2" fill="#ffffff33" />
          <circle cx="61" cy="48" r="8.2" fill="#ffffff33" />
          <path d="M47.2 47 Q50 45 52.8 47" />
        </g>
      );
    case "nerd":
      return (
        <g>
          <g stroke={dark} strokeWidth={3.4} fill="#ffffff40" strokeLinejoin="round">
            <rect x="29.5" y="40.5" width="19" height="15" rx="5.5" />
            <rect x="51.5" y="40.5" width="19" height="15" rx="5.5" />
          </g>
          <path d="M48.5 46 H51.5" stroke={dark} strokeWidth={3.4} />
          <rect x="47.6" y="43" width="4.8" height="6.4" rx="1" fill="#fff" stroke="#d8d2c6" strokeWidth={0.6} />
          <path d="M29.5 44 L22 42 M70.5 44 L78 42" stroke={dark} strokeWidth={2.6} strokeLinecap="round" />
        </g>
      );
    case "sunglasses":
      return (
        <g>
          <path d="M26.5 43.5 H73.5" stroke={dark} strokeWidth={2.8} strokeLinecap="round" />
          <path d="M29 43 H48 Q48.4 53.4 39.6 54.4 Q30.2 54.6 29 46 Z" fill={dark} />
          <path d="M52 43 H71 Q69.8 54.6 60.4 54.4 Q51.6 53.4 52 43 Z" fill={dark} />
          <path d="M33 47.6 L38 44.6 M56 47.6 L61 44.6" stroke="#fff" strokeWidth={1.7} strokeLinecap="round" opacity={0.55} />
        </g>
      );
    case "hearts":
      return (
        <g>
          <path d="M45.6 46.4 Q50 44 54.4 46.4" stroke={dark} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          {[39, 61].map((x) => (
            <path key={x} d={HEART} transform={`translate(${x} 48.6) scale(1.42)`} fill="#FF4D6D" stroke={dark} strokeWidth={1.5} strokeLinejoin="round" />
          ))}
          <path d="M33.4 45.4 L36 43.6 M55.4 45.4 L58 43.6" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
        </g>
      );
    case "mustache":
      return (
        <path
          d="M50 57.6 C46.4 54.4 40.2 54.6 37 58.8 C35.4 57.8 34.6 59.6 36 60.6 C40.4 62.4 45 60.6 50 59.4 C55 60.6 59.6 62.4 64 60.6 C65.4 59.6 64.6 57.8 63 58.8 C59.8 54.6 53.6 54.4 50 57.6 Z"
          fill={ink === "#FFFFFF" ? "#FFFFFF" : "#4A2E1E"}
        />
      );
    case "bandaid":
      return (
        <g transform="translate(68 59.5) rotate(-28)">
          <rect x="-8" y="-3" width="16" height="6" rx="3" fill="#F5CFA6" stroke="#C99467" strokeWidth={0.8} />
          <rect x="-2.6" y="-3" width="5.2" height="6" fill="#E9B686" />
          <circle cx="-5.2" cy="-0.9" r="0.55" fill="#C99467" />
          <circle cx="-5.2" cy="1.1" r="0.55" fill="#C99467" />
          <circle cx="5.2" cy="-0.9" r="0.55" fill="#C99467" />
          <circle cx="5.2" cy="1.1" r="0.55" fill="#C99467" />
        </g>
      );
    default:
      return null;
  }
}

function Extra({ id, top, fill, accent, alive }: { id: AvatarConfig["extra"]; top: number; fill: string; accent: string; alive: boolean }) {
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
    case "cap":
      return (
        <g>
          <path d={`M27 ${top + 13} Q29 ${top - 8} 50 ${top - 9} Q71 ${top - 8} 73 ${top + 13} Z`} fill={ink} />
          <path d={`M60 ${top + 12} Q78 ${top + 9} 88 ${top + 15} Q76 ${top + 18} 62 ${top + 16} Z`} fill={ink} />
          <path d={`M36 ${top - 3} Q50 ${top - 7} 64 ${top - 3}`} stroke="#fff" strokeWidth={1.4} fill="none" opacity={0.18} strokeLinecap="round" />
          <circle cx="50" cy={top - 8.5} r="2.6" fill={fill} />
        </g>
      );
    case "beanie":
      return (
        <g>
          <path d={`M24 ${top + 15} Q25 ${top - 13} 50 ${top - 14} Q75 ${top - 13} 76 ${top + 15} Z`} fill={accent} />
          {[36, 43, 50, 57, 64].map((x) => (
            <path key={x} d={`M${x} ${top - 8} Q${x + (x - 50) * 0.15} ${top + 2} ${x + (x - 50) * 0.2} ${top + 10}`} stroke={shade(accent, -0.22)} strokeWidth={1.3} fill="none" strokeLinecap="round" opacity={0.6} />
          ))}
          <path d={`M22.5 ${top + 15} Q50 ${top + 6} 77.5 ${top + 15}`} stroke={shade(accent, -0.18)} strokeWidth={7.5} strokeLinecap="round" fill="none" />
          <circle cx="50" cy={top - 15} r="5.4" fill="#fff" />
          <circle cx="48.4" cy={top - 16.6} r="1.8" fill="#fff" opacity={0.6} />
          <circle cx="50" cy={top - 15} r="5.4" fill="none" stroke={shade(accent, -0.1)} strokeWidth={0.8} opacity={0.4} />
        </g>
      );
    case "party":
      return (
        <g transform={`rotate(-14 50 ${top + 3})`}>
          <path d={`M39 ${top + 4} L50 ${top - 24} L61 ${top + 4} Z`} fill={accent} />
          <path d={`M43.3 ${top - 7} L56.7 ${top - 7} M41.2 ${top - 1.6} L58.8 ${top - 1.6} M45.5 ${top - 13} L54.5 ${top - 13}`} stroke="#F6C928" strokeWidth={2.6} strokeLinecap="round" />
          <circle cx="50" cy={top - 25} r="3.6" fill="#F6C928" />
          <path d={`M47 ${top - 28} L45 ${top - 31} M50 ${top - 29} V${top - 32.5} M53 ${top - 28} L55 ${top - 31}`} stroke="#F6C928" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      );
    case "crown":
      return (
        <g>
          <path
            d={`M33 ${top + 5} L33 ${top - 11} L41.5 ${top - 3} L50 ${top - 15} L58.5 ${top - 3} L67 ${top - 11} L67 ${top + 5} Z`}
            fill="#F6C928"
            stroke="#B98A0B"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <path d={`M33 ${top + 1} H67`} stroke="#B98A0B" strokeWidth={1.2} opacity={0.6} />
          {[[33, -11], [50, -15], [67, -11]].map(([x, dy]) => (
            <circle key={x} cx={x} cy={top + dy} r="2" fill="#F6C928" stroke="#B98A0B" strokeWidth={1.1} />
          ))}
          <circle cx="50" cy={top - 2.6} r="2.6" fill="#E8432E" />
          <circle cx="40.5" cy={top + 1.2} r="1.6" fill="#3D8BE0" />
          <circle cx="59.5" cy={top + 1.2} r="1.6" fill="#3D8BE0" />
        </g>
      );
    case "flower":
      return (
        <g transform={`translate(66 ${top + 4}) rotate(14)`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-5.6" rx="3.6" ry="5.4" transform={`rotate(${a})`} fill="#fff" stroke="#00000018" strokeWidth={0.7} />
          ))}
          <circle r="3.6" fill="#F6C928" />
          <circle cx="-1" cy="-1" r="1.2" fill="#fff" opacity={0.5} />
        </g>
      );
    case "bow":
      return (
        <g transform={`translate(66 ${top + 6}) rotate(18)`}>
          <path d="M0 0 L-11 -7 Q-13 0 -11 7 Z" fill="#FF6F8A" />
          <path d="M0 0 L11 -7 Q13 0 11 7 Z" fill="#FF6F8A" />
          <path d="M-3 -1.6 L-8.4 -4.4 M3 -1.6 L8.4 -4.4" stroke="#E14E6E" strokeWidth={1} strokeLinecap="round" />
          <circle r="3.2" fill="#E14E6E" />
        </g>
      );
    case "headband":
      return <path d={`M21 ${top + 15} Q50 ${top + 1} 79 ${top + 15}`} stroke="#fff" strokeWidth={6.5} strokeLinecap="round" fill="none" opacity={0.95} />;
    case "headphones":
      return (
        <g>
          <path d={`M18 52 Q16 ${top - 7} 50 ${top - 7} Q84 ${top - 7} 82 52`} stroke={ink} strokeWidth={4.4} fill="none" strokeLinecap="round" />
          <rect x="9.5" y="42" width="12" height="20" rx="6" fill={ink} />
          <rect x="78.5" y="42" width="12" height="20" rx="6" fill={ink} />
          <rect x="17" y="44.5" width="5" height="15" rx="2.5" fill={accent} />
          <rect x="78" y="44.5" width="5" height="15" rx="2.5" fill={accent} />
        </g>
      );
    case "halo":
      return (
        <motion.g animate={alive ? { y: [0, -2.2, 0] } : undefined} transition={alive ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" } : undefined}>
          <ellipse cx="50" cy={top - 10} rx="15" ry="4.2" stroke="#F6C928" strokeWidth={6} fill="none" opacity={0.25} />
          <ellipse cx="50" cy={top - 10} rx="15" ry="4.2" stroke="#F6C928" strokeWidth={2.8} fill="none" />
        </motion.g>
      );
    default:
      return null;
  }
}
