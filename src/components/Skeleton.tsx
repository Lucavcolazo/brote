import type { CSSProperties } from "react";
import type { Tab } from "../App";
import { useI18n } from "../i18n";
import { Valance } from "./Valance";

const GREY = "#C9C4BA";

/** Un hueso del esqueleto. Todos comparten el mismo brillo (fondo fijo), así barren juntos la pantalla. */
export function Bone({ w, h, r, style, className = "" }: { w?: number | string; h?: number | string; r?: number | string; style?: CSSProperties; className?: string }) {
  return <span aria-hidden className={`bone ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function Busy({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="skeleton" aria-busy="true" aria-label={t("Cargando")}>
      {children}
    </div>
  );
}

function PostSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div className="post sk-post">
      <div className="post-head">
        <Bone w={38} h={38} r={12} />
        <div className="post-who" style={{ gap: 6 }}>
          <Bone w={96} h={14} r={4} />
          <Bone w={44} h={11} r={4} />
        </div>
        <Bone w={76} h={26} r={6} />
      </div>
      <div className="sk-photo">
        <Bone w="100%" h="100%" r={0} />
      </div>
      <div className="post-body">
        <Bone w={tall ? "72%" : "48%"} h={18} r={5} />
        <div className="post-actions">
          <Bone h={44} r={14} style={{ flex: 1 }} />
          <Bone h={44} r={14} style={{ flex: 1 }} />
        </div>
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <Busy>
      <section className="market sk-market">
        <div className="market-head">
          <span className="wordmark">Brote</span>
          <Bone w={92} h={14} r={4} />
        </div>
        <div className="duo">
          {[0, 1].map((i) => (
            <div key={i} className="player">
              <Bone w={96} h={96} r={34} style={{ margin: "16px 0" }} />
              <Bone w={70} h={14} r={4} style={{ marginTop: 10 }} />
              <Bone w={84} h={58} r={6} style={{ marginTop: 8 }} />
              <Bone w={88} h={26} r={999} style={{ marginTop: 10 }} />
            </div>
          ))}
        </div>
      </section>
      <div className="today">
        <Bone h={36} r={999} className="sk-pill" />
        <Bone h={36} r={999} className="sk-pill" />
      </div>
      <Bone h={74} r={22} style={{ display: "block", margin: "0 16px 26px" }} />
      <div className="day-title">
        <Bone w={64} h={12} r={4} />
      </div>
      <PostSkeleton tall />
      <PostSkeleton />
    </Busy>
  );
}

function PageHead({ title, side }: { title: string; side?: number }) {
  return (
    <header className="page-head">
      <h1 className="title">{title}</h1>
      {side ? <Bone w={side} h={side > 80 ? 14 : 36} r={side > 80 ? 4 : 999} /> : null}
    </header>
  );
}

export function StoreSkeleton() {
  const { t } = useI18n();
  return (
    <Busy>
      <PageHead title={t("Tienda")} side={74} />
      <Valance color={GREY} />
      <section className="wallet">
        <Bone w={120} h={96} r={6} className="tilt-l" />
        <div className="wallet-side" style={{ gap: 8 }}>
          <Bone w="70%" h={17} r={4} />
          <Bone w="90%" h={13} r={4} />
        </div>
      </section>
      <section className="block">
        <div className="section-title">
          <Bone w={84} h={13} r={4} />
        </div>
        <div className="prizes">
          {[0.7, 0.5, 0.62].map((w, i) => (
            <div key={i} className="prize">
              <Bone w={58} h={38} r={6} />
              <Bone w={`${w * 100}%`} h={17} r={4} style={{ flex: "0 1 auto", minWidth: 0 }} />
              <Bone w={84} h={40} r={14} style={{ marginLeft: "auto" }} />
            </div>
          ))}
        </div>
      </section>
    </Busy>
  );
}

export function WeekSkeleton() {
  const { t } = useI18n();
  return (
    <Busy>
      <PageHead title={t("Semana")} side={96} />
      <section className="duo duo-week">
        {[0, 1].map((i) => (
          <div key={i} className="player">
            <Bone w={78} h={78} r={28} style={{ margin: "13px 0" }} />
            <Bone w={70} h={14} r={4} style={{ marginTop: 10 }} />
            <Bone w={70} h={50} r={6} style={{ marginTop: 8 }} />
            <Bone w={110} h={26} r={999} style={{ marginTop: 10 }} />
          </div>
        ))}
      </section>
      <section className="block">
        <div className="section-title">
          <Bone w={96} h={13} r={4} />
        </div>
        <div className="week-grid">
          {[0, 1, 2].map((row) => (
            <div key={row} className="week-row">
              <Bone w={row ? 30 : 0} h={row ? 30 : 12} r={10} />
              {Array.from({ length: 7 }, (_, i) => (
                <Bone key={i} h={row ? undefined : 12} r={row ? 10 : 4} className={row ? "sk-cell" : ""} />
              ))}
            </div>
          ))}
        </div>
      </section>
      <section className="block">
        <div className="section-title">
          <Bone w={110} h={13} r={4} />
        </div>
        <Bone w="100%" h={120} r={16} />
      </section>
    </Busy>
  );
}

export function ExamsSkeleton() {
  const { t } = useI18n();
  return (
    <Busy>
      <PageHead title={t("Notas")} />
      <Valance color={GREY} />
      <section className="exam-stats">
        {[0, 1].map((i) => (
          <div key={i} className="exam-stat">
            <Bone w={90} h={34} r={10} />
            <Bone w={70} h={44} r={6} style={{ marginTop: 6 }} />
            <Bone w={100} h={13} r={4} style={{ marginTop: 4 }} />
          </div>
        ))}
      </section>
      <div className="block">
        <Bone w="80%" h={14} r={4} style={{ display: "block", marginBottom: 12 }} />
        <Bone w="100%" h={52} r={999} style={{ display: "block" }} />
      </div>
      <section className="block">
        <div className="section-title">
          <Bone w={110} h={13} r={4} />
        </div>
        <div className="exams">
          {[0.6, 0.45].map((w, i) => (
            <div key={i} className="exam">
              <div className="exam-top">
                <Bone w={58} h={52} r={6} />
                <div className="exam-main" style={{ gap: 6 }}>
                  <Bone w={`${w * 100}%`} h={17} r={4} />
                  <Bone w={90} h={12} r={4} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Busy>
  );
}

export function ConfigSkeleton() {
  const { t } = useI18n();
  return (
    <Busy>
      <PageHead title={t("Config")} />
      <Valance color={GREY} />
      <div className="stage sk-stage">
        <Bone w={150} h={150} r={52} />
      </div>
      <div className="part-tabs">
        <Bone w="100%" h={44} r={999} style={{ display: "block" }} />
      </div>
      <div className="options">
        {Array.from({ length: 8 }, (_, i) => (
          <Bone key={i} r={16} className="sk-option" />
        ))}
      </div>
    </Busy>
  );
}

export function ScreenSkeleton({ tab }: { tab: Tab }) {
  return tab === "tienda" ? <StoreSkeleton /> : tab === "notas" ? <ExamsSkeleton /> : tab === "semana" ? <WeekSkeleton /> : tab === "config" ? <ConfigSkeleton /> : <HomeSkeleton />;
}

/** Lo que se ve mientras arranca la app: la pantalla que se va a abrir y la barra de abajo. */
export function BootSkeleton({ tab }: { tab: Tab }) {
  return (
    <div className="app">
      <main className="screen">
        <ScreenSkeleton tab={tab} />
      </main>
      <div className="tabbar sk-tabbar" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) =>
          i === 2 ? <span key={i} className="fab sk-fab" /> : (
            <span key={i} className="tab">
              <Bone w={25} h={25} r={8} />
              <Bone w={38} h={9} r={3} />
            </span>
          ),
        )}
      </div>
    </div>
  );
}
