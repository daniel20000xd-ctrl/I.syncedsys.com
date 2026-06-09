'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { ResearchRecord, RecordsResponse, ResearchDomain } from '@/types/research'

const PAGE_SIZE = 20

function formatDate(d: unknown) {
  if (typeof d !== 'string' || !d) return '—'
  return d.slice(0, 10)
}
function asText(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v || null
  return String(v)
}

export default function ResearchDomainPage() {
  const { domain } = useParams<{ domain: string }>()

  const [displayName, setDisplayName] = useState('')
  const [domainOk, setDomainOk] = useState<boolean | null>(null)

  const [q, setQ] = useState('')
  const [structuralTag, setStructuralTag] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [offset, setOffset] = useState(0)

  const [results, setResults] = useState<ResearchRecord[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const abortRef = useRef<AbortController | null>(null)

  // Confirm the domain exists and get its display name.
  useEffect(() => {
    let active = true
    fetch('/api/research/domains')
      .then((r) => r.json())
      .then((j: { domains?: ResearchDomain[] }) => {
        if (!active) return
        const d = (j.domains ?? []).find((x) => x.domain_key === domain)
        setDomainOk(!!d)
        setDisplayName(d?.display_name ?? domain)
      })
      .catch(() => {
        if (active) setDomainOk(false)
      })
    return () => {
      active = false
    }
  }, [domain])

  const search = useCallback(
    async (currentOffset: number) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setError('')

      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (structuralTag) params.set('structural_tag', structuralTag)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(currentOffset))

      try {
        const res = await fetch(`/api/research/${domain}?${params}`, {
          signal: controller.signal,
        })
        const json: RecordsResponse | { error: string } = await res.json()
        if ('error' in json) throw new Error(json.error)
        setResults(json.records)
        setTotal(json.total)
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        setError((e as Error).message)
        setResults([])
        setTotal(null)
      } finally {
        setLoading(false)
      }
    },
    [q, structuralTag, dateFrom, dateTo, domain]
  )

  useEffect(() => {
    setOffset(0)
    search(0)
  }, [search])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setOffset(0)
    search(0)
  }
  function prevPage() {
    const next = Math.max(0, offset - PAGE_SIZE)
    setOffset(next)
    search(next)
  }
  function nextPage() {
    const next = offset + PAGE_SIZE
    setOffset(next)
    search(next)
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = total != null ? Math.ceil(total / PAGE_SIZE) : null

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tools/research" className="text-xs text-gray-400 hover:text-gray-600">← Research</Link>
        <h1 className="text-lg font-semibold text-gray-800">{displayName || domain}</h1>
      </div>

      {domainOk === false && (
        <p className="text-sm text-red-600 mb-4">Domänen hittades inte.</p>
      )}

      <form onSubmit={handleSubmit} className="mb-6 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Sök i titel och sammanfattning…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
          >
            Sök
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Strukturell tagg…"
            value={structuralTag}
            onChange={(e) => setStructuralTag(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gray-500"
          />
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">Från</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-gray-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">Till</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-gray-500"
            />
          </div>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {total != null && !loading && (
        <p className="text-xs text-gray-500 mb-3">
          {total} poster
          {totalPages != null && totalPages > 1 && ` — sida ${page} av ${totalPages}`}
        </p>
      )}

      {loading && <p className="text-sm text-gray-400">Laddar…</p>}

      {!loading && results.length === 0 && total === 0 && (
        <p className="text-sm text-gray-400">Inga poster hittades.</p>
      )}

      <div className="space-y-2">
        {results.map((r) => {
          const malnummer = asText(r['malnummer'])
          const referat = asText(r['referat'])
          const structural = Array.isArray(r.structural_tags) ? r.structural_tags : []
          const derived = Array.isArray(r.derived_tags) ? r.derived_tags : []
          return (
            <Link
              key={r.id}
              href={`/tools/research/${domain}/${r.id}`}
              className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <p className="text-sm font-medium text-gray-800 leading-snug">
                {r.title ?? '(ingen titel)'}
              </p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {typeof r.record_date === 'string' && r.record_date && (
                  <span className="text-xs text-gray-400">{formatDate(r.record_date)}</span>
                )}
                {malnummer && <span className="text-xs font-mono text-gray-400">{malnummer}</span>}
                {referat && <span className="text-xs font-mono text-gray-400">{referat}</span>}
              </div>
              {(structural.length > 0 || derived.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {structural.map((t, i) => (
                    <span
                      key={`s${i}`}
                      className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700"
                    >
                      {t.tag}
                    </span>
                  ))}
                  {derived.map((t, i) => (
                    <span
                      key={`d${i}`}
                      className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700"
                    >
                      ✦ {t.tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {totalPages != null && totalPages > 1 && (
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={prevPage}
            disabled={offset === 0}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Föregående
          </button>
          <span className="text-xs text-gray-500">{page} / {totalPages}</span>
          <button
            onClick={nextPage}
            disabled={total != null && offset + PAGE_SIZE >= total}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Nästa →
          </button>
        </div>
      )}
    </div>
  )
}
