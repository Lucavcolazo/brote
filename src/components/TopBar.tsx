import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PiGearSixBold, PiPencilSimpleBold, PiSignOutBold } from "react-icons/pi";
import { api, type Profile } from "../api";
import { Avatar } from "../avatar/Avatar";
import { COLOR_HEX, featureColor } from "../avatar/model";
import { avatarOf } from "../config";
import { useI18n } from "../i18n";
import { ease, press, spring } from "../ui";

export type ConfigSection = "perfil" | "ajustes";

/** Barra de arriba: la marca a la izquierda y tu inicial a la derecha, que abre tu menú. */
export function TopBar({ profile, onOpenConfig }: { profile: Profile; onOpenConfig: (section: ConfigSection) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const avatar = avatarOf(profile);
  const initial = (profile.name.trim()[0] ?? "?").toLocaleUpperCase();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      btnRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const pick = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <header className="topbar">
      <span className="topbar-brand">
        <img src="/icons/icon.svg" alt="" width={30} height={30} />
        <span className="wordmark">Brote</span>
      </span>

      <motion.button
        ref={btnRef}
        className="initial-btn"
        style={{ background: COLOR_HEX[avatar.color], color: featureColor(avatar.color) }}
        onClick={() => setOpen(!open)}
        aria-label={t("Tu cuenta")}
        aria-haspopup="menu"
        aria-expanded={open}
        whileTap={{ scale: 0.9 }}
        transition={spring}
      >
        {initial}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              className="menu-scrim"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            />
            <motion.div
              key="menu"
              className="account-menu"
              role="menu"
              aria-label={t("Tu cuenta")}
              initial={{ opacity: 0, scale: 0.9, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4, transition: { duration: 0.14, ease } }}
              transition={{ type: "spring", stiffness: 520, damping: 34 }}
            >
              <div className="account-head">
                <Avatar config={avatar} size={40} mode="still" />
                <b>{profile.name}</b>
              </div>
              <MenuItem icon={<PiPencilSimpleBold />} label={t("Editar perfil")} onClick={() => pick(() => onOpenConfig("perfil"))} />
              <MenuItem icon={<PiGearSixBold />} label={t("Configuración")} onClick={() => pick(() => onOpenConfig("ajustes"))} />
              <MenuItem
                icon={<PiSignOutBold />}
                label={t("Cerrar sesión")}
                danger
                onClick={() => pick(() => confirm(t("¿Cerrar sesión en este celu?")) && void api.signOut())}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <motion.button role="menuitem" className={`menu-item ${danger ? "danger" : ""}`} onClick={onClick} whileTap={press}>
      {icon}
      {label}
    </motion.button>
  );
}
