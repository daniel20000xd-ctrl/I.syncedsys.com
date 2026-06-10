// Tradera Public API (SOAP v3) client — live listing search + single-item lookup.
//
// Auth is AppId + Public Key (sent as the SOAP AuthenticationHeader's AppKey).
// The Public Key authorises *public read* data only (search, item info) — no
// per-user token/login flow is needed. Credentials come from env:
//   TRADERA_APP_ID      — your application id (a number)
//   TRADERA_PUBLIC_KEY  — your application's Public Key (a GUID)
//   TRADERA_SANDBOX     — "1"/"true" to hit Tradera's sandbox (default: live)
//
// Each search result carries its own ItemUrl, so callers get real tradera.com
// links straight from the API rather than us reconstructing them.

import { XMLParser } from 'fast-xml-parser'

const SEARCH_ENDPOINT = 'https://api.tradera.com/v3/SearchService.asmx'
const PUBLIC_ENDPOINT = 'https://api.tradera.com/v3/PublicService.asmx'
const NS = 'http://api.tradera.com'

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
  errors?: string[]
}

export type TraderaSearchParams = {
  query?: string
  categoryId?: number
  priceMinimum?: number
  priceMaximum?: number
  bidsMinimum?: number
  bidsMaximum?: number
  // Free-form strings validated by Tradera. Common values:
  //   mode: "AllWords" | "AnyWords"
  //   itemStatus: "Active" | "Ended"
  //   itemType: "All" | "Auction" | "FixedPrice"
  //   itemCondition: "All" | "OnlyNew" | "OnlySecondHand"
  //   sellerType: "All" | "OnlyPrivate" | "OnlyBusiness"
  //   orderBy: e.g. "Relevance" | "PriceAscending" | "PriceDescending" |
  //            "EndDateAscending" | "BidsDescending"
  mode?: string
  orderBy?: string
  itemStatus?: string
  itemType?: string
  itemCondition?: string
  sellerType?: string
  searchInDescription?: boolean
  onlyAuctionsWithBuyNow?: boolean
  onlyItemsWithThumbnail?: boolean
  itemsPerPage?: number
  pageNumber?: number
}

function credentials(): { appId: string; appKey: string; sandbox: number } {
  const appId = process.env.TRADERA_APP_ID
  const appKey = process.env.TRADERA_PUBLIC_KEY
  if (!appId || !appKey) {
    throw new Error(
      'TRADERA_APP_ID and TRADERA_PUBLIC_KEY must be set (register an app at https://api.tradera.com)'
    )
  }
  const sandbox = /^(1|true)$/i.test(process.env.TRADERA_SANDBOX ?? '') ? 1 : 0
  return { appId, appKey, sandbox }
}

function esc(v: string): string {
  return v.replace(/[<>&'"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === "'" ? '&apos;' : '&quot;'
  )
}

function num(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function str(v: unknown): string | null {
  if (v === '' || v === null || v === undefined) return null
  return String(v)
}

function bool(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1'
}

function int(v: number | undefined | null, dflt: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : dflt
}

// Tradera search items expose ItemUrl directly; fall back to the canonical
// /item/{categoryId}/{id} path (the form tradera.com actually serves) if absent.
function itemUrl(raw: unknown, categoryId: number | null, id: number): string {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (s) return s.startsWith('http') ? s : `https://www.tradera.com${s.startsWith('/') ? '' : '/'}${s}`
  if (categoryId !== null) return `https://www.tradera.com/item/${categoryId}/${id}`
  return `https://www.tradera.com/item/${id}`
}

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: true,
  parseTagValue: true,
  trimValues: true,
  isArray: (name) => name === 'SearchItem' || name === 'ImageLink' || name === 'string',
})

function headerXml(appId: string, appKey: string, sandbox: number): string {
  return (
    `<AuthenticationHeader xmlns="${NS}">` +
    `<AppId>${esc(appId)}</AppId>` +
    `<AppKey>${esc(appKey)}</AppKey>` +
    `</AuthenticationHeader>` +
    `<ConfigurationHeader xmlns="${NS}">` +
    `<Sandbox>${sandbox}</Sandbox>` +
    `<MaxResultAge>0</MaxResultAge>` +
    `</ConfigurationHeader>`
  )
}

function extractFault(xml: string): string | null {
  const m = xml.match(/<faultstring>([\s\S]*?)<\/faultstring>/i)
  return m ? m[1].trim() : null
}

// Resilient to the per-operation wrapper names (SearchResponse/SearchResult,
// SearchAdvancedResponse/SearchAdvancedResult, GetItemResponse/GetItemResult):
// find the first *Response, then its first *Result.
function firstResult(body: Record<string, unknown>): unknown {
  for (const k of Object.keys(body)) {
    if (k === 'Fault') continue
    const resp = body[k]
    if (resp && typeof resp === 'object') {
      for (const [rk, rv] of Object.entries(resp as Record<string, unknown>)) {
        if (/Result$/.test(rk)) return rv
      }
    }
  }
  return null
}

async function callSoap(
  endpoint: string,
  action: string,
  bodyXml: string
): Promise<Record<string, unknown>> {
  const { appId, appKey, sandbox } = credentials()
  const envelope =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<soap:Header>${headerXml(appId, appKey, sandbox)}</soap:Header>` +
    `<soap:Body>${bodyXml}</soap:Body>` +
    `</soap:Envelope>`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: `"${action}"`,
      'User-Agent': 'syncedsys-i/1.0',
    },
    body: envelope,
  })

  const text = await res.text()
  if (!res.ok) {
    // Auth/validation problems come back as HTTP 500 carrying a SOAP Fault.
    const fault = extractFault(text)
    throw new Error(`Tradera API ${res.status}: ${fault ?? text.slice(0, 300)}`)
  }

  const parsed = parser.parse(text) as Record<string, unknown>
  const envelopeObj = parsed?.Envelope as Record<string, unknown> | undefined
  const body = envelopeObj?.Body as Record<string, unknown> | undefined
  if (!body) throw new Error('Tradera API: unexpected response shape')
  if (body.Fault) {
    const fault = body.Fault as Record<string, unknown>
    throw new Error(`Tradera SOAP fault: ${fault.faultstring ?? JSON.stringify(fault)}`)
  }
  return body
}

function collectErrors(errors: unknown): string[] {
  const out: string[] = []
  const walk = (v: unknown) => {
    if (v === null || v === undefined || v === '') return
    if (Array.isArray(v)) v.forEach(walk)
    else if (typeof v === 'object') Object.values(v as Record<string, unknown>).forEach(walk)
    else out.push(String(v))
  }
  walk(errors)
  return out
}

function mapListing(it: Record<string, unknown>): TraderaListing {
  const id = num(it.Id) ?? 0
  const categoryId = num(it.CategoryId)
  return {
    id,
    title: str(it.ShortDescription) ?? '',
    url: itemUrl(it.ItemUrl, categoryId, id),
    thumbnail: str(it.ThumbnailLink),
    buyNowPrice: num(it.BuyItNowPrice),
    maxBid: num(it.MaxBid),
    nextBid: num(it.NextBid),
    bidCount: num(it.BidCount),
    hasBids: bool(it.HasBids),
    isEnded: bool(it.IsEnded),
    itemType: str(it.ItemType),
    endDate: str(it.EndDate),
    sellerAlias: str(it.SellerAlias),
    sellerId: num(it.SellerId),
    categoryId,
  }
}

export async function traderaSearch(params: TraderaSearchParams): Promise<TraderaSearchResult> {
  const page = params.pageNumber && params.pageNumber > 0 ? Math.floor(params.pageNumber) : 1
  const perPage =
    params.itemsPerPage && params.itemsPerPage > 0 ? Math.min(Math.floor(params.itemsPerPage), 50) : 25

  // Field order MUST follow the WSDL sequence. String/enum fields are always
  // emitted (empty = "use default", which Tradera accepts); the nullable price/
  // bid filters are omitted when unset — sending PriceMaximum=0 would filter
  // everything out. This mirrors the marshaling of known-working API clients.
  const f: string[] = []
  f.push(`<SearchWords>${esc(params.query ?? '')}</SearchWords>`)
  f.push(`<CategoryId>${int(params.categoryId, 0)}</CategoryId>`)
  f.push(`<SearchInDescription>${params.searchInDescription ? 'true' : 'false'}</SearchInDescription>`)
  f.push(`<Mode>${esc(params.mode ?? '')}</Mode>`)
  if (params.priceMinimum != null) f.push(`<PriceMinimum>${int(params.priceMinimum, 0)}</PriceMinimum>`)
  if (params.priceMaximum != null) f.push(`<PriceMaximum>${int(params.priceMaximum, 0)}</PriceMaximum>`)
  if (params.bidsMinimum != null) f.push(`<BidsMinimum>${int(params.bidsMinimum, 0)}</BidsMinimum>`)
  if (params.bidsMaximum != null) f.push(`<BidsMaximum>${int(params.bidsMaximum, 0)}</BidsMaximum>`)
  f.push(`<ZipCode></ZipCode>`)
  f.push(`<CountyId>0</CountyId>`)
  f.push(`<Alias></Alias>`)
  f.push(`<OrderBy>${esc(params.orderBy ?? '')}</OrderBy>`)
  f.push(`<ItemStatus>${esc(params.itemStatus ?? '')}</ItemStatus>`)
  f.push(`<ItemType>${esc(params.itemType ?? '')}</ItemType>`)
  f.push(`<OnlyAuctionsWithBuyNow>${params.onlyAuctionsWithBuyNow ? 'true' : 'false'}</OnlyAuctionsWithBuyNow>`)
  f.push(`<OnlyItemsWithThumbnail>${params.onlyItemsWithThumbnail ? 'true' : 'false'}</OnlyItemsWithThumbnail>`)
  f.push(`<ItemsPerPage>${perPage}</ItemsPerPage>`)
  f.push(`<PageNumber>${page}</PageNumber>`)
  f.push(`<ItemCondition>${esc(params.itemCondition ?? '')}</ItemCondition>`)
  f.push(`<SellerType>${esc(params.sellerType ?? '')}</SellerType>`)

  const bodyXml = `<SearchAdvanced xmlns="${NS}"><request>${f.join('')}</request></SearchAdvanced>`
  const body = await callSoap(SEARCH_ENDPOINT, `${NS}/SearchAdvanced`, bodyXml)

  const result = (firstResult(body) ?? {}) as Record<string, unknown>
  const itemsContainer = result.Items as Record<string, unknown> | undefined
  const raw = itemsContainer?.SearchItem
  const items = Array.isArray(raw) ? raw : raw ? [raw] : []
  const errors = collectErrors(result.Errors)

  return {
    total: num(result.TotalNumberOfItems) ?? 0,
    totalPages: num(result.TotalNumberOfPages) ?? 0,
    page,
    items: items.map((it) => mapListing(it as Record<string, unknown>)),
    ...(errors.length ? { errors } : {}),
  }
}

// Full detail for one listing. Tradera's Item type is large and not fully
// documented, so we pass its parsed fields through verbatim (Tradera's own
// PascalCase names) and only guarantee an injected `url`. Nothing is lost.
export async function traderaGetItem(itemId: number): Promise<Record<string, unknown>> {
  const bodyXml = `<GetItem xmlns="${NS}"><itemId>${int(itemId, 0)}</itemId></GetItem>`
  const body = await callSoap(PUBLIC_ENDPOINT, `${NS}/GetItem`, bodyXml)
  const item = (firstResult(body) ?? {}) as Record<string, unknown>
  if (Object.keys(item).length === 0) throw new Error(`Tradera API: item ${itemId} not found`)
  const id = num(item.Id) ?? itemId
  const categoryId = num(item.CategoryId)
  return { url: itemUrl(item.ItemUrl, categoryId, id), ...item }
}
