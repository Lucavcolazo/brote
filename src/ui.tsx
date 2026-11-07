import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { MealKind, Profile } from "./api";
import { errorKey, useI18n, type T } from "./i18n";

export const KIND_META: Record<MealKind, { label: string; emoji: string; cls: string }> = {
  fruta: { label: "Fruta", emoji: "🍎", cls: "chip-fruta" },
  verdura: { label: "Verdura", emoji: "🥦", cls: "chip-verdura" },
  ambas: { label: "Fruta + verdura", emoji: "🥗", cls: "chip-ambas" },
};

export function KindChip({ kind }: { kind: MealKind }) {
  const { t } = useI18n();
  const k = KIND_META[kind];
  return (
    <span className={`chip ${k.cls}`}>
      <span aria-hidden>{k.emoji}</span> {t(k.label)}
    </span>
  );
}

export function Avatar({ p, size = 36 }: { p: Pick<Profile, "emoji" | "name"> | null | undefined; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.55 }} aria-label={p?.name}>
      {p?.emoji ?? "🙂"}
    </span>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { t } = useI18n();
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
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t("Cerrar")}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

type Toast = { id: number; text: string; tone: "ok" | "error" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function errMsg(e: unknown, t: T): string {
  return t(errorKey(e instanceof Error ? e.message : String(e)));
}

export const EMOJIS = ["🦊", "🐝", "🐻", "🐼", "🐸", "🦁", "🐨", "🐧", "🦄", "🐙", "🌻", "🌵", "🍄", "⭐️", "🔥", "💚"];

export function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  return (
    <div className="emoji-grid" role="radiogroup" aria-label="Emoji">
      {EMOJIS.map((e) => (
        <button
          type="button"
          key={e}
          role="radio"
          aria-checked={value === e}
          className={`emoji-opt ${value === e ? "on" : ""}`}
          onClick={() => onChange(e)}
        >
          {e}
        </button>
      ))}
    </div>
  );
}
