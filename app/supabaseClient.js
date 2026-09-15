import { createClient } from '@supabase/supabase-js'

// Reemplaza estos valores con los de tu proyecto de Supabase
const SUPABASE_URL = 'https://didruljdbfdvysandbri.supabase.co/rest/v1/'
const SUPABASE_ANON_KEY = 'sb_publishable_fBw1DKCw_VdLU48S6V7QzA_DJbbabJa'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)