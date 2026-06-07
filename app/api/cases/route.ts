import { createClient } from '@/lib/supabase/server'
import type { CasesResponse } from '@/types/legal'

const SELECT = 'id,malnummer,referat,domstol,domstolskod,avgorande_datum,rubrik,sammanfattning,lagrum,sokord,url,fulltext_url,amnesomrade,scraped_at'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''
    const court = searchParams.get('court')?.trim() || ''
    const amnesomrade = searchParams.get('amnesomrade')?.trim() || ''
    const from = searchParams.get('from')?.trim() || ''
    const to = searchParams.get('to')?.trim() || ''
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 100)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10) || 0

    const supabase = await createClient()

    let query = supabase
      .from('rattspraxis')
      .select(SELECT, { count: 'exact' })

    if (q) {
      // Search both rubrik and sammanfattning using PostgREST fts filter
      const safe = q.replace(/[^a-zA-ZåäöÅÄÖéèüúùóòàá0-9\s]/g, ' ').trim()
      query = query.or(
        `rubrik.fts(swedish).${safe},sammanfattning.fts(swedish).${safe}`
      )
    }

    if (court) query = query.eq('domstolskod', court)
    if (amnesomrade) query = query.eq('amnesomrade', amnesomrade)
    if (from) query = query.gte('avgorande_datum', from)
    if (to) query = query.lte('avgorande_datum', to)

    query = query
      .order('avgorande_datum', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    const body: CasesResponse = {
      cases: (data ?? []) as CasesResponse['cases'],
      total: count ?? 0,
      limit,
      offset,
    }

    return Response.json(body)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
