import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js';

const supabaseUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey);
}

/** 是否已設定 Supabase（未設定則只用本機 localStorage / JSON 匯出） */
export const supabaseEnabled = client !== null;

export function getSupabaseClient(): SupabaseClient | null {
  return client;
}

// ---- 認證 helpers ----

/** 註冊新帳號 */
export async function signUp(email: string, password: string) {
  const c = getSupabaseClient();
  if (!c) throw new Error('雲端未設定');
  return c.auth.signUp({ email, password });
}

/** 登入 */
export async function signIn(email: string, password: string) {
  const c = getSupabaseClient();
  if (!c) throw new Error('雲端未設定');
  return c.auth.signInWithPassword({ email, password });
}

/** 登出 */
export async function signOut() {
  const c = getSupabaseClient();
  if (!c) return;
  await c.auth.signOut();
}

/** 取得目前登入使用者 */
export async function getCurrentUser(): Promise<User | null> {
  const c = getSupabaseClient();
  if (!c) return null;
  const { data } = await c.auth.getUser();
  return data.user;
}

/** 取得目前 session */
export async function getSession(): Promise<Session | null> {
  const c = getSupabaseClient();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session;
}

export const LESSONS_TABLE = 'lessons';
