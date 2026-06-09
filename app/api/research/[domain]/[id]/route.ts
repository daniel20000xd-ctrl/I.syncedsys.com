import { researchDb, stripInternal } from '@/lib/researchDb'

export const dynamic = 'force-dynamic'

// GET /api/research/[domain]/[id] — a single record by id.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ domain: string; id: string }> }
) {
  try {
    const { domain, id } = await params

    // Indirect reference: resolve the table from the registry, not user input.
    const { data: domainRecord } = await researchDb
      .from('research_domains')
      .select('table_name')
      .eq('domain_key', domain)
      .single()

    if (!domainRecord) {
      return Response.json({ error: 'Domain not found' }, { status: 404 })
    }

    const { data, error } = await researchDb
      .from(domainRecord.table_name as string)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json({ error: 'Not found' }, { status: 404 })
      }
      throw error
    }

    return Response.json(stripInternal(data as Record<string, unknown>))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
