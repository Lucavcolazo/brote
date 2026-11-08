// Brote — edge function "push"
// La llaman la base (triggers) y pg_cron con el header x-cron-secret.
// Manda las notificaciones push y corre las tareas programadas.
//
// Secretos necesarios (Edge Functions > Secrets):
//   CRON_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (ej: https://tu-app.vercel.app)
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya vienen cargados por Supabase.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const TZ = "America/Argentina/Buenos_Aires";
const BUCKET = "meal-photos";

const env = (k: string) => Deno.env.get(k) ?? "";
const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

// Se configura recién al mandar, así un secreto mal cargado no tira abajo toda la función.
let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  webpush.setVapidDetails(
    env("VAPID_SUBJECT").trim() || "https://example.com",
    env("VAPID_PUBLIC_KEY").trim(),
    env("VAPID_PRIVATE_KEY").trim(),
  );
  vapidReady = true;
}

// Diagnóstico sin mostrar valores: dice qué secreto falta o está mal.
function configReport() {
  const r: Record<string, string> = {};
  for (const k of ["CRON_SECRET", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    r[k] = env(k) ? "ok" : "falta";
  }
  try {
    ensureVapid();
    r.vapid = "ok";
  } catch (e) {
    r.vapid = String((e as Error).message ?? e);
  }
  return r;
}

type Push = { title: string; body: string; url?: string; tag?: string };
type Lang = "es" | "pt";
type Person = { id: string; name: string; emoji: string; lang: Lang; couple_id: string };

// ---------- textos (cada uno recibe en su idioma) ----------
const KIND: Record<Lang, Record<string, string>> = {
  es: { fruta: "fruta", verdura: "verdura", ambas: "fruta y verdura" },
  pt: { fruta: "fruta", verdura: "verdura", ambas: "fruta e verdura" },
};

const MSG = {
  meal: (l: Lang, who: Person, kind: string, desc: string): Push => ({
    title: l === "pt" ? `${who.name} comeu ${KIND.pt[kind]}` : `${who.name} comió ${KIND.es[kind]}`,
    body: desc
      ? `“${desc}” — ${l === "pt" ? "entra pra conferir a foto" : "entrá a chequear la foto"}`
      : l === "pt" ? "Entra pra conferir a foto " : "Entrá a chequear la foto ",
  }),
  reviewed: (l: Lang, by: Person, kind: string, ok: boolean): Push =>
    l === "pt"
      ? { title: ok ? `${by.name} aprovou sua ${KIND.pt[kind]}` : `${by.name} disse que sua ${KIND.pt[kind]} não vale`, body: ok ? "Boa!" : "Se não postar outra, esse dia não conta." }
      : { title: ok ? `${by.name} aprobó tu ${KIND.es[kind]}` : `${by.name} dice que tu ${KIND.es[kind]} no cuenta`, body: ok ? "¡Bien ahí!" : "Si no subís otra, ese día no cuenta." },
  reacted: (l: Lang, by: Person, emoji: string, kind: string): Push =>
    l === "pt"
      ? { title: `${by.name} reagiu ${emoji} à sua ${KIND.pt[kind]}`, body: "Entra pra ver." }
      : { title: `${by.name} reaccionó ${emoji} a tu ${KIND.es[kind]}`, body: "Entrá a verla." },
  redeemed: (l: Lang, who: Person, r: { emoji: string; title: string; cost: number }): Push =>
    l === "pt"
      ? { title: `${who.name} trocou: ${r.title}`, body: `Gastou ${r.cost} ponto${r.cost === 1 ? "" : "s"}. Agora você tem que cumprir.` }
      : { title: `${who.name} canjeó: ${r.title}`, body: `Gastó ${r.cost} punto${r.cost === 1 ? "" : "s"}. Te toca cumplir.` },
  fulfilled: (l: Lang, r: { emoji: string; title: string }): Push =>
    l === "pt" ? { title: `Troca cumprida: ${r.title}`, body: "Aproveita." } : { title: `Canje cumplido: ${r.title}`, body: "Disfrutalo." },
  remindMidday: (l: Lang): Push =>
    l === "pt" ? { title: "Já comeu algo verde hoje?", body: "Tira uma foto e posta." } : { title: "¿Ya comiste algo verde hoy?", body: "Sacale una foto y subila." },
  remindNight: (l: Lang, partner: string | null): Push =>
    l === "pt"
      ? { title: "Última chamada", body: partner ? `Hoje você não postou fruta nem verdura. Senão, ${partner} ganha 1 ponto.` : "Hoje você não postou fruta nem verdura." }
      : { title: "Última llamada", body: partner ? `Hoy no subiste fruta ni verdura. Si no, ${partner} se lleva 1 punto.` : "Hoy no subiste fruta ni verdura." },
  remindLast: (l: Lang, partner: string | null): Push =>
    l === "pt"
      ? { title: "Faltam 45 minutos", body: partner ? `Posta sua fruta ou verdura antes da meia-noite ou ${partner} ganha 1 ponto.` : "Posta sua fruta ou verdura antes da meia-noite." }
      : { title: "Te quedan 45 minutos", body: partner ? `Subí tu fruta o verdura antes de las 00 o ${partner} suma 1 punto.` : "Subí tu fruta o verdura antes de las 00." },
  redemptionDue: (l: Lang, who: string, title: string, days: number): Push =>
    l === "pt"
      ? { title: `Você deve a ${who}: ${title}`, body: `Trocou há ${days} dias. Quando cumprir, marca na Loja.` }
      : { title: `Le debés a ${who}: ${title}`, body: `Lo canjeó hace ${days} días. Cuando lo cumplas, marcalo en la Tienda.` },
  missed: (l: Lang, beneficiary: string): Push =>
    l === "pt" ? { title: "Ontem não teve fruta nem verdura", body: `+1 ponto para ${beneficiary}.` } : { title: "Ayer no hubo fruta ni verdura", body: `+1 punto para ${beneficiary}.` },
  earned: (l: Lang, failed: string): Push =>
    l === "pt" ? { title: "Você ganhou 1 ponto!", body: `${failed} não comeu nada verde ontem.` } : { title: "¡Sumaste 1 punto!", body: `${failed} ayer no comió nada verde.` },
  summary: (l: Lang, members: Array<{ name: string; days_ok: number; balance: number }>): Push => ({
    title: l === "pt" ? "Resumo da semana" : "Resumen de la semana",
    body: members.map((m) => `${m.name}: ${m.days_ok}/7 ${l === "pt" ? "dias" : "días"} · ${m.balance} pts`).join("  |  "),
  }),
};

// ---------- fechas en hora argentina ----------
function localToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function mondayOf(iso: string): string {
  const dow = new Date(iso + "T12:00:00Z").getUTCDay(); // 0 = domingo
  return addDays(iso, -((dow + 6) % 7));
}

// ---------- envío ----------
async function sendTo(userIds: string[], msg: Push): Promise<number> {
  if (userIds.length === 0) return 0;
  const { data: subs, error } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (error) throw error;
  if (!subs?.length) return 0;
  ensureVapid();

  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(msg),
          { TTL: 60 * 60 * 12, urgency: "normal" },
        );
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await db.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("push error", code, (e as Error).message);
        }
      }
    }),
  );
  return sent;
}

