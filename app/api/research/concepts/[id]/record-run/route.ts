import { researchDb } from '@/lib/researchDb'

export const dynamic = 'force-dynamic'

// POST /api/research/concepts/[id]/record-run — bump a concept's run stats.
// Claude calls this once at the end of a connection batch for a domain.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const domain = typeof body?.domain === 'string' ? body.domain : ''

    const { data: concept, error: readErr } = await researchDb
      .from('concepts')
      .select('total_runs, domains_searched')
      .eq('id', id)
      .single()

    if (readErr) {
      if (readErr.code === 'PGRST116') {
        return Response.json({ error: 'Not found' }, { status: 404 })
      }
      throw readErr
    }

    const domains = Array.isArray(concept.domains_searched) ? concept.domains_searched : []
    if (domain && !domains.includes(domain)) domains.push(domain)

    const { data, error } = await researchDb
      .from('concepts')
      .update({
        total_runs: (concept.total_runs ?? 0) + 1,
        last_run_at: new Date().toISOString(),
        domains_searched: domains,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return Response.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
