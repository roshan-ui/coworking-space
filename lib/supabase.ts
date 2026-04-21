import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

export type Member = {
  id: string
  name: string
  email: string
  avatar_url: string | null
  is_online: boolean
  last_seen: string
}

export type Project = {
  id: string
  name: string
  description: string | null
  drive_link: string | null
  meet_link: string
  created_by: string | null
  created_at: string
  members?: Member[]
}
