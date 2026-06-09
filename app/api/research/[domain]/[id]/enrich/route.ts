import { researchDb, stripInternal } from '@/lib/researchDb'

export const dynamic = 'force-dynamic'

// POST /api/research/[domain]/[id]/enrich — Phase 2 write.
// Claude pushes structural tags it assigned for a record.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ domain: string; id: string }> }
) {
  try {
    const { domain, id } = await params

    // Indirect reference: resolve the table from the registry, never raw input.
    const { data: domainRecord } = await researchDb
      .from('research_domains')
      .select('table_name')
      .eq('domain_key', domain)
      .single()

    if (!domainRecord) {
      return Response.json({ error: 'Domain not found' }, { status: 404 })
    }
    const table = domainRecord.table_name as string

    const body = await req.json()
    const incoming = Array.isArray(body?.structural_tags) ? body.structural_tags : []
    const now = new Date().toISOString()

    // Server-stamp each tag. An empty array is valid (record has no tags).
    const structural_tags = incoming
      .filter((t: { tag?: unknown }) => t && typeof t.tag === 'string')
      .map((t: { tag: string; category?: string; confidence?: number }) => ({
        tag: t.tag,
        category: t.category,
        confidence: t.confidence,
        added_at: now,
      }))

    const { data, error } = await researchDb
      .from(table)
      .update({
        structural_tags,
        phase2_status: 'done',
        phase2_ran_at: now,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json({ error: 'Not found' }, { status: 404 })
      }
      throw error
    }

    await researchDb
      .from('research_domains')
      .update({ last_enriched_at: now })
      .eq('domain_key', domain)

    return Response.json(stripInternal(data as Record<string, unknown>))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
