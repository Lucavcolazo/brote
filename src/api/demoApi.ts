// Modo demo: todo en memoria, sin Supabase. Sirve para ver la app antes de configurarla.
// Los datos son sintéticos (inventados para mostrar la interfaz).
import { DEFAULT_AVATARS } from "../avatar/model";
import { addDays, localToday } from "../lib/dates";
import type { Api, Meal, MealKind, PointEvent, Profile, Redemption, StoreItem, Streak, WeeklySummary } from "./types";

const LUCA = "demo-luca";
const GIO = "demo-giovanna";
const COUPLE = "demo-couple";

/** Foto sintética: un plato visto desde arriba, dibujado en SVG. */
function photo(fruit: string, plate: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="${bg}"/>
  <circle cx="200" cy="205" r="150" fill="#fff" opacity=".92"/><circle cx="200" cy="205" r="118" fill="${plate}"/>
  <circle cx="170" cy="185" r="46" fill="${fruit}"/><circle cx="238" cy="222" r="38" fill="${fruit}" opacity=".85"/>
  <circle cx="196" cy="252" r="26" fill="${fruit}" opacity=".7"/><circle cx="158" cy="170" r="9" fill="#fff" opacity=".45"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const today = localToday();
const iso = (daysAgo: number, h: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, 12, 0, 0);
  return d.toISOString();
};

let profiles: Profile[] = [
  { id: LUCA, couple_id: COUPLE, name: "Luca", emoji: "", lang: "es", avatar: DEFAULT_AVATARS.luca, joined_at: iso(30, 9) },
  { id: GIO, couple_id: COUPLE, name: "Giovanna", emoji: "", lang: "pt", avatar: DEFAULT_AVATARS.giovanna, joined_at: iso(30, 9) },
];

function m(user: string, kind: MealKind, description: string, daysAgo: number, h: number, colors: [string, string, string], review: Meal["review"]): Meal {
  return {
    id: crypto.randomUUID(), user_id: user, kind, description,
    photo_path: "demo", photo_url: photo(...colors), photo_deleted_at: null,
    local_date: addDays(today, -daysAgo), review, created_at: iso(daysAgo, h),
  };
}

let meals: Meal[] = [
  m(GIO, "fruta", "Bowl de frutillas con yogur", 0, 9, ["#E8432E", "#FCE3DF", "#F3EFE9"], null),
  m(LUCA, "verdura", "Ensalada de rúcula y tomate", 1, 13, ["#2F9E57", "#E4F3E7", "#EDF1EA"], "ok"),
  m(GIO, "ambas", "Wok de verduras y mandarina", 1, 21, ["#F27A1F", "#FFF0E1", "#F1EEEA"], "ok"),
  m(LUCA, "fruta", "Banana antes de entrenar", 2, 8, ["#F6C928", "#FFF8DC", "#F2F0E8"], "ok"),
  m(GIO, "fruta", "Manzana verde", 3, 17, ["#9BCB2F", "#F1F8DF", "#EEF0EA"], "ok"),
  m(LUCA, "verdura", "Zanahoria rallada", 4, 20, ["#F27A1F", "#FFEBD6", "#F2EEE9"], "rejected"),
  m(LUCA, "fruta", "Pera", 5, 10, ["#C9D84A", "#F6F9E2", "#EEF0EA"], "ok"),
  m(LUCA, "verdura", "Brócoli al vapor", 6, 20, ["#2F9E57", "#E3F2E6", "#EDF1EA"], "ok"),
  m(GIO, "verdura", "Calabaza al horno", 6, 13, ["#F27A1F", "#FFF0E1", "#F1EEEA"], "ok"),
];

const miss = (id: string, to: string, from: string, daysAgo: number): PointEvent => ({
  id, user_id: to, amount: 1, kind: "miss", source_user_id: from, ref_date: addDays(today, -daysAgo), note: null, created_at: iso(daysAgo - 1, 10),
});
let points: PointEvent[] = [
  miss("p1", LUCA, GIO, 2), miss("p2", GIO, LUCA, 3), miss("p3", LUCA, GIO, 4), miss("p4", LUCA, GIO, 5),
  miss("p5", GIO, LUCA, 9), miss("p6", LUCA, GIO, 10), miss("p7", LUCA, GIO, 12), miss("p8", GIO, LUCA, 13),
];

// La tienda arranca vacía: los premios los cargan ustedes.
let items: StoreItem[] = [];
let redemptions: Redemption[] = [];

