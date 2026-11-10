export type MealKind = "fruta" | "verdura" | "ambas";
export type Verdict = "ok" | "rejected";

export interface Profile {
  id: string;
  couple_id: string | null;
  name: string;
  emoji: string;
  lang: "es" | "pt";
  avatar: unknown;
  joined_at: string;
}

/** Una fruta o verdura distinta del álbum (sale de las descripciones de las fotos). */
export interface AlbumItem {
  user_id: string;
  item: string;
  label: string;
  times: number;
  first_date: string;
}

export interface Streak {
  user_id: string;
  current_streak: number;
  best_streak: number;
}

export interface Couple {
  id: string;
  invite_code: string;
}

export interface MealReaction {
  user_id: string;
  emoji: string;
}

export interface Meal {
  id: string;
  user_id: string;
  kind: MealKind;
  description: string;
  photo_path: string | null;
  photo_url: string | null;
  photo_deleted_at: string | null;
  local_date: string;
  review: Verdict | null;
  /** true si se aprobó sola al cerrar el día porque nadie la revisó. */
  review_auto?: boolean;
  created_at: string;
  reactions: MealReaction[];
}

/** La nota de un examen. Si vale: 6 o más da 1 punto a quien la sacó; menos de 6, a su pareja. */
export interface Exam {
  id: string;
  user_id: string;
  subject: string;
  grade: number;
  /** El día en que se cargó: se revisa hasta las 8:00 del día siguiente. */
  local_date: string;
  review: Verdict | null;
  review_auto: boolean;
  created_at: string;
}

export interface PointEvent {
  id: string;
  user_id: string;
  amount: number;
  kind: "miss" | "redeem" | "adjust" | "exam";
  source_user_id: string | null;
  exam_id?: string | null;
  ref_date: string | null;
  note: string | null;
  created_at: string;
}

export interface StoreItem {
  id: string;
  title: string;
  emoji: string;
  cost: number;
  active: boolean;
  /** Quién lo cargó: solo esa persona lo edita, y lo canjea su pareja. */
  created_by: string | null;
}

export interface Redemption {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  cost: number;
  status: "pendiente" | "cumplido";
  created_at: string;
  fulfilled_at: string | null;
}

export interface SummaryMember {
  user_id: string;
  name: string;
  emoji: string;
  days_ok: number;
  fruits: number;
  veggies: number;
  points_week: number;
  balance: number;
  streak?: number;
  best_streak?: number;
  meals: { date: string; kind: MealKind; description: string; rejected: boolean }[];
}

export interface WeeklySummary {
  id: string;
  week_start: string;
  data: { week_start: string; week_end: string; members: SummaryMember[] };
}

export interface Me {
  userId: string;
  email: string | null;
  profile: Profile | null;
  couple: Couple | null;
  partner: Profile | null;
}

export interface Api {
  getUserId(): Promise<string | null>;
  onAuthChange(cb: () => void): () => void;
  /** Entra con email y contraseña. Las 2 cuentas se crean a mano en Supabase; la sesión queda abierta. */
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;

  getMe(): Promise<Me | null>;
  /** Crea el perfil la primera vez que alguien entra (app cerrada: máximo 2). */
  createProfile(input: { name: string; lang: Profile["lang"] }): Promise<void>;
  updateProfile(patch: Partial<Pick<Profile, "name" | "lang" | "avatar">>): Promise<void>;
  listStreaks(): Promise<Streak[]>;
  listAlbum(): Promise<AlbumItem[]>;

  listMeals(sinceDate: string): Promise<Meal[]>;
  addMeal(input: { kind: MealKind; description: string; photo: Blob; localDate: string }): Promise<void>;
  deleteMeal(meal: Meal): Promise<void>;
  reviewMeal(id: string, verdict: Verdict): Promise<void>;
  /** Una reacción por persona y foto: otra la cambia, la misma (o null) la saca. Devuelve la que quedó. */
  reactMeal(id: string, emoji: string | null): Promise<string | null>;

  listExams(): Promise<Exam[]>;
  addExam(input: { subject: string; grade: number }): Promise<void>;
  deleteExam(id: string): Promise<void>;
  reviewExam(id: string, verdict: Verdict): Promise<void>;

  listPointEvents(): Promise<PointEvent[]>;
  listStoreItems(): Promise<StoreItem[]>;
  addStoreItem(input: { title: string; cost: number }): Promise<void>;
  updateStoreItem(id: string, patch: { title?: string; cost?: number }): Promise<void>;
  archiveStoreItem(id: string): Promise<void>;
  redeem(itemId: string): Promise<void>;
  listRedemptions(): Promise<Redemption[]>;
  fulfill(id: string): Promise<void>;
  listSummaries(): Promise<WeeklySummary[]>;

  savePushSubscription(sub: PushSubscriptionJSON): Promise<void>;
  subscribeChanges(cb: () => void): () => void;
}
