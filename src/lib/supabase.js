import { createClient } from '@supabase/supabase-js';

// Clé publique (« publishable ») : faite pour être visible dans le navigateur. La sécurité repose sur les règles RLS.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://prwxezelazbaiifpntne.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_Ok6whdEBFqR85ym00CphcQ_QH5EsWqg';
export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
