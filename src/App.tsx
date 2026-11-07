import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  PiCalendarDotsBold,
  PiCalendarDotsFill,
  PiCameraBold,
  PiSlidersHorizontalBold,
  PiSlidersHorizontalFill,
  PiStorefrontBold,
  PiStorefrontFill,
  PiTicketBold,
  PiTicketFill,
} from "react-icons/pi";
import { api, type Me, type Meal, type PointEvent, type Redemption, type StoreItem, type Streak, type WeeklySummary } from "./api";
import { avatarOf } from "./config";
import { I18nProvider, useI18n } from "./i18n";
import { addDays, localToday } from "./lib/dates";
import { refreshPushSubscription } from "./lib/push";
import { LoginScreen, SetupScreen } from "./screens/Auth";
import { ConfigScreen } from "./screens/Config";
import { Home } from "./screens/Home";
import { NewMealSheet } from "./screens/NewMeal";
import { Store } from "./screens/Store";
import { Week } from "./screens/Week";
import { ToastProvider, ease, press, spring } from "./ui";

export type Tab = "marcador" | "tienda" | "semana" | "config";
const TABS: Tab[] = ["marcador", "tienda", "semana", "config"];

export interface AppData {
  meals: Meal[];
  points: PointEvent[];
  items: StoreItem[];
  redemptions: Redemption[];
  summaries: WeeklySummary[];
  streaks: Streak[];
}

export interface Ctx {
  me: Me & { profile: NonNullable<Me["profile"]> };
  data: AppData;
  balances: Record<string, number>;
  streakOf: (uid: string) => Streak;
  reload: () => Promise<void>;
  reloadMe: () => Promise<void>;
  go: (tab: Tab) => void;
  openComposer: () => void;
}

const EMPTY: AppData = { meals: [], points: [], items: [], redemptions: [], summaries: [], streaks: [] };

function readTab(): Tab {
  const t = new URLSearchParams(location.search).get("tab");
  if (t === "feed") return "marcador";
  if (t === "yo") return "config";
  return TABS.includes(t as Tab) ? (t as Tab) : "marcador";
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.3, ease }}>
      <I18nProvider>
        <ToastProvider>
          <Root />
        </ToastProvider>
      </I18nProvider>
    </MotionConfig>
  );
}

function Root() {
  const { setLang } = useI18n();
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  const loadMe = useCallback(async () => {
    try {
      const m = await api.getMe();
      if (m?.profile) setLang(m.profile.lang);
      setMe(m);
    } catch (e) {
      console.error(e);
      setMe(null);
    }
  }, [setLang]);

  useEffect(() => {
    loadMe();
    return api.onAuthChange(loadMe);
  }, [loadMe]);

  const stage = me === undefined ? "boot" : me === null ? "login" : !me.profile?.couple_id ? "setup" : "main";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stage}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        transition={{ duration: 0.35, ease }}
      >
        {stage === "boot" && <div className="boot" aria-busy="true" />}
        {stage === "login" && <LoginScreen />}
        {stage === "setup" && <SetupScreen onDone={loadMe} />}
        {stage === "main" && <Main me={me as Ctx["me"]} reloadMe={loadMe} />}
      </motion.div>
    </AnimatePresence>
  );
}

