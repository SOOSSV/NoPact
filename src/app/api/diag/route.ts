// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

const ID = "5eb090b7-01bd-4186-9305-a258963596fb";
const LABEL = "763c5e99-8996-416a-a902-2212d489ac96";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const db = createClient(url, key, { auth: { persistSession: false } });
  const show = (r) =>
    r.error ? `${r.status} ${r.error.code} ${r.error.message}`.slice(0, 160) : `${r.status} ok`;

  const run = async () => {
    const t = Date.now();
    const [user, label, members, login] = await Promise.all([
      db.from("app_users").select("id").eq("id", ID).single().then(show),
      db.from("labels").select("id").eq("id", LABEL).single().then(show),
      db.from("memberships").select("id, app_users!inner(name)").eq("label_id", LABEL).then(show),
      fetch(`${url}/rest/v1/login_users?select=id&username=eq.soossv`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      })
        .then(async (r) => (r.ok ? `${r.status} ok` : `${r.status} ${(await r.text()).slice(0, 160)}`))
        .catch((e) => `fetch: ${e.message} ${e.cause?.code ?? ""}`),
    ]);
    return { ms: Date.now() - t, user, label, members, login };
  };

  const results = [];
  for (let i = 0; i < 5; i++) results.push(await run());
  results.push(...(await Promise.all([run(), run(), run(), run(), run()])));

  return Response.json({
    region: process.env.VERCEL_REGION ?? null,
    url,
    keyStart: key.slice(0, 10),
    keyLength: key.length,
    results,
  });
}
