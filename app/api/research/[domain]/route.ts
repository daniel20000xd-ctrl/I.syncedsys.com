import { researchDb, stripInternal } from '@/lib/researchDb'
import type { RecordsResponse, ResearchRecord } from '@/types/research'

export const dynamic = 'force-dynamic'

// GET /api/research/[domain] — search/filter records in a domain.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params

    // Indirect reference: resolve the real table name from our own registry.
    // Never use the user-supplied domain string as a table name.
    const { data: domainRecord } = await researchDb
      .from('research_domains')
      .select('table_name')
      .eq('domain_key', domain)
      .single()

    if (!domainRecord) {
      return Response.json({ error: 'Domain not found' }, { status: 404 })
    }
    const table = domainRecord.table_name as string

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''
    const structuralTag = searchParams.get('structural_tag')?.trim() || ''
    const derivedTag = searchParams.get('derived_tag')?.trim() || ''
    const conceptId = searchParams.get('concept_id')?.trim() || ''
    const phase2Status = searchParams.get('phase2_status')?.trim() || ''
    const dateFrom = searchParams.get('date_from')?.trim() || ''
    const dateTo = searchParams.get('date_to')?.trim() || ''
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 100)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10) || 0

    // Select all columns (domain-agnostic — extra columns vary per domain) and
    // strip the internal fields in JS so the client never receives them.
    let query = researchDb.from(table).select('*', { count: 'exact' })

    if (q) {
      // Full-text on title + summary (Swedish). Sanitise to keep PostgREST's
      // or()/fts() separators intact, matching the existing /api/cases pattern.
      const safe = q.replace(/[^a-zA-ZåäöÅÄÖéèüúùóòàá0-9\s]/g, ' ').trim()
      if (safe) {
        query = query.or(`title.fts(swedish).${safe},summary.fts(swedish).${safe}`)
      }
    }
    if (structuralTag) {
      query = query.contains('structural_tags', JSON.stringify([{ tag: structuralTag }]))
    }
    if (derivedTag) {
      query = query.contains('derived_tags', JSON.stringify([{ tag: derivedTag }]))
    }
    if (conceptId) {
      query = query.contains('derived_tags', JSON.stringify([{ concept_id: conceptId }]))
    }
    if (phase2Status) query = query.eq('phase2_status', phase2Status)
    if (dateFrom) query = query.gte('record_date', dateFrom)
    if (dateTo) query = query.lte('record_date', dateTo)

    query = query
      .order('record_date', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    const records = (data ?? []).map((r) =>
      stripInternal(r as Record<string, unknown>)
    ) as unknown as ResearchRecord[]

    const body: RecordsResponse = {
      records,
      total: count ?? 0,
      limit,
      offset,
      domain,
    }
    return Response.json(body)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
