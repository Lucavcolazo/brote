import { createSupabaseApi } from "./supabaseApi";
import type { Api } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Supabase llama "publishable key" a lo que antes era la "anon key": sirve cualquiera de las dos.
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

/** true si faltan las variables de Supabase: la app muestra un aviso en vez de arrancar. */
export const missingConfig = !url || !key;

export const api: Api = missingConfig ? (null as unknown as Api) : createSupabaseApi(url!, key!);
export * from "./types";
