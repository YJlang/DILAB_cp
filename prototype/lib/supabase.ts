import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  // NEXT_PUBLIC_ 접두사 제거 — Next.js 가 build 시 inline 하지 않도록.
  // server-only 사용이므로 client bundle 진출 불필요. Cloudflare runtime vars 가 즉시 적용됨.
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY required at runtime");
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

// Lazy proxy — module evaluate 시 createClient 호출 안 함.
// 빌드 컨테이너에 env 없어도 모듈 평가는 통과, 실제 호출 시점에만 init.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
