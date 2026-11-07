import { useState, type FormEvent } from "react";
import { api, type StoreItem } from "../api";
import type { Ctx } from "../App";
import { useI18n } from "../i18n";
import { timeAgo } from "../lib/dates";
import { Sheet, errMsg, useToast } from "../ui";

export function Store({ ctx }: { ctx: Ctx }) {
  const { t } = useI18n();
  const { me, data, balances, reload } = ctx;
  const toast = useToast();
  const [confirmItem, setConfirmItem] = useState<StoreItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const mine = balances[me.userId] ?? 0;
  const partnerName = me.partner?.name ?? "—";

  const owedToMe = data.redemptions.filter((r) => r.status === "pendiente" && r.user_id === me.userId);
  const iOwe = data.redemptions.filter((r) => r.status === "pendiente" && r.user_id !== me.userId);
  const done = data.redemptions.filter((r) => r.status === "cumplido").slice(0, 8);

  async function act(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      await reload();
      return true;
    } catch (e) {
      toast(errMsg(e, t), "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">{t("Tienda")}</p>
        <h1>{t("Canjeá tus puntos")}</h1>
      </header>

      <section className="balance-card">
        <div>
          <small>{t("Tus puntos")}</small>
          <div className="balance-big">{mine}</div>
        </div>
        <div className="balance-side">
          <small>{partnerName}</small>
          <b>{me.partner ? balances[me.partner.id] ?? 0 : "–"} {t("pts")}</b>
        </div>
        <p className="balance-note">{t("Ganás 1 punto cada día que {name} no come fruta ni verdura.", { name: partnerName })}</p>
      </section>

      {iOwe.length > 0 && (
        <section className="block">
          <h3 className="block-title">{t("Le debés a {name} 😅", { name: partnerName })}</h3>
          {iOwe.map((r) => (
            <div key={r.id} className="row-card owe">
              <span className="row-emoji">{r.emoji}</span>
              <div className="row-main">
                <b>{r.title}</b>
                <small>{t("Canjeado {when}", { when: timeAgo(r.created_at, t) })}</small>
              </div>
              <button className="btn btn-small btn-ok" disabled={busy} onClick={() => act(() => api.fulfill(r.id), t("¡Cumplido! 💚"))}>
                {t("Cumplí")}
              </button>
            </div>
          ))}
        </section>
      )}

      {owedToMe.length > 0 && (
        <section className="block">
          <h3 className="block-title">{t("{name} te debe", { name: partnerName })}</h3>
          {owedToMe.map((r) => (
            <div key={r.id} className="row-card">
              <span className="row-emoji">{r.emoji}</span>
              <div className="row-main">
                <b>{r.title}</b>
                <small>{t("Canjeado {when}", { when: timeAgo(r.created_at, t) })}</small>
              </div>
              <button className="btn btn-small btn-secondary" disabled={busy} onClick={() => act(() => api.fulfill(r.id), t("Marcado como cumplido"))}>
                {t("Ya lo tuve")}
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="block">
        <div className="block-head">
          <h3 className="block-title">{t("Premios")}</h3>
          <button className="link-btn" onClick={() => setEditing(!editing)}>{editing ? t("listo") : t("editar")}</button>
        </div>
        <div className="store-grid">
          {data.items.map((item) => {
            const can = mine >= item.cost;
            return (
              <div key={item.id} className={`store-item ${can ? "" : "locked"}`}>
                {editing && (
                  <button
                    className="store-remove"
                    aria-label="✕"
                    onClick={() => confirm(t("¿Quitar \"{title}\" de la tienda?", { title: item.title })) && act(() => api.archiveStoreItem(item.id), t("Quitado"))}
                  >
                    ✕
                  </button>
                )}
                <div className="store-emoji">{item.emoji}</div>
                <div className="store-title">{item.title}</div>
                <button className="store-cost" disabled={!can || busy || editing} onClick={() => setConfirmItem(item)}>
                  {can ? t("Canjear · {cost}", { cost: item.cost }) : t("{cost} pts", { cost: item.cost })}
                </button>
              </div>
            );
          })}
          <button className="store-item add" onClick={() => setAdding(true)}>
            <div className="store-emoji">＋</div>
            <div className="store-title">{t("Agregar premio")}</div>
          </button>
        </div>
      </section>

      {done.length > 0 && (
        <section className="block">
          <h3 className="block-title">{t("Historial")}</h3>
          {done.map((r) => (
            <div key={r.id} className="row-card muted">
              <span className="row-emoji">{r.emoji}</span>
              <div className="row-main">
                <b>{r.title}</b>
                <small>
                  {r.user_id === me.userId ? t("Vos") : partnerName} · {t("{cost} pts", { cost: r.cost })} · {timeAgo(r.fulfilled_at ?? r.created_at, t)}
                </small>
              </div>
              <span className="verdict ok">✔️</span>
            </div>
          ))}
        </section>
      )}

      <Sheet open={!!confirmItem} onClose={() => setConfirmItem(null)} title={t("¿Canjear?")}>
        {confirmItem && (
          <div className="form">
            <div className="confirm-item">
              <span>{confirmItem.emoji}</span>
              <b>{confirmItem.title}</b>
              <small>{t("Te quedan {left} pts · a {name} le llega un aviso", { left: mine - confirmItem.cost, name: partnerName })}</small>
            </div>
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={async () => {
                if (await act(() => api.redeem(confirmItem.id), t("Canjeado {emoji}", { emoji: confirmItem.emoji }))) setConfirmItem(null);
              }}
            >
              {t("Canjear por {cost} pts", { cost: confirmItem.cost })}
            </button>
          </div>
        )}
      </Sheet>

      <AddItemSheet open={adding} onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await reload(); }} />
    </>
  );
}

function AddItemSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("🎁");
  const [cost, setCost] = useState(3);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.addStoreItem({ title: title.trim(), emoji: emoji.trim() || "🎁", cost });
      toast(t("Premio agregado"));
      setTitle("");
      onSaved();
    } catch (err) {
      toast(errMsg(err, t), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("Nuevo premio")}>
      <form className="form" onSubmit={submit}>
        <div className="row-inputs">
          <label className="emoji-field">
            {t("Emoji")}
            <input value={emoji} maxLength={4} onChange={(e) => setEmoji(e.target.value)} />
          </label>
          <label className="grow">
            {t("Premio")}
            <input required maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("Ej: helado de la esquina")} />
          </label>
        </div>
        <div className="field-label">{t("Cuesta")}</div>
        <div className="stepper">
          <button type="button" onClick={() => setCost(Math.max(1, cost - 1))} aria-label="−">−</button>
          <b>{t("{cost} pts", { cost })}</b>
          <button type="button" onClick={() => setCost(Math.min(999, cost + 1))} aria-label="+">＋</button>
        </div>
        <button className="btn btn-primary" disabled={busy}>{t("Agregar")}</button>
      </form>
    </Sheet>
  );
}
