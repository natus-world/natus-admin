/**
 * The app's Supabase project. Both values are public identifiers, the same
 * the user app ships in its bundle: what protects the data is the sign-in and
 * the `admins` table, checked by every `admin_*` function on the server.
 * A local `.env.local` can point the panel at a local stack instead.
 */
export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://khwrauqgwopkgyvbonmp.supabase.co';
export const SUPABASE_KEY: string =
  import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_1l73E_bHeeqWO0cD6C6-fg_UmWTPvdz';
