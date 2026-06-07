import { createClient } from '@/lib/supabase/server'

const SELECT = 'id,malnummer,referat,domstol,domstolskod,avgorande_datum,rubrik,sammanfattning,lagrum,sokord,url,fulltext_url,amnesomrade,scraped_at'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('rattspraxis')
      .select(SELECT)
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