const lastMonday = addDays(today, -((new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7) - 7);
const summaries: WeeklySummary[] = [
  {
    id: "s1", week_start: lastMonday,
    data: {
      week_start: lastMonday, week_end: addDays(lastMonday, 6),
      members: [
        { user_id: LUCA, name: "Luca", emoji: "", days_ok: 6, fruits: 4, veggies: 3, points_week: 2, balance: 4, streak: 5, best_streak: 6, meals: [
          { date: lastMonday, kind: "fruta", description: "Pera", rejected: false },
          { date: addDays(lastMonday, 1), kind: "verdura", description: "Calabaza al horno", rejected: false },
          { date: addDays(lastMonday, 3), kind: "ambas", description: "Ensalada de frutas y espinaca", rejected: false },
        ] },
        { user_id: GIO, name: "Giovanna", emoji: "", days_ok: 4, fruits: 3, veggies: 2, points_week: 1, balance: 3, streak: 1, best_streak: 4, meals: [
          { date: lastMonday, kind: "fruta", description: "Kiwi", rejected: false },
          { date: addDays(lastMonday, 2), kind: "verdura", description: "Brócoli", rejected: false },
        ] },
      ],
    },
  },
];

function streakOf(uid: string): Streak {
  const days = new Set(meals.filter((x) => x.user_id === uid && x.review !== "rejected").map((x) => x.local_date));
  let cur = 0;
  let d = days.has(today) ? today : addDays(today, -1);
  while (days.has(d)) { cur++; d = addDays(d, -1); }
  let best = 0, run = 0;
  for (let i = 60; i >= 0; i--) {
    if (days.has(addDays(today, -i))) { run++; best = Math.max(best, run); } else run = 0;
  }
  return { user_id: uid, current_streak: cur, best_streak: best };
}

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
let signedIn = false;
let meId = LUCA;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

export function createDemoApi(): Api {
  return {
    demo: true,
    async getUserId() { return signedIn ? meId : null; },
    onAuthChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    async signIn(email) { await wait(); meId = email.startsWith("giovanna") ? GIO : LUCA; signedIn = true; emit(); },
    async signOut() { signedIn = false; emit(); },

    async getMe() {
      if (!signedIn) return null;
      return {
        userId: meId, email: meId === LUCA ? "luca@demo" : "giovanna@demo",
        profile: profiles.find((p) => p.id === meId)!,
        couple: { id: COUPLE, invite_code: "DEMO" },
        partner: profiles.find((p) => p.id !== meId)!,
      };
    },
    async ensureProfile({ lang }) { profiles = profiles.map((p) => (p.id === meId ? { ...p, lang } : p)); },
    async updateProfile(patch) { await wait(150); profiles = profiles.map((p) => (p.id === meId ? { ...p, ...patch } : p)); },
    async listStreaks() { return [streakOf(LUCA), streakOf(GIO)]; },

    async listMeals(since) { await wait(150); return meals.filter((x) => x.local_date >= since); },
    async addMeal({ kind, description, photo: blob, localDate }) {
      await wait(600);
      meals = [{
        id: crypto.randomUUID(), user_id: meId, kind, description, photo_path: "demo",
        photo_url: URL.createObjectURL(blob), photo_deleted_at: null, local_date: localDate,
        review: null, created_at: new Date().toISOString(),
      }, ...meals];
    },
    async deleteMeal(meal) { meals = meals.filter((x) => x.id !== meal.id); },
    async reviewMeal(id, verdict) { meals = meals.map((x) => (x.id === id ? { ...x, review: verdict } : x)); },

    async listPointEvents() { return [...points].sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    async listStoreItems() { return items.filter((i) => i.active).sort((a, b) => a.cost - b.cost); },
    async addStoreItem(input) { await wait(150); items = [...items, { id: crypto.randomUUID(), active: true, emoji: "", ...input }]; },
    async updateStoreItem(id, patch) { await wait(150); items = items.map((i) => (i.id === id ? { ...i, ...patch } : i)); },
    async archiveStoreItem(id) { items = items.map((i) => (i.id === id ? { ...i, active: false } : i)); },
    async redeem(itemId) {
      await wait();
      const item = items.find((i) => i.id === itemId)!;
      const bal = points.filter((p) => p.user_id === meId).reduce((s, p) => s + p.amount, 0);
      if (bal < item.cost) throw new Error("not_enough_points");
      const id = crypto.randomUUID();
      redemptions = [{ id, user_id: meId, title: item.title, emoji: "", cost: item.cost, status: "pendiente", created_at: new Date().toISOString(), fulfilled_at: null }, ...redemptions];
      points = [...points, { id: crypto.randomUUID(), user_id: meId, amount: -item.cost, kind: "redeem", source_user_id: null, ref_date: null, note: `Canje: ${item.title}`, created_at: new Date().toISOString() }];
    },
    async listRedemptions() { return redemptions; },
    async fulfill(id) { redemptions = redemptions.map((r) => (r.id === id ? { ...r, status: "cumplido", fulfilled_at: new Date().toISOString() } : r)); },
    async listSummaries() { return summaries; },

    async savePushSubscription() {},
    subscribeChanges() { return () => {}; },
  };
}
