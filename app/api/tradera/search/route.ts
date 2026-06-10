import { traderaSearch, type TraderaSearchParams } from '@/lib/tradera'

export const dynamic = 'force-dynamic'

// GET /api/tradera/search — live Tradera listing search.
// Auth is handled by middleware (Bearer MCP_SECRET); this just proxies to the
// Tradera Public API and returns clean listings, each with a real item url.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const numParam = (key: string): number | undefined => {
      const v = searchParams.get(key)
      if (v === null || v.trim() === '') return undefined
      const n = Number(v)
      return Number.isFinite(n) ? n : undefined
    }
    const strParam = (key: string): string | undefined => {
      const v = searchParams.get(key)?.trim()
      return v ? v : undefined
    }
    const boolParam = (key: string): boolean | undefined => {
      const v = searchParams.get(key)
      if (v === null) return undefined
      return /^(1|true|yes)$/i.test(v)
    }

    const params: TraderaSearchParams = {
      query: strParam('q') ?? strParam('query'),
      categoryId: numParam('category') ?? numParam('categoryId'),
      priceMinimum: numParam('priceMin') ?? numParam('priceMinimum'),
      priceMaximum: numParam('priceMax') ?? numParam('priceMaximum'),
      bidsMinimum: numParam('bidsMin') ?? numParam('bidsMinimum'),
      bidsMaximum: numParam('bidsMax') ?? numParam('bidsMaximum'),
      orderBy: strParam('orderBy'),
      itemStatus: strParam('itemStatus'),
      itemType: strParam('itemType'),
      itemCondition: strParam('itemCondition'),
      searchInDescription: boolParam('searchInDescription'),
      onlyAuctionsWithBuyNow: boolParam('onlyAuctionsWithBuyNow'),
      onlyItemsWithThumbnail: boolParam('onlyItemsWithThumbnail'),
      itemsPerPage: numParam('perPage') ?? numParam('itemsPerPage'),
      pageNumber: numParam('page') ?? numParam('pageNumber'),
    }

    if (!params.query && params.categoryId === undefined) {
      return Response.json(
        { error: 'Provide a search query (q) and/or a category id' },
        { status: 400 }
      )
    }

    const result = await traderaSearch(params)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
