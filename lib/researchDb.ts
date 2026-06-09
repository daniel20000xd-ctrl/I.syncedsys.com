import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Service-role client for the SEPARATE research Supabase project (not the main
// hub project). The research DB has RLS enabled but no policies — the service
// key bypasses RLS, and access is gated by this satellite's admin middleware.
//
// Initialised lazily (NOT at module top level) so a missing env var can't crash
// the build / SSR pass, mirroring the lib/supabase/* pattern in this repo. The
// Proxy preserves the `researchDb.from(...)` call sites used across the routes.
let _researchDb: SupabaseClient | null = null

function init(): SupabaseClient {
  if (!_researchDb) {
    const url = process.env.RESEARCH_SUPABASE_URL
    const key = process.env.RESEARCH_SUPABASE_SERVICE_KEY
    if (!url || !key) {
      throw new Error(
        'RESEARCH_SUPABASE_URL and RESEARCH_SUPABASE_SERVICE_KEY must be set'
      )
    }
    _researchDb = createClient(url, key, { auth: { persistSession: false } })
  }
  return _researchDb
}

export const researchDb = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = init()
    const value = Reflect.get(client as object, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

// Internal columns that must never leave the API. raw_data is the full untouched
// source record; phase2_error is operational. Stripped from every record response.
export function stripInternal(row: Record<string, unknown>): Record<string, unknown> {
  const clone = { ...row }
  delete clone.raw_data
  delete clone.phase2_error
  return clone
}
