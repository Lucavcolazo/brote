import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, type MealKind } from "../api";
import { useI18n } from "../i18n";
import { addDays, canLogYesterday, localToday } from "../lib/dates";
import { compressImage } from "../lib/image";
import { KIND_META, Sheet, errMsg, useToast } from "../ui";

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
      setDesc("");
      setPhoto(null);
      setPreview(null);
      setDay("hoy");
    }
  }, [open]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

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
    if (!photo) {
      toast(t("Falta la foto 📸"), "error");
      return;
    }
    setBusy(true);
    try {
      const today = localToday();
      await api.addMeal({
        kind,
        description: desc.trim(),
        photo,
        localDate: day === "ayer" ? addDays(today, -1) : today,
      });
      toast(t("¡Subido! 🌱"));
      onSaved();
    } catch (err) {
      toast(errMsg(err, t), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("¿Qué comiste?")}>
      <form className="form" onSubmit={submit}>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

        {preview ? (
          <div className="photo-preview">
            <img src={preview} alt="" />
            <button type="button" className="btn btn-small btn-secondary" onClick={() => galleryRef.current?.click()}>{t("Cambiar")}</button>
          </div>
        ) : (
          <div className="photo-pick">
            <button type="button" className="photo-btn" onClick={() => cameraRef.current?.click()} disabled={processing}>
              <span aria-hidden>📸</span>
              {processing ? t("Procesando…") : t("Sacar foto")}
            </button>
            <button type="button" className="photo-btn alt" onClick={() => galleryRef.current?.click()} disabled={processing}>
              <span aria-hidden>🖼️</span>
              {t("Galería")}
            </button>
          </div>
        )}

        <div className="segmented" role="radiogroup" aria-label="kind">
          {(Object.keys(KIND_META) as MealKind[]).map((k) => (
            <button
              type="button"
              key={k}
              role="radio"
              aria-checked={kind === k}
              className={kind === k ? "on" : ""}
              onClick={() => setKind(k)}
            >
              <span aria-hidden>{KIND_META[k].emoji}</span> {k === "ambas" ? t("Las dos") : t(KIND_META[k].label)}
            </button>
          ))}
        </div>

        <label>
          {t("¿Qué es?")}
          <input value={desc} maxLength={140} onChange={(e) => setDesc(e.target.value)} placeholder={t("Ej: manzana verde, ensalada de tomate…")} />
        </label>

        {yesterdayOk && (
          <div className="segmented small" role="radiogroup" aria-label="day">
            <button type="button" role="radio" aria-checked={day === "hoy"} className={day === "hoy" ? "on" : ""} onClick={() => setDay("hoy")}>{t("Hoy")}</button>
            <button type="button" role="radio" aria-checked={day === "ayer"} className={day === "ayer" ? "on" : ""} onClick={() => setDay("ayer")}>{t("Ayer (hasta las 10)")}</button>
          </div>
        )}

        <button className="btn btn-primary" disabled={busy || processing || !photo}>
          {busy ? t("Subiendo…") : t("Subir")}
        </button>
      </form>
    </Sheet>
  );
}
