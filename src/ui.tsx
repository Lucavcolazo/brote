import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useId, useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { PiBowlFoodBold, PiCarrotBold, PiCheckCircleFill, PiOrangeSliceBold, PiWarningCircleFill, PiXBold } from "react-icons/pi";
import type { MealKind } from "./api";
import { errorKey, useI18n, type T } from "./i18n";

// ---------- motion tokens ----------
export const ease = [0.16, 1, 0.3, 1] as const;
export const spring = { type: "spring", stiffness: 420, damping: 34 } as const;
export const press = { scale: 0.96 };

// ---------- tipos de comida ----------
export const KIND_META: Record<MealKind, { label: string; Icon: IconType; cls: string }> = {
  fruta: { label: "Fruta", Icon: PiOrangeSliceBold, cls: "crate-fruta" },
  verdura: { label: "Verdura", Icon: PiCarrotBold, cls: "crate-verdura" },
  ambas: { label: "Las dos", Icon: PiBowlFoodBold, cls: "crate-ambas" },
};

export function KindTag({ kind }: { kind: MealKind }) {
  const { t } = useI18n();
  const k = KIND_META[kind];
  return (
    <span className={`crate ${k.cls}`}>
      <k.Icon aria-hidden /> {t(k.label)}
    </span>
  );
}

// ---------- segmented ----------
export function Segmented<V extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string; Icon?: IconType }[];
  label: string;
}) {
  const id = useId();
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <motion.button
          type="button"
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          whileTap={press}
        >
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={spring} />}
          {o.Icon && <o.Icon aria-hidden />}
          {o.label}
        </motion.button>
      ))}
    </div>
  );
}

// ---------- sheet ----------
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { t } = useI18n();
  const drag = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="sheet-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            transition={{ duration: 0.25 }}
          />
          <motion.div
            key="sheet"
            className="sheet"
            role="dialog"
            aria-modal
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.24, ease } }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.7 }}
            onDragEnd={onDragEnd}
          >
            <div className="sheet-grip" onPointerDown={(e) => drag.start(e)} />
            <div className="sheet-head" onPointerDown={(e) => drag.start(e)}>
              <h2>{title}</h2>
              <motion.button className="icon-btn" onClick={onClose} aria-label={t("Cerrar")} whileTap={press}>
                <PiXBold />
              </motion.button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------- toasts ----------
type Toast = { id: number; text: string; tone: "ok" | "error" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              className={`toast ${t.tone === "error" ? "error" : ""}`}
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96, transition: { duration: 0.16 } }}
              transition={spring}
            >
              {t.tone === "error" ? <PiWarningCircleFill aria-hidden /> : <PiCheckCircleFill aria-hidden />}
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function errMsg(e: unknown, t: T): string {
  return t(errorKey(e instanceof Error ? e.message : String(e)));
}

// ---------- switch ----------
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
      <motion.span className="switch-knob" animate={{ x: checked ? 20 : 0 }} transition={spring} />
    </button>
  );
}
