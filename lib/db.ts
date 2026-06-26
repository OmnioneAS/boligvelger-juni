// Server-only Supabase client — never import this from a client component or
// any file that runs in the browser. The service role key has full DB access.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
if (!supabaseServiceRoleKey) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY');

export const db = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

// Public (anon) client — safe to use in server components for read-only queries
// where we want to honour RLS read policies, but in v1 service role is simpler.
export const dbPublic = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
);
