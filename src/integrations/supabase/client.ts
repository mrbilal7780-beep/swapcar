import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://oyldbrllhimbvqenlkug.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bGRicmxsaGltYnZxZW5sa3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NDA1ODgsImV4cCI6MjA5ODMxNjU4OH0.mlk7SZQNFgwlPnfvcKMMgTBIb_hO-nDQrj0E0kPmSiY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  }
});