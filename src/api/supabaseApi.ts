import { createClient } from "@supabase/supabase-js";
import type { Api, Meal, MealReaction, Me, Profile } from "./types";

const BUCKET = "meal-photos";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function check<T = any>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(cleanError(res.error.message));
  return res.data as T;
}

// Los mensajes se traducen en la UI con errorKey() de i18n.
const cleanError = (msg: string) => msg;

export function createSupabaseApi(url: string, key: string): Api {
  const sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  let cachedMe: Me | null = null;
  // Reusamos las URLs firmadas mientras sigan vigentes: si cambian en cada recarga, las fotos se vuelven a bajar y parpadean.
  const signed = new Map<string, { url: string; until: number }>();
  const SIGNED_TTL = 60 * 60 * 6;

  async function uid(): Promise<string | null> {
    const { data } = await sb.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async function requireMe(): Promise<Me> {
    if (cachedMe?.profile?.couple_id) return cachedMe;
    const me = await api.getMe();
    if (!me?.profile?.couple_id) throw new Error("Todavía no estás en una pareja");
    return me;
  }

  const api: Api = {

    getUserId: uid,

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
          cachedMe = null;
          cb();
        }
      });
      return () => data.subscription.unsubscribe();
    },

    async signIn(email, password) {
      check(await sb.auth.signInWithPassword({ email, password }));
    },

    async signOut() {
      cachedMe = null;
      signed.clear();
      // Las fotos guardadas en este celu se borran al salir (las guarda el service worker).
      if (typeof caches !== "undefined") await caches.delete("brote-photos-v1").catch(() => false);
      await sb.auth.signOut();
    },

    async getMe() {
      const { data: s } = await sb.auth.getSession();
      const user = s.session?.user;
      if (!user) return (cachedMe = null);
      const profiles = check(await sb.from("profiles").select("id, couple_id, name, emoji, lang, avatar, joined_at")) as Profile[];
      const profile = profiles.find((p) => p.id === user.id) ?? null;
      const partner = profiles.find((p) => p.id !== user.id) ?? null;
      let couple = null;
      if (profile?.couple_id) {
        couple = check(await sb.from("couples").select("id, invite_code").eq("id", profile.couple_id).single());
      }
      cachedMe = { userId: user.id, email: user.email ?? null, profile, couple, partner };
      return cachedMe;
    },

    async createProfile({ name, lang }) {
      check(await sb.rpc("claim_profile", { p_name: name, p_lang: lang }));
      cachedMe = null;
    },

    async updateProfile(patch) {
      const id = await uid();
      check(await sb.from("profiles").update(patch).eq("id", id!));
      cachedMe = null;
    },

    async listMeals(sinceDate) {
      const rows = check(
        await sb
          .from("meals")
          // "*" para no romper el feed si todavía falta correr alguna migración (ej: review_auto).
          .select("*")
          .gte("local_date", sinceDate)
          .order("created_at", { ascending: false })
          .limit(200),
      ) as Omit<Meal, "photo_url" | "reactions">[];
      const now = Date.now();
      const paths = rows.map((r) => r.photo_path).filter((p): p is string => !!p);
      const missing = paths.filter((p) => (signed.get(p)?.until ?? 0) < now + 10 * 60 * 1000);
      const ids = rows.map((r) => r.id);
      const [signedRes, reactionRes] = await Promise.all([
        missing.length ? sb.storage.from(BUCKET).createSignedUrls(missing, SIGNED_TTL) : Promise.resolve({ data: [] }),
        ids.length
          ? sb.from("meal_reactions").select("meal_id, user_id, emoji, created_at").in("meal_id", ids).order("created_at")
          : Promise.resolve({ data: [], error: null }),
      ]);
      for (const d of signedRes.data ?? []) {
        if (d.path && d.signedUrl) signed.set(d.path, { url: d.signedUrl, until: now + SIGNED_TTL * 1000 });
      }
      // Si todavía no corriste la migración de reacciones, el feed anda igual, sin reacciones.
      const byMeal = new Map<string, MealReaction[]>();
      for (const r of (reactionRes.error ? [] : reactionRes.data ?? []) as (MealReaction & { meal_id: string })[]) {
        const list = byMeal.get(r.meal_id) ?? [];
        list.push({ user_id: r.user_id, emoji: r.emoji });
        byMeal.set(r.meal_id, list);
      }
      return rows.map((r) => ({
        ...r,
        photo_url: r.photo_path ? signed.get(r.photo_path)?.url ?? null : null,
        reactions: byMeal.get(r.id) ?? [],
      }));
    },

    async addMeal({ kind, description, photo, localDate }) {
      const me = await requireMe();
      const path = `${me.profile!.couple_id}/${me.userId}/${crypto.randomUUID()}.jpg`;
      check(await sb.storage.from(BUCKET).upload(path, photo, { contentType: "image/jpeg", upsert: false, cacheControl: "31536000" }));
      const res = await sb.from("meals").insert({ kind, description, photo_path: path, local_date: localDate });
      if (res.error) {
        await sb.storage.from(BUCKET).remove([path]);
        throw new Error(cleanError(res.error.message));
      }
    },

    async deleteMeal(meal) {
      check(await sb.from("meals").delete().eq("id", meal.id));
      if (meal.photo_path) await sb.storage.from(BUCKET).remove([meal.photo_path]);
    },

    async reviewMeal(id, verdict) {
      check(await sb.rpc("review_meal", { p_meal: id, p_verdict: verdict }));
    },

    async reactMeal(id, emoji) {
      return check(await sb.rpc("react_meal", { p_meal: id, p_emoji: emoji }));
    },

    async listPointEvents() {
      return check(
        await sb
          .from("point_events")
          .select("id, user_id, amount, kind, source_user_id, ref_date, note, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
      );
    },

    async listStoreItems() {
      return check(
        await sb.from("store_items").select("id, title, emoji, cost, active").eq("active", true).order("cost"),
      );
    },

    async addStoreItem(input) {
      check(await sb.from("store_items").insert(input));
    },

    async updateStoreItem(id, patch) {
      check(await sb.from("store_items").update(patch).eq("id", id));
    },

    async listStreaks() {
      return check(await sb.rpc("couple_streaks"));
    },

    async archiveStoreItem(id) {
      check(await sb.from("store_items").update({ active: false }).eq("id", id));
    },

    async redeem(itemId) {
      check(await sb.rpc("redeem_item", { p_item: itemId }));
    },

    async listRedemptions() {
      return check(
        await sb
          .from("redemptions")
          .select("id, user_id, title, emoji, cost, status, created_at, fulfilled_at")
          .order("created_at", { ascending: false })
          .limit(50),
      );
    },

    async fulfill(id) {
      check(await sb.rpc("fulfill_redemption", { p_id: id }));
    },

    async listSummaries() {
      return check(
        await sb.from("weekly_summaries").select("id, week_start, data").order("week_start", { ascending: false }).limit(20),
      );
    },

    async savePushSubscription(sub) {
      check(
        await sb.rpc("save_push_subscription", {
          p_endpoint: sub.endpoint,
          p_p256dh: sub.keys?.p256dh,
          p_auth: sub.keys?.auth,
          p_user_agent: navigator.userAgent.slice(0, 200),
        }),
      );
    },

    subscribeChanges(cb) {
      const ch = sb
        .channel("brote-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "meals" }, cb)
        .on("postgres_changes", { event: "*", schema: "public", table: "redemptions" }, cb)
        .on("postgres_changes", { event: "*", schema: "public", table: "point_events" }, cb)
        .subscribe();
      // Canal aparte: si la tabla de reacciones todavía no existe, no se cae el realtime del resto.
      const rx = sb.channel("brote-reactions").on("postgres_changes", { event: "*", schema: "public", table: "meal_reactions" }, cb).subscribe();
      return () => {
        sb.removeChannel(ch);
        sb.removeChannel(rx);
      };
    },
  };

  return api;
}
