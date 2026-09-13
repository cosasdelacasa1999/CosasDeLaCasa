import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pegvoezlvihguxzyhjjj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZ3ZvZXpsdmloZ3V4enloampqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMzMwMjAsImV4cCI6MjEwNDkwOTAyMH0.gMncZNh5fE-Dn4BIrONiUsX5GlqkM7oHcw79c4lyfd8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);