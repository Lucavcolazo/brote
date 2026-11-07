import type { Lang } from "./i18n";

// App cerrada: solo estos dos perfiles. Los emails van en el .env (VITE_LUCA_EMAIL / VITE_GIOVANNA_EMAIL)
// y tienen que coincidir con las cuentas creadas en Supabase > Authentication > Users.
export interface AppUser {
  key: "luca" | "giovanna";
  name: string;
  emoji: string;
  email: string;
  defaultLang: Lang;
}

export const USERS: AppUser[] = [
  {
    key: "luca",
    name: "Luca",
    emoji: "🦊",
    email: (import.meta.env.VITE_LUCA_EMAIL as string | undefined) ?? "",
    defaultLang: "es",
  },
  {
    key: "giovanna",
    name: "Giovanna",
    emoji: "🌻",
    email: (import.meta.env.VITE_GIOVANNA_EMAIL as string | undefined) ?? "",
    defaultLang: "pt",
  },
];
