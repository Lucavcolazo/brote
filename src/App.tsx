import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Me, type Meal, type PointEvent, type Redemption, type StoreItem, type WeeklySummary } from "./api";
import { addDays, localToday } from "./lib/dates";
import { refreshPushSubscription } from "./lib/push";
import { I18nProvider, errorKey, useI18n } from "./i18n";
import { AuthScreen, takePendingProfile } from "./screens/Auth";
import { Feed } from "./screens/Feed";
import { MeScreen } from "./screens/Me";
import { NewMealSheet } from "./screens/NewMeal";
import { Store } from "./screens/Store";
import { Week } from "./screens/Week";
import { ToastProvider } from "./ui";

export type Tab = "feed" | "tienda" | "semana" | "yo";

export interface AppData {
  meals: Meal[];
  points: PointEvent[];
  items: StoreItem[];
  redemptions: Redemption[];
  summaries: WeeklySummary[];
}

export interface Ctx {
  me: Me & { profile: NonNullable<Me["profile"]> };
  data: AppData;
  balances: Record<string, number>;
  reload: () => Promise<void>;
  go: (tab: Tab) => void;
}

const EMPTY: AppData = { meals: [], points: [], items: [], redemptions: [], summaries: [] };

function readTab(): Tab {
  const t = new URLSearchParams(location.search).get("tab");
  return t === "tienda" || t === "semana" || t === "yo" ? t : "feed";
}

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <Root />
      </ToastProvider>
    </I18nProvider>
  );
}

function Root() {
  const { t, setLang } = useI18n();
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [setupError, setSetupError] = useState("");

  const loadMe = useCallback(async () => {
    try {
      let m = await api.getMe();
      // Recién logueado: crear el perfil (primera vez) y guardar el idioma elegido.
      const pending = m && takePendingProfile();
      if (m && pending) {
        await api.ensureProfile(pending);
        m = await api.getMe();
      }
      if (m?.profile) setLang(m.profile.lang);
      setSetupError("");
      setMe(m);
    } catch (e) {
      console.error(e);
      setSetupError(e instanceof Error ? e.message : String(e));
      setMe(null);
    }
  }, [setLang]);

  useEffect(() => {
    loadMe();
    return api.onAuthChange(loadMe);
  }, [loadMe]);

  if (me === undefined) return <div className="center-screen"><div className="brand-mark pulse">🌱</div></div>;
  if (me === null || !me.profile?.couple_id) {
    return (
      <>
        <AuthScreen />
        {setupError && <p className="error center">{t(errorKey(setupError))}</p>}
      </>
    );
  }
  return <Main me={me as Ctx["me"]} reloadMe={loadMe} />;
}

function Main({ me, reloadMe }: { me: Ctx["me"]; reloadMe: () => Promise<void> }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>(readTab);
  const [data, setData] = useState<AppData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState(() => new URLSearchParams(location.search).get("nuevo") === "1");

  const reload = useCallback(async () => {
    const since = addDays(localToday(), -20);
    const [meals, points, items, redemptions, summaries] = await Promise.all([
      api.listMeals(since),
      api.listPointEvents(),
      api.listStoreItems(),
      api.listRedemptions(),
      api.listSummaries(),
    ]);
    setData({ meals, points, items, redemptions, summaries });
    setLoading(false);
  }, []);

  useEffect(() => {
    reload().catch((e) => {
      console.error(e);
      setLoading(false);
    });
    refreshPushSubscription();
    let t: ReturnType<typeof setTimeout>;
    const unsub = api.subscribeChanges(() => {
      clearTimeout(t);
      t = setTimeout(() => reload().catch(console.error), 400);
    });
    const onVisible = () => document.visibilityState === "visible" && reload().catch(console.error);
    document.addEventListener("visibilitychange", onVisible);
    // Al tocar una notificación con la app abierta, el service worker nos pide cambiar de pestaña.
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "open") {
        const u = new URL(e.data.url);
        history.replaceState(null, "", u.pathname + u.search);
        setTab(readTab());
        if (u.searchParams.get("nuevo") === "1") setComposer(true);
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMsg);
    return () => {
      unsub();
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker?.removeEventListener("message", onMsg);
    };
  }, [reload]);

  const go = useCallback((t: Tab) => {
    setTab(t);
    history.replaceState(null, "", t === "feed" ? "/" : `/?tab=${t}`);
    window.scrollTo({ top: 0 });
  }, []);

  const balances = useMemo(() => {
    const b: Record<string, number> = { [me.userId]: 0 };
    if (me.partner) b[me.partner.id] = 0;
    for (const p of data.points) b[p.user_id] = (b[p.user_id] ?? 0) + p.amount;
    return b;
  }, [data.points, me]);

  const ctx: Ctx = { me, data, balances, reload, go };

  return (
    <div className="app">
      {api.demo && <div className="demo-banner">{t("Modo demo · los datos son de mentira")}</div>}
      <main className="content">
        {loading ? (
          <div className="skeleton-list">
            <div className="skeleton" />
            <div className="skeleton tall" />
            <div className="skeleton tall" />
          </div>
        ) : tab === "feed" ? (
          <Feed ctx={ctx} onNew={() => setComposer(true)} />
        ) : tab === "tienda" ? (
          <Store ctx={ctx} />
        ) : tab === "semana" ? (
          <Week ctx={ctx} />
        ) : (
          <MeScreen ctx={ctx} reloadMe={reloadMe} />
        )}
      </main>

      <nav className="tabbar" aria-label="Secciones">
        <TabBtn tab="feed" cur={tab} go={go} icon="🏡" label={t("Feed")} />
        <TabBtn tab="tienda" cur={tab} go={go} icon="🎁" label={t("Tienda")} />
        <button className="fab" onClick={() => setComposer(true)} aria-label={t("Subir comida")}>
          <span>＋</span>
        </button>
        <TabBtn tab="semana" cur={tab} go={go} icon="📊" label={t("Semana")} />
        <TabBtn tab="yo" cur={tab} go={go} icon={me.profile.emoji} label={t("Yo")} />
      </nav>

      <NewMealSheet
        open={composer}
        onClose={() => {
          setComposer(false);
          if (location.search.includes("nuevo")) history.replaceState(null, "", "/");
        }}
        onSaved={async () => {
          setComposer(false);
          go("feed");
          await reload();
        }}
      />
    </div>
  );
}

function TabBtn({ tab, cur, go, icon, label }: { tab: Tab; cur: Tab; go: (t: Tab) => void; icon: string; label: string }) {
  return (
    <button className={`tab ${cur === tab ? "on" : ""}`} onClick={() => go(tab)} aria-current={cur === tab ? "page" : undefined}>
      <span className="tab-icon" aria-hidden>{icon}</span>
      <span className="tab-label">{label}</span>
    </button>
  );
}
