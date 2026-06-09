import { researchDb } from '@/lib/researchDb'

export const dynamic = 'force-dynamic'

// GET /api/research/concepts/[id] — a single concept by UUID.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data, error } = await researchDb
      .from('concepts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json({ error: 'Not found' }, { status: 404 })
      }
      throw error
    }

    return Response.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
