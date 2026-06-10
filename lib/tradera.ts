// Tradera v4 REST API client — live listing search + single-item lookup.
//
// Auth = X-App-Id + X-App-Key headers (public read; no per-user token needed):
//   TRADERA_APP_ID   — numeric Application Id
//   TRADERA_APP_KEY  — the application "App Key" (GUID) from the Developer Center
//
// Search uses POST /v4/search/advanced with a SearchAdvancedRequest JSON body.
// (The plain GET /v4/search only honours query/categoryId/orderBy/pageNumber and
// silently ignores the price/type/condition/seller filters — the advanced POST
// is the one that applies them.) Each result carries its own itemUrl, so callers
// get real tradera.com links straight from the API.

const BASE = 'https://api.tradera.com/v4'

export type TraderaListing = {
  id: number
  title: string
  url: string
  thumbnail: string | null
  buyNowPrice: number | null
  maxBid: number | null
  nextBid: number | null
  bidCount: number | null
  hasBids: boolean
  isEnded: boolean
  itemType: string | null
  endDate: string | null
  sellerAlias: string | null
  sellerId: number | null
  categoryId: number | null
}

export type TraderaSearchResult = {
  total: number
  totalPages: number
  page: number
  items: TraderaListing[]
}

export type TraderaSearchParams = {
  query?: string
  categoryId?: number
  priceMinimum?: number
  priceMaximum?: number
  bidsMinimum?: number
  bidsMaximum?: number
  // Free-form strings validated by Tradera (values verified against the live API).
  //   orderBy: "Relevance" | "PriceAscending" | "PriceDescending"
  //            | "EndDateAscending" | "EndDateDescending"
  //   itemStatus: "Active" | "Ended"
  //   itemType: "All" | "Auction" | "BuyItNow"
  //   itemCondition: "All" | "OnlyNew" | "OnlySecondHand"
  // (Tradera's `mode` and `sellerType` request fields are intentionally omitted —
  // every value the live API accepts for them returns zero results.)
  orderBy?: string
  itemStatus?: string
  itemType?: string
  itemCondition?: string
  searchInDescription?: boolean
  onlyAuctionsWithBuyNow?: boolean
  onlyItemsWithThumbnail?: boolean
  itemsPerPage?: number
  pageNumber?: number
}

function authHeaders(): Record<string, string> {
  const appId = process.env.TRADERA_APP_ID
  const appKey = process.env.TRADERA_APP_KEY
  if (!appId || !appKey) {
    throw new Error(
      'TRADERA_APP_ID and TRADERA_APP_KEY must be set (register an app at https://api.tradera.com → Developer Center)'
    )
  }
  return { 'X-App-Id': appId, 'X-App-Key': appKey }
}

async function traderaFetch(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), Accept: 'application/json', ...(init?.headers ?? {}) },
  })
  const text = await res.text()
  let body: unknown = null
  if (text) {
    try { body = JSON.parse(text) } catch { body = text }
  }
  if (!res.ok) {
    const detail =
      body && typeof body === 'object' && 'message' in body
        ? (body as { message: unknown }).message
        : typeof body === 'string' && body
          ? body
          : res.statusText
    throw new Error(`Tradera API ${res.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`)
  }
  return body
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function str(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  return String(v)
}

// Tradera search items expose itemUrl directly; fall back to the canonical
// /item/{categoryId}/{id} path (the form tradera.com serves) if it's ever absent.
function itemUrl(raw: unknown, categoryId: number | null, id: number): string {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (s) return s.startsWith('http') ? s : `https://www.tradera.com${s.startsWith('/') ? '' : '/'}${s}`
  if (categoryId !== null) return `https://www.tradera.com/item/${categoryId}/${id}`
  return `https://www.tradera.com/item/${id}`
}

function mapListing(it: Record<string, unknown>): TraderaListing {
  const id = num(it.id) ?? 0
  const categoryId = num(it.categoryId)
  return {
    id,
    title: str(it.shortDescription) ?? '',
    url: itemUrl(it.itemUrl, categoryId, id),
    thumbnail: str(it.thumbnailLink),
    buyNowPrice: num(it.buyItNowPrice),
    maxBid: num(it.maxBid),
    nextBid: num(it.nextBid),
    bidCount: num(it.bidCount),
    hasBids: it.hasBids === true,
    isEnded: it.isEnded === true,
    itemType: str(it.itemType),
    endDate: str(it.endDate),
    sellerAlias: str(it.sellerAlias),
    sellerId: num(it.sellerId),
    categoryId,
  }
}

export async function traderaSearch(params: TraderaSearchParams): Promise<TraderaSearchResult> {
  const page = params.pageNumber && params.pageNumber > 0 ? Math.floor(params.pageNumber) : 1
  const perPage =
    params.itemsPerPage && params.itemsPerPage > 0 ? Math.min(Math.floor(params.itemsPerPage), 50) : 25

  // SearchAdvancedRequest body — send only what's provided. Sending priceMaximum=0
  // or an empty enum would over-filter, so optional fields are omitted when unset.
  const body: Record<string, unknown> = {
    searchWords: params.query ?? '',
    itemsPerPage: perPage,
    pageNumber: page,
  }
  if (params.categoryId != null) body.categoryId = Math.floor(params.categoryId)
  if (params.priceMinimum != null) body.priceMinimum = Math.floor(params.priceMinimum)
  if (params.priceMaximum != null) body.priceMaximum = Math.floor(params.priceMaximum)
  if (params.bidsMinimum != null) body.bidsMinimum = Math.floor(params.bidsMinimum)
  if (params.bidsMaximum != null) body.bidsMaximum = Math.floor(params.bidsMaximum)
  if (params.orderBy) body.orderBy = params.orderBy
  if (params.itemStatus) body.itemStatus = params.itemStatus
  if (params.itemType) body.itemType = params.itemType
  if (params.itemCondition) body.itemCondition = params.itemCondition
  if (params.searchInDescription) body.searchInDescription = true
  if (params.onlyAuctionsWithBuyNow) body.onlyAuctionsWithBuyNow = true
  if (params.onlyItemsWithThumbnail) body.onlyItemsWithThumbnail = true

  const data = (await traderaFetch('/search/advanced', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })) as Record<string, unknown>

  const rawItems = Array.isArray(data?.items) ? (data.items as Record<string, unknown>[]) : []
  return {
    total: num(data?.totalNumberOfItems) ?? 0,
    totalPages: num(data?.totalNumberOfPages) ?? 0,
    page,
    items: rawItems.map(mapListing),
  }
}

// Full detail for one listing. The v4 Item object is already clean JSON, so we
// pass it through verbatim (Tradera's own camelCase fields: shortDescription,
// longDescription, buyItNowPrice, shippingOptions, imageLinks, …) and just
// guarantee an injected `url`.
export async function traderaGetItem(itemId: number): Promise<Record<string, unknown>> {
  const data = (await traderaFetch(`/items/${encodeURIComponent(String(Math.floor(itemId)))}`)) as Record<
    string,
    unknown
  >
  if (!data || typeof data !== 'object') throw new Error(`Tradera API: item ${itemId} not found`)
  const id = num(data.id) ?? itemId
  const categoryId = num(data.categoryId)
  return { url: itemUrl(data.itemUrl, categoryId, id), ...data }
}
