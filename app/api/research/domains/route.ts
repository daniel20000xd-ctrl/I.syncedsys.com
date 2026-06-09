import { researchDb } from '@/lib/researchDb'

export const dynamic = 'force-dynamic'

// GET /api/research/domains — list all active domains. How Claude discovers
// what's available.
export async function GET() {
  try {
    const { data, error } = await researchDb
      .from('research_domains')
      .select(
        'domain_key, display_name, record_count, last_ingested_at, last_enriched_at, last_connected_at'
      )
      .order('domain_key', { ascending: true })

    if (error) throw error

    return Response.json({ domains: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
