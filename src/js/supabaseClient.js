import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eakwpdrmrwjksyknhlgy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVha3dwZHJtcndqa3N5a25obGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzOTY2MzIsImV4cCI6MjEwMzk3MjYzMn0.VTwVFEzHvWJDNRgITnEMgYW_XPjGJe8Zek6OA_E9UlI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project'));
};
