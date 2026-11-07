import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { PiArrowsClockwiseBold, PiCameraBold, PiImagesBold, PiPaperPlaneTiltBold } from "react-icons/pi";
import { api, type MealKind } from "../api";
import { useI18n } from "../i18n";
import { addDays, canLogYesterday, localToday } from "../lib/dates";
import { compressImage } from "../lib/image";
import { KIND_META, Segmented, Sheet, ease, errMsg, press, useToast } from "../ui";

export function NewMealSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<MealKind>("fruta");
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [day, setDay] = useState<"hoy" | "ayer">("hoy");
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const yesterdayOk = canLogYesterday();

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setDesc("");
        setPhoto(null);
        setPreview(null);
        setDay("hoy");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setProcessing(true);
    try {
      const blob = await compressImage(f);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
    } catch (e) {
      toast(errMsg(e, t), "error");
    } finally {
      setProcessing(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!photo) return toast(t("Falta la foto"), "error");
    setBusy(true);
    try {
      const today = localToday();
      await api.addMeal({ kind, description: desc.trim(), photo, localDate: day === "ayer" ? addDays(today, -1) : today });
      toast(t("Subida"));
      onSaved();
    } catch (err) {
      toast(errMsg(err, t), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("¿Qué comiste?")}>
      <form className="stack" onSubmit={submit}>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

        <AnimatePresence mode="wait" initial={false}>
          {preview ? (
            <motion.div
              key="preview"
              className="photo-preview"
              initial={{ opacity: 0, scale: 0.94, clipPath: "inset(12% 12% 12% 12% round 22px)" }}
              animate={{ opacity: 1, scale: 1, clipPath: "inset(0% 0% 0% 0% round 22px)" }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.45, ease }}
            >
              <img src={preview} alt="" />
              <motion.button type="button" className="btn btn-sm btn-soft" onClick={() => galleryRef.current?.click()} whileTap={press}>
                <PiArrowsClockwiseBold aria-hidden />
                {t("Cambiar")}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="pick" className="photo-pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.button type="button" className="photo-btn main" onClick={() => cameraRef.current?.click()} disabled={processing} whileTap={press}>
                <PiCameraBold aria-hidden />
                {processing ? t("Procesando…") : t("Sacar foto")}
              </motion.button>
              <motion.button type="button" className="photo-btn alt" onClick={() => galleryRef.current?.click()} disabled={processing} whileTap={press}>
                <PiImagesBold aria-hidden />
                {t("Galería")}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <Segmented
          label={t("Tipo")}
          value={kind}
          onChange={setKind}
          options={(Object.keys(KIND_META) as MealKind[]).map((k) => ({ value: k, label: t(KIND_META[k].label), Icon: KIND_META[k].Icon }))}
        />

        <label className="field">
          <span>{t("¿Qué es?")}</span>
          <input className="input" value={desc} maxLength={140} onChange={(e) => setDesc(e.target.value)} placeholder={t("Ej: manzana verde, ensalada de tomate")} />
        </label>

        {yesterdayOk && (
          <Segmented
            label={t("Día")}
            value={day}
            onChange={setDay}
            options={[
              { value: "hoy", label: t("Hoy") },
              { value: "ayer", label: t("Ayer, hasta las 10") },
            ]}
          />
        )}

        <motion.button className="btn btn-ink btn-block" disabled={busy || processing || !photo} whileTap={press}>
          <PiPaperPlaneTiltBold aria-hidden />
          {busy ? t("Subiendo…") : t("Subir")}
        </motion.button>
      </form>
    </Sheet>
  );
}
