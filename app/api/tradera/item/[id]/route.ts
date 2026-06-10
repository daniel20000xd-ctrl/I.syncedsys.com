import { traderaGetItem } from '@/lib/tradera'

export const dynamic = 'force-dynamic'

// GET /api/tradera/item/[id] — full detail for one Tradera listing.
// Auth is handled by middleware (Bearer MCP_SECRET).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const itemId = Number(id)
    if (!Number.isFinite(itemId) || itemId <= 0) {
      return Response.json({ error: 'Invalid item id' }, { status: 400 })
    }
    const item = await traderaGetItem(itemId)
    return Response.json(item)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
