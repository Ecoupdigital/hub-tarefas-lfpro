import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://legvzsdbgyggubdomwxp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZ3Z6c2RiZ3lnZ3ViZG9td3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDU0NzcsImV4cCI6MjA5MDQ4MTQ3N30.ij4jpFdu82-flOONGiDaRa0Aln2lDXue2_lct7Z9tjY";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
