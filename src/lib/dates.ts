import type { T } from "../i18n";

// Todas las fechas "del día" se calculan en hora argentina, igual que en la base.
export const TZ = "America/Argentina/Buenos_Aires";
export const GRACE_HOUR = 10; // hasta las 10 se puede cargar lo de ayer

export function localToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

export function localHour(now = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(now)) % 24;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function mondayOf(iso: string): string {
  const dow = new Date(iso + "T12:00:00Z").getUTCDay();
  return addDays(iso, -((dow + 6) % 7));
}

export function canLogYesterday(now = new Date()): boolean {
  return localHour(now) < GRACE_HOUR;
}

const noon = (iso: string) => new Date(iso + "T12:00:00Z");

export function weekdayShort(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(noon(iso)).replace(".", "");
}

export function shortDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(noon(iso)).replace(".", "");
}

export function longToday(locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(new Date());
}

export function dayLabel(iso: string, t: T, locale: string): string {
  const today = localToday();
  if (iso === today) return t("Hoy");
  if (iso === addDays(today, -1)) return t("Ayer");
  return `${weekdayShort(iso, locale)} ${shortDate(iso, locale)}`;
}

export function timeAgo(ts: string, t: T): string {
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return t("recién");
  if (s < 3600) return t("hace {n} min", { n: Math.floor(s / 60) });
  if (s < 86400) return t("hace {n} h", { n: Math.floor(s / 3600) });
  const d = Math.floor(s / 86400);
  return d === 1 ? t("ayer") : t("hace {n} días", { n: d });
}

export function clock(ts: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ts));
}
