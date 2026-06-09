import { researchDb } from '@/lib/researchDb'

export const dynamic = 'force-dynamic'

// GET /api/research/concepts — list latent concepts, newest run first.
// Optional: ?q=<name contains>  ?domain=<run on this domain_key>
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''
    const domain = searchParams.get('domain')?.trim() || ''

    let query = researchDb.from('concepts').select('*')

    if (q) query = query.ilike('name', `%${q}%`)
    if (domain) {
      query = query.contains('domains_searched', JSON.stringify([domain]))
    }

    query = query.order('last_run_at', { ascending: false, nullsFirst: false })

    const { data, error } = await query
    if (error) throw error

    return Response.json({ concepts: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
