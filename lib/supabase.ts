import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://pegvoezlvihguxzyhjjj.supabase.co';
const fallbackKey = 'sb_publishable_jHT1y-NZbzWsBQx1cO3Zig_o79vQL0w';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const supabaseUrl = (rawUrl && rawUrl.startsWith('http')) ? rawUrl : fallbackUrl;
const supabaseAnonKey = rawKey || fallbackKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);