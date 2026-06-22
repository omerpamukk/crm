import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Eksik Supabase ortam değişkenleri. Lütfen .env dosyasında NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY değerlerini tanımlayın (.env.example dosyasını referans alın)."
  );
}

/**
 * Paylaşılan Supabase istemcisi.
 * Bağlantı bilgileri .env üzerinden okunur; gerçek .env asla commit edilmez.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
