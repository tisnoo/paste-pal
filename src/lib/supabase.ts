import { createClient } from '@supabase/supabase-js';
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY
} from '$env/static/public';

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Supabase env vars are missing. Did you set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY?");
}

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
