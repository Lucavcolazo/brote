// Brotito: el avatar de cada uno. Un cuerpo definido por un perfil radial (radio por ángulo),
// así cualquier forma se puede transformar suavemente en cualquier otra.

export const SHAPES = ["round", "squircle", "pebble", "bean", "drop", "scallop", "cloud", "star"] as const;
export const COLORS = ["tomato", "tangerine", "lemon", "lime", "leaf", "teal", "sky", "plum", "berry", "ink"] as const;
export const EYES = ["dots", "big", "happy", "sleepy", "wink", "side", "focused", "wide"] as const;
export const MOUTHS = ["smile", "grin", "flat", "oh", "smirk", "tongue", "teeth"] as const;
export const EXTRAS = ["none", "sprout", "glasses", "cap", "headband", "bow"] as const;

export type ShapeId = (typeof SHAPES)[number];
export type ColorId = (typeof COLORS)[number];
export type EyesId = (typeof EYES)[number];
export type MouthId = (typeof MOUTHS)[number];
export type ExtraId = (typeof EXTRAS)[number];

export interface AvatarConfig {
  shape: ShapeId;
  color: ColorId;
  eyes: EyesId;
  mouth: MouthId;
  extra: ExtraId;
  cheeks: boolean;
}

export const COLOR_HEX: Record<ColorId, string> = {
  tomato: "#E8432E",
  tangerine: "#F27A1F",
  lemon: "#F6C928",
  lime: "#9BCB2F",
  leaf: "#2F9E57",
  teal: "#1E9C95",
  sky: "#3D8BE0",
  plum: "#6B4BB8",
  berry: "#D23C7C",
  ink: "#2A2622",
};

/** Color de los rasgos (ojos, boca) según qué tan oscuro es el cuerpo. */
export function featureColor(c: ColorId): string {
  return c === "ink" || c === "plum" || c === "leaf" || c === "sky" || c === "teal" ? "#FFFFFF" : "#2A2622";
}

export const DEFAULT_AVATARS: Record<"luca" | "giovanna", AvatarConfig> = {
  luca: { shape: "squircle", color: "sky", eyes: "dots", mouth: "smirk", extra: "none", cheeks: false },
  giovanna: { shape: "bean", color: "tomato", eyes: "happy", mouth: "smile", extra: "sprout", cheeks: true },
};

export function normalizeAvatar(raw: unknown, fallback: AvatarConfig): AvatarConfig {
  const r = (raw ?? {}) as Partial<AvatarConfig>;
  const pick = <T extends string>(list: readonly T[], v: unknown, d: T): T => (list.includes(v as T) ? (v as T) : d);
  return {
    shape: pick(SHAPES, r.shape, fallback.shape),
    color: pick(COLORS, r.color, fallback.color),
    eyes: pick(EYES, r.eyes, fallback.eyes),
    mouth: pick(MOUTHS, r.mouth, fallback.mouth),
    extra: pick(EXTRAS, r.extra, fallback.extra),
    cheeks: typeof r.cheeks === "boolean" ? r.cheeks : fallback.cheeks,
  };
}

// ---------- geometría ----------
export const N = 72; // puntos del perfil
const TAU = Math.PI * 2;

const PROFILES: Record<ShapeId, (t: number) => number> = {
  round: () => 1,
  squircle: (t) => Math.pow(Math.pow(Math.abs(Math.cos(t)), 4) + Math.pow(Math.abs(Math.sin(t)), 4), -1 / 4) * 0.9,
  pebble: (t) => 1 / Math.sqrt(Math.pow(Math.cos(t) / 1.1, 2) + Math.pow(Math.sin(t) / 0.86, 2)),
  bean: (t) => 0.97 + 0.08 * Math.cos(2 * t) - 0.07 * Math.sin(3 * t + 0.4),
  drop: (t) => 0.9 + 0.13 * Math.sin(t) - 0.05 * Math.cos(2 * t),
  scallop: (t) => 0.94 + 0.055 * Math.cos(8 * t),
  cloud: (t) => 0.95 + 0.05 * Math.cos(3 * t + 1) + 0.04 * Math.sin(5 * t),
  star: (t) => 0.9 + 0.1 * Math.cos(5 * t - Math.PI / 2),
};

const cache = new Map<ShapeId, number[]>();
export function radii(shape: ShapeId): number[] {
  let r = cache.get(shape);
  if (!r) {
    r = Array.from({ length: N }, (_, i) => PROFILES[shape]((i / N) * TAU));
    cache.set(shape, r);
  }
  return r;
}

export function lerpRadii(a: number[], b: number[], p: number): number[] {
  return a.map((v, i) => v + (b[i] - v) * p);
}

/** Path cerrado y suave (Catmull-Rom → Bézier) a partir de los radios. */
export function bodyPath(r: number[], cx = 50, cy = 54, R = 34): string {
  const pts = r.map((k, i) => {
    const t = (i / N) * TAU;
    return [cx + Math.cos(t) * R * k, cy + Math.sin(t) * R * k];
  });
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d + "Z";
}

/** Altura del borde superior del cuerpo (para apoyar accesorios encima). */
export function topY(shape: ShapeId, cy = 54, R = 34): number {
  return cy - R * radii(shape)[Math.round(N * 0.75)];
}
