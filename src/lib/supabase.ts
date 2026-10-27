// Server-only Supabase client. Imported only from server-function handlers in
// `api.functions.ts`, so neither the module nor the key reaches the browser.
// The service-role key lives in Netlify environment variables (never VITE_*).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export class NotConfiguredError extends Error {}

export function getSupabase(): SupabaseClient {
  if (client) return client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    throw new NotConfiguredError(
      'ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูล (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) ใน Netlify',
    )
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return client
}