const PROFILE_COLS = "id, name, emoji, lang, couple_id";
async function profile(id: string) {
  const { data } = await db.from("profiles").select(PROFILE_COLS).eq("id", id).single();
  return data as Person | null;
}
async function partnerOf(userId: string, coupleId: string) {
  const { data } = await db.from("profiles").select(PROFILE_COLS).eq("couple_id", coupleId).neq("id", userId).maybeSingle();
  return data as Person | null;
}
async function coupleMembers(coupleId: string): Promise<Person[]> {
  const { data } = await db.from("profiles").select(PROFILE_COLS).eq("couple_id", coupleId);
  return (data ?? []) as Person[];
}

// ---------- acciones ----------
const actions: Record<string, (body: Record<string, unknown>) => Promise<unknown>> = {
  check: async () => configReport(),
  async meal_created({ meal_id }) {
    const { data: meal } = await db.from("meals").select("*").eq("id", meal_id).single();
    if (!meal) return { skipped: "meal not found" };
    const who = await profile(meal.user_id);
    const partner = who && (await partnerOf(who.id, meal.couple_id));
    if (!who || !partner) return { skipped: "no partner" };
    return sendTo([partner.id], { ...MSG.meal(partner.lang, who, meal.kind, meal.description), url: "/?tab=feed", tag: `meal-${meal.id}` });
  },

  async meal_reviewed({ meal_id }) {
    const { data: meal } = await db.from("meals").select("*").eq("id", meal_id).single();
    if (!meal || !meal.review) return { skipped: true };
    const owner = await profile(meal.user_id);
    const partner = await partnerOf(meal.user_id, meal.couple_id);
    if (!owner || !partner) return { skipped: "no partner" };
    return sendTo([owner.id], { ...MSG.reviewed(owner.lang, partner, meal.kind, meal.review === "ok"), url: "/?tab=feed" });
  },

  async meal_reacted({ meal_id, user_id }) {
    const { data: meal } = await db.from("meals").select("id, user_id, kind").eq("id", meal_id).single();
    if (!meal || meal.user_id === user_id) return { skipped: true };
    const { data: rx } = await db.from("meal_reactions").select("emoji").eq("meal_id", meal_id).eq("user_id", user_id).maybeSingle();
    const owner = await profile(meal.user_id);
    const by = await profile(String(user_id));
    if (!rx || !owner || !by) return { skipped: true };
    return sendTo([owner.id], { ...MSG.reacted(owner.lang, by, rx.emoji, meal.kind), url: "/?tab=feed", tag: `reaction-${meal.id}` });
  },

  async redemption_created({ redemption_id }) {
    const { data: r } = await db.from("redemptions").select("*").eq("id", redemption_id).single();
    if (!r) return { skipped: true };
    const who = await profile(r.user_id);
    const partner = who && (await partnerOf(who.id, r.couple_id));
    if (!who || !partner) return { skipped: "no partner" };
    return sendTo([partner.id], { ...MSG.redeemed(partner.lang, who, r), url: "/?tab=tienda" });
  },

  async redemption_fulfilled({ redemption_id }) {
    const { data: r } = await db.from("redemptions").select("*").eq("id", redemption_id).single();
    if (!r) return { skipped: true };
    const who = await profile(r.user_id);
    if (!who) return { skipped: true };
    return sendTo([who.id], { ...MSG.fulfilled(who.lang, r), url: "/?tab=tienda" });
  },

  async remind({ slot }) {
    const today = localToday();
    const { data, error } = await db.rpc("srv_pending_users", { p_date: today });
    if (error) throw error;
    let sent = 0;
    for (const u of data ?? []) {
      const p = await profile(u.user_id);
      const lang = p?.lang ?? "es";
      const msg = slot === "last" ? MSG.remindLast(lang, u.partner_name) : slot === "night" ? MSG.remindNight(lang, u.partner_name) : MSG.remindMidday(lang);
      sent += await sendTo([u.user_id], { ...msg, url: "/?tab=feed&nuevo=1", tag: "remind" });
    }
    return { pending: data?.length ?? 0, sent };
  },

  // Canjes pendientes hace 3 días o más: le recuerda a quien tiene que cumplirlos (uno por día).
  async remind_redemptions({ days }) {
    const minDays = Number(days) || 3;
    const cutoff = new Date(Date.now() - minDays * 864e5).toISOString();
    const { data, error } = await db
      .from("redemptions")
      .select("id, user_id, couple_id, title, created_at")
      .eq("status", "pendiente")
      .lt("created_at", cutoff)
      .order("created_at");
    if (error) throw error;
    let sent = 0;
    for (const r of data ?? []) {
      const who = await profile(r.user_id);
      const debtor = who && (await partnerOf(who.id, r.couple_id));
      if (!who || !debtor) continue;
      const age = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 864e5);
      sent += await sendTo([debtor.id], { ...MSG.redemptionDue(debtor.lang, who.name, r.title, age), url: "/?tab=tienda", tag: `due-${r.id}` });
    }
    return { pending: data?.length ?? 0, sent };
  },

  async close_day({ date }) {
    const day = (date as string) || addDays(localToday(), -1);
    const { data, error } = await db.rpc("srv_close_day", { p_date: day });
    if (error) throw error;
    for (const r of data ?? []) {
      const failed = await profile(r.failed_user);
      const winner = await profile(r.beneficiary);
      if (failed) await sendTo([failed.id], { ...MSG.missed(failed.lang, r.beneficiary_name), url: "/?tab=semana" });
      if (winner) await sendTo([winner.id], { ...MSG.earned(winner.lang, r.failed_name), url: "/?tab=tienda" });
    }
    return { day, penalties: data?.length ?? 0 };
  },

  async weekly_summary({ week_start }) {
    const monday = (week_start as string) || mondayOf(localToday());
    const { data, error } = await db.rpc("srv_weekly_summaries", { p_week_start: monday });
    if (error) throw error;
    for (const row of data ?? []) {
      const members = row.data.members as Array<{ name: string; days_ok: number; balance: number }>;
      for (const p of await coupleMembers(row.couple_id)) {
        await sendTo([p.id], { ...MSG.summary(p.lang, members), url: "/?tab=semana", tag: `summary-${monday}` });
      }
    }
    return { week_start: monday, couples: data?.length ?? 0 };
  },

  async cleanup_photos({ before }) {
    const cutoff = (before as string) || mondayOf(localToday());
    const { data, error } = await db.rpc("srv_photos_to_cleanup", { p_before: cutoff });
    if (error) throw error;
    const rows = (data ?? []) as Array<{ id: string; photo_path: string }>;
    let removed = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error: rmErr } = await db.storage.from(BUCKET).remove(chunk.map((r) => r.photo_path));
      if (rmErr) throw rmErr;
      const { data: n, error: mkErr } = await db.rpc("srv_mark_photos_deleted", { p_ids: chunk.map((r) => r.id) });
      if (mkErr) throw mkErr;
      removed += n as number;
    }
    return { cutoff, removed };
  },
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = env("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const fn = actions[String(body.action)];
  if (!fn) return new Response("Unknown action", { status: 400 });
  try {
    const result = await fn(body);
    console.log(body.action, JSON.stringify(result));
    return Response.json({ ok: true, result });
  } catch (e) {
    console.error(body.action, e);
    return Response.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 500 });
  }
});
