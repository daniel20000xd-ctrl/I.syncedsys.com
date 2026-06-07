export type RattspraxisCase = {
  id: string
  malnummer: string | null
  referat: string | null
  domstol: string | null
  domstolskod: string | null
  avgorande_datum: string | null
  rubrik: string | null
  sammanfattning: string | null
  lagrum: string[]
  sokord: string[]
  url: string | null
  fulltext_url: string | null
  amnesomrade: string
  scraped_at: string
}

export type CasesResponse = {
  cases: RattspraxisCase[]
  total: number
  limit: number
  offset: number
}
