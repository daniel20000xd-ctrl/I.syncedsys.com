import { researchDb } from '@/lib/researchDb'

export const dynamic = 'force-dynamic'

// POST /api/research/[domain]/[id]/connect — Phase 3 write.
// Records the outcome of checking one concept against one record: appends a
// derived tag if relevant, and always marks the concept as checked (so the
// record won't be re-processed for it).
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
    const concept_id = typeof body?.concept_id === 'string' ? body.concept_id : ''
    const concept_name = typeof body?.concept_name === 'string' ? body.concept_name : ''
    const relevant = !!body?.relevant
    const { confidence, reasoning, specific_passage } = body ?? {}

    if (!concept_id) {
      return Response.json({ error: 'concept_id is required' }, { status: 400 })
    }

    // Read the current arrays, then mutate + write back.
    const { data: current, error: readErr } = await researchDb
      .from(table)
      .select('derived_tags, phase3_concept_ids')
      .eq('id', id)
      .single()

    if (readErr) {
      if (readErr.code === 'PGRST116') {
        return Response.json({ error: 'Not found' }, { status: 404 })
      }
      throw readErr
    }

    const derived = Array.isArray(current.derived_tags) ? current.derived_tags : []
    const conceptIds = Array.isArray(current.phase3_concept_ids)
      ? current.phase3_concept_ids
      : []

    if (relevant) {
      derived.push({
        tag: concept_name,
        concept_id,
        confidence,
        reasoning,
        specific_passage: specific_passage ?? null,
        added_at: new Date().toISOString(),
      })
    }

    // Always mark the concept as checked against this record (idempotent).
    if (!conceptIds.map((c: unknown) => String(c)).includes(concept_id)) {
      conceptIds.push(concept_id)
    }

    const { error: updErr } = await researchDb
      .from(table)
      .update({ derived_tags: derived, phase3_concept_ids: conceptIds })
      .eq('id', id)

    if (updErr) throw updErr

    await researchDb
      .from('research_domains')
      .update({ last_connected_at: new Date().toISOString() })
      .eq('domain_key', domain)

    return Response.json({ ok: true, relevant })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
