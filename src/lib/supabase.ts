import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY ใน Netlify');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

