export type ResearchDomain = {
  domain_key: string
  display_name: string
  table_name: string
  record_count: number
  last_ingested_at: string | null
  last_enriched_at: string | null
  last_connected_at: string | null
  created_at: string
}

export type StructuralTag = {
  tag: string
  category: string
  confidence: number
  added_at: string
}

export type DerivedTag = {
  tag: string
  concept_id: string
  confidence: number
  reasoning: string
  specific_passage: string | null
  added_at: string
}

export type ResearchRecord = {
  id: string
  external_id: string
  source_name: string
  source_url: string | null
  domain: string
  title: string | null
  summary: string | null
  record_date: string | null
  structural_tags: StructuralTag[]
  derived_tags: DerivedTag[]
  phase2_status: 'pending' | 'done' | 'error'
  phase2_ran_at: string | null
  ingested_at: string
  updated_at: string
  // domain-specific extra fields are included in the raw record
  // access them via record[fieldName] — typed as unknown
  [key: string]: unknown
}

export type Concept = {
  id: string
  name: string
  description: string
  created_at: string
  last_run_at: string | null
  total_runs: number
  domains_searched: string[]
}

export type RecordsResponse = {
  records: ResearchRecord[]
  total: number
  limit: number
  offset: number
  domain: string
}
