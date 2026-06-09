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

// POST /api/research/concepts — create or update a concept by unique name.
// Claude calls this before a connection batch to obtain the concept_id.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const description = typeof body?.description === 'string' ? body.description : ''

    if (!name) {
      return Response.json({ error: 'name is required' }, { status: 400 })
    }

    // Upsert on the unique `name`: insert new, or update description if it exists.
    const { data, error } = await researchDb
      .from('concepts')
      .upsert({ name, description }, { onConflict: 'name' })
      .select()
      .single()

    if (error) throw error

    return Response.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