function Main({ me, reloadMe }: { me: Ctx["me"]; reloadMe: () => Promise<void> }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>(readTab);
  const [dir, setDir] = useState(0);
  const [data, setData] = useState<AppData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [composer, setComposer] = useState(() => new URLSearchParams(location.search).get("nuevo") === "1");

  const reload = useCallback(async () => {
    const since = addDays(localToday(), -20);
    const [meals, points, items, redemptions, summaries, streaks] = await Promise.all([
      api.listMeals(since),
      api.listPointEvents(),
      api.listStoreItems(),
      api.listRedemptions(),
      api.listSummaries(),
      api.listStreaks(),
    ]);
    setData({ meals, points, items, redemptions, summaries, streaks });
    setLoaded(true);
  }, []);

  useEffect(() => {
    reload().catch((e) => {
      console.error(e);
      setLoaded(true);
    });
    refreshPushSubscription();
    let timer: ReturnType<typeof setTimeout>;
    const unsub = api.subscribeChanges(() => {
      clearTimeout(timer);
      timer = setTimeout(() => reload().catch(console.error), 350);
    });
    const onVisible = () => document.visibilityState === "visible" && reload().catch(console.error);
    document.addEventListener("visibilitychange", onVisible);
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

  const go = useCallback(
    (next: Tab) => {
      setDir(TABS.indexOf(next) > TABS.indexOf(tab) ? 1 : -1);
      setTab(next);
      history.replaceState(null, "", next === "marcador" ? "/" : `/?tab=${next}`);
      window.scrollTo({ top: 0 });
    },
    [tab],
  );

  const balances = useMemo(() => {
    const b: Record<string, number> = { [me.userId]: 0 };
    if (me.partner) b[me.partner.id] = 0;
    for (const p of data.points) b[p.user_id] = (b[p.user_id] ?? 0) + p.amount;
    return b;
  }, [data.points, me]);

  const streakOf = useCallback(
    (uid: string) => data.streaks.find((s) => s.user_id === uid) ?? { user_id: uid, current_streak: 0, best_streak: 0 },
    [data.streaks],
  );

  const ctx: Ctx = { me, data, balances, streakOf, reload, reloadMe, go, openComposer: () => setComposer(true) };
  const myColor = avatarOf(me.profile).color;

  return (
    <div className="app">

      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.main
          key={tab}
          className="screen"
          custom={dir}
          variants={{
            enter: (d: number) => ({ opacity: 0, x: d * 28 }),
            center: { opacity: 1, x: 0 },
            exit: (d: number) => ({ opacity: 0, x: d * -18, transition: { duration: 0.14 } }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.32, ease }}
        >
          {!loaded ? null : tab === "marcador" ? (
            <Home ctx={ctx} />
          ) : tab === "tienda" ? (
            <Store ctx={ctx} />
          ) : tab === "semana" ? (
            <Week ctx={ctx} />
          ) : (
            <ConfigScreen ctx={ctx} />
          )}
        </motion.main>
      </AnimatePresence>

      <nav className="tabbar" aria-label={t("Secciones")} data-color={myColor}>
        <TabBtn tab="marcador" cur={tab} go={go} Icon={PiStorefrontBold} IconOn={PiStorefrontFill} label={t("Marcador")} />
        <TabBtn tab="tienda" cur={tab} go={go} Icon={PiTicketBold} IconOn={PiTicketFill} label={t("Tienda")} />
        <motion.button className="fab" onClick={() => setComposer(true)} aria-label={t("Subir comida")} whileTap={{ scale: 0.9, rotate: -4 }} transition={spring}>
          <PiCameraBold />
        </motion.button>
        <TabBtn tab="semana" cur={tab} go={go} Icon={PiCalendarDotsBold} IconOn={PiCalendarDotsFill} label={t("Semana")} />
        <TabBtn tab="config" cur={tab} go={go} Icon={PiSlidersHorizontalBold} IconOn={PiSlidersHorizontalFill} label={t("Config")} />
      </nav>

      <NewMealSheet
        open={composer}
        onClose={() => {
          setComposer(false);
          if (location.search.includes("nuevo")) history.replaceState(null, "", "/");
        }}
        onSaved={async () => {
          setComposer(false);
          if (tab !== "marcador") go("marcador");
          await reload();
        }}
      />
    </div>
  );
}

function TabBtn({ tab, cur, go, Icon, IconOn, label }: { tab: Tab; cur: Tab; go: (t: Tab) => void; Icon: IconType; IconOn: IconType; label: string }) {
  const on = cur === tab;
  return (
    <motion.button className={`tab ${on ? "on" : ""}`} onClick={() => go(tab)} aria-current={on ? "page" : undefined} whileTap={press}>
      {on && <motion.span layoutId="tab-dot" className="tab-dot" transition={spring} />}
      {on ? <IconOn aria-hidden /> : <Icon aria-hidden />}
      <span className="tab-label">{label}</span>
    </motion.button>
  );
}
