import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  PiCheckBold,
  PiHandshakeBold,
  PiMinusBold,
  PiPencilSimpleBold,
  PiPlusBold,
  PiTicketBold,
  PiTrashBold,
} from "react-icons/pi";
import { api, type StoreItem } from "../api";
import type { Ctx } from "../App";
import { RollingNumber } from "../components/feira";
import { Valance } from "../components/Valance";
import { COLOR_HEX } from "../avatar/model";
import { avatarOf } from "../config";
import { useI18n } from "../i18n";
import { timeAgo } from "../lib/dates";
import { Sheet, ease, errMsg, press, spring, useToast } from "../ui";

export function Store({ ctx }: { ctx: Ctx }) {
  const { t } = useI18n();
  const { me, data, balances, reload } = ctx;
  const toast = useToast();
  const [confirmItem, setConfirmItem] = useState<StoreItem | null>(null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const mine = balances[me.userId] ?? 0;
  const partnerName = me.partner?.name ?? "";
  const partnerPts = me.partner ? balances[me.partner.id] ?? 0 : 0;
  // Lo que cargó mi pareja lo canjeo yo; lo mío lo canjea mi pareja y solo yo lo edito.
  const theirItems = data.items.filter((i) => i.created_by !== me.userId);
  const myItems = data.items.filter((i) => i.created_by === me.userId);
  const isEditing = editing && myItems.length > 0;

  const owedToMe = data.redemptions.filter((r) => r.status === "pendiente" && r.user_id === me.userId);
  const iOwe = data.redemptions.filter((r) => r.status === "pendiente" && r.user_id !== me.userId);
  const done = data.redemptions.filter((r) => r.status === "cumplido").slice(0, 10);

  async function act(fn: () => Promise<void>, ok?: string) {
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok);
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
        <h1 className="title">{t("Tienda")}</h1>
      </header>
      <Valance color={COLOR_HEX[avatarOf(me.profile).color]} />

      <section className="wallet" aria-label={t("Tus puntos")}>
        <div className="placard">
          <span className="placard-num">
            <RollingNumber value={mine} />
            <span className="unit">{t("pts")}</span>
          </span>
        </div>
        <div className="wallet-side">
          <b>{t("Tus puntos")}</b>
          {me.partner && <span>{t("{name} tiene {n}", { name: partnerName, n: balances[me.partner.id] ?? 0 })}</span>}
        </div>
      </section>

      <AnimatePresence initial={false}>
        {iOwe.length > 0 && (
          <motion.section key="owe" className="block" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <h2 className="section-title">{t("Le debés a {name}", { name: partnerName })}</h2>
            {iOwe.map((r) => (
              <motion.div key={r.id} layout className="debt mine" exit={{ opacity: 0, x: 40 }}>
                <PiHandshakeBold aria-hidden style={{ width: 24, height: 24 }} />
                <div className="debt-main">
                  <b>{r.title}</b>
                  <span>{t("Canjeado {when}", { when: timeAgo(r.created_at, t) })}</span>
                </div>
                <motion.button className="btn btn-sm btn-vale" disabled={busy} whileTap={press} onClick={() => act(() => api.fulfill(r.id), t("Cumplido"))}>
                  {t("Cumplí")}
                </motion.button>
              </motion.div>
            ))}
          </motion.section>
        )}
        {owedToMe.length > 0 && (
          <motion.section key="owed" className="block" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <h2 className="section-title">{t("{name} te debe", { name: partnerName })}</h2>
            {owedToMe.map((r) => (
              <motion.div key={r.id} layout className="debt" exit={{ opacity: 0, x: 40 }}>
                <PiTicketBold aria-hidden style={{ width: 24, height: 24 }} />
                <div className="debt-main">
                  <b>{r.title}</b>
                  <span>{t("Canjeado {when}", { when: timeAgo(r.created_at, t) })}</span>
                </div>
                <motion.button className="btn btn-sm btn-line" disabled={busy} whileTap={press} onClick={() => act(() => api.fulfill(r.id), t("Marcado como cumplido"))}>
                  {t("Ya lo tuve")}
                </motion.button>
              </motion.div>
            ))}
          </motion.section>
        )}
      </AnimatePresence>

      {me.partner && (
        <section className="block">
          <h2 className="section-title">{t("Premios de {name}", { name: partnerName })}</h2>
          <p className="section-note">{t("Los canjeás con tus puntos y {name} te los cumple.", { name: partnerName })}</p>
          {theirItems.length === 0 ? (
            <div className="empty empty-sm">
              <b>{t("{name} todavía no cargó premios", { name: partnerName })}</b>
            </div>
          ) : (
            <motion.div className="prizes" layout>
              <AnimatePresence initial={false}>
                {theirItems.map((item) => (
                  <PrizeRow key={item.id} item={item} locked={mine < item.cost}>
                    <motion.button className="btn btn-sm btn-ink" disabled={mine < item.cost || busy} whileTap={press} onClick={() => setConfirmItem(item)}>
                      {t("Canjear")}
                    </motion.button>
                  </PrizeRow>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      )}

      <section className="block">
        <div className="section-head">
          <h2 className="section-title">{t("Tus premios")}</h2>
          <AnimatePresence initial={false}>
            {myItems.length > 0 && (
              <motion.button
                key="edit"
                className="btn btn-sm btn-soft"
                onClick={() => setEditing(!isEditing)}
                whileTap={press}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                {isEditing ? <PiCheckBold aria-hidden /> : <PiPencilSimpleBold aria-hidden />}
                {isEditing ? t("Listo") : t("Editar")}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        {me.partner && myItems.length > 0 && (
          <p className="section-note">{t("Los canjea {name} con sus puntos y vos los cumplís.", { name: partnerName })}</p>
        )}

        {myItems.length === 0 && !adding && (
          <div className="empty" style={{ margin: "0 0 10px" }}>
            <EmptyCrate />
            <b>{t("Todavía no cargaste premios")}</b>
            <p>
              {me.partner
                ? t("Cargá lo que {name} te puede pedir con sus puntos: una cena, elegir la peli, zafar de los platos.", { name: partnerName })
                : t("Cargá lo que tu pareja te puede pedir con sus puntos: una cena, elegir la peli, zafar de los platos.")}
            </p>
          </div>
        )}

        <motion.div className="prizes" layout>
          <AnimatePresence initial={false}>
            {myItems.map((item) =>
              isEditing ? (
                <PrizeEditor key={item.id} item={item} busy={busy} act={act} />
              ) : (
                <PrizeRow key={item.id} item={item} locked={!me.partner || partnerPts < item.cost}>
                  {me.partner && partnerPts >= item.cost && (
                    <span className="prize-reach">
                      <PiCheckBold aria-hidden />
                      {t("Le alcanza")}
                    </span>
                  )}
                </PrizeRow>
              ),
            )}
          </AnimatePresence>

          <AnimatePresence initial={false} mode="popLayout">
            {adding ? (
              <NewPrize key="new" onCancel={() => setAdding(false)} onSaved={async () => { setAdding(false); await reload(); }} />
            ) : (
              <motion.button key="add" layout className="btn btn-line btn-block" onClick={() => setAdding(true)} whileTap={press} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <PiPlusBold aria-hidden />
                {t("Agregar premio")}
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {done.length > 0 && (
        <section className="block">
          <h2 className="section-title">{t("Historial")}</h2>
          {done.map((r) => (
            <div key={r.id} className="history-row">
              <PiCheckBold aria-hidden style={{ color: "var(--vale)", width: 18, height: 18 }} />
              <span className="grow">
                {r.title}
                <small>
                  {r.user_id === me.userId ? t("Vos") : partnerName} · {t("{n} pts", { n: r.cost })} · {timeAgo(r.fulfilled_at ?? r.created_at, t)}
                </small>
              </span>
            </div>
          ))}
        </section>
      )}

      <Sheet open={!!confirmItem} onClose={() => setConfirmItem(null)} title={t("¿Canjear?")}>
        {confirmItem && (
          <div className="stack">
            <div className="prize" style={{ boxShadow: "none", background: "var(--canvas)" }}>
              <span className="price-tag">
                <b className="num">{confirmItem.cost}</b>
                <small>{t("PTS")}</small>
              </span>
              <span className="prize-title">{confirmItem.title}</span>
            </div>
            <p className="muted small">{t("Te quedan {left} pts. A {name} le llega un aviso para que lo cumpla.", { left: mine - confirmItem.cost, name: partnerName })}</p>
            <motion.button
              className="btn btn-ink btn-block"
              disabled={busy}
              whileTap={press}
              onClick={async () => {
                if (await act(() => api.redeem(confirmItem.id), t("Canjeado"))) setConfirmItem(null);
              }}
            >
              {t("Canjear por {n} pts", { n: confirmItem.cost })}
            </motion.button>
          </div>
        )}
      </Sheet>
    </>
  );
}

function PrizeRow({ item, locked, children }: { item: StoreItem; locked: boolean; children?: ReactNode }) {
  const { t } = useI18n();
  return (
    <motion.div
      layout
      className={`prize ${locked ? "locked" : ""}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease }}
    >
      <span className="price-tag">
        <b className="num">{item.cost}</b>
        <small>{t("PTS")}</small>
      </span>
      <span className="prize-title">{item.title}</span>
      {children}
    </motion.div>
  );
}

function CostStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { t } = useI18n();
  return (
    <div className="stepper">
      <motion.button type="button" whileTap={press} onClick={() => onChange(Math.max(1, value - 1))} aria-label={t("Menos")}>
        <PiMinusBold />
      </motion.button>
      <b>
        <RollingNumber value={value} />
      </b>
      <motion.button type="button" whileTap={press} onClick={() => onChange(Math.min(999, value + 1))} aria-label={t("Más")}>
        <PiPlusBold />
      </motion.button>
    </div>
  );
}

function PrizeEditor({ item, busy, act }: { item: StoreItem; busy: boolean; act: (fn: () => Promise<void>, ok?: string) => Promise<boolean> }) {
  const { t } = useI18n();
  const [title, setTitle] = useState(item.title);
  const [cost, setCost] = useState(item.cost);
  const dirty = title.trim() !== item.title || cost !== item.cost;
  return (
    <motion.div layout className="prize-edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={spring}>
      <input
        className="input"
        value={title}
        maxLength={60}
        aria-label={t("Premio")}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => dirty && title.trim() && act(() => api.updateStoreItem(item.id, { title: title.trim(), cost }), t("Guardado"))}
      />
      <CostStepper
        value={cost}
        onChange={(n) => {
          setCost(n);
          void act(() => api.updateStoreItem(item.id, { cost: n }));
        }}
      />
      <motion.button
        className="icon-btn"
        style={{ background: "var(--nocuenta-soft)", color: "var(--nocuenta)" }}
        disabled={busy}
        whileTap={press}
        aria-label={t("Quitar")}
        onClick={() => confirm(t("¿Quitar \"{title}\" de tus premios?", { title: item.title })) && act(() => api.archiveStoreItem(item.id), t("Quitado"))}
      >
        <PiTrashBold />
      </motion.button>
    </motion.div>
  );
}

function NewPrize({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState(3);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.addStoreItem({ title: title.trim(), cost });
      toast(t("Premio agregado"));
      onSaved();
    } catch (err) {
      toast(errMsg(err, t), "error");
      setBusy(false);
    }
  }

  return (
    <motion.form
      layout
      className="setting"
      onSubmit={submit}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={spring}
    >
      <label className="field">
        <span>{t("Premio")}</span>
        <input className="input" style={{ background: "var(--ground)" }} required maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("Ej: elijo la peli")} autoFocus />
      </label>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span className="field" style={{ gap: 0 }}>
          <span>{t("Cuesta")}</span>
        </span>
        <CostStepper value={cost} onChange={setCost} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <motion.button type="button" className="btn btn-soft" style={{ flex: 1, background: "var(--ground)" }} onClick={onCancel} whileTap={press}>
          {t("Cancelar")}
        </motion.button>
        <motion.button className="btn btn-ink" style={{ flex: 2 }} disabled={busy || !title.trim()} whileTap={press}>
          <PiPlusBold aria-hidden />
          {t("Agregar")}
        </motion.button>
      </div>
    </motion.form>
  );
}

/** Un cajón de feria vacío, dibujado. */
function EmptyCrate() {
  return (
    <svg className="empty-art" viewBox="0 0 120 70" aria-hidden>
      <path d="M8 22 H112 L104 66 H16 Z" fill="#E7C79A" />
      <path d="M8 22 H112 L109 32 H11 Z" fill="#D9B07A" />
      <rect x="20" y="40" width="80" height="5" rx="2.5" fill="#C99A61" />
      <rect x="20" y="52" width="80" height="5" rx="2.5" fill="#C99A61" />
      <rect x="44" y="6" width="32" height="20" rx="3" fill="#FFE14A" transform="rotate(-6 60 16)" />
      <path d="M50 14 h20 M50 19 h12" stroke="#3a3000" strokeWidth="2.4" strokeLinecap="round" transform="rotate(-6 60 16)" />
    </svg>
  );
}
