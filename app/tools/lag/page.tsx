'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { CasesResponse, RattspraxisCase } from '@/types/legal'

const COURTS = [
  { value: '', label: 'Alla domstolar' },
  { value: 'HD', label: 'HD — Högsta domstolen' },
  { value: 'HovR', label: 'HovR — Hovrätt' },
  { value: 'TR', label: 'TR — Tingsrätt' },
  { value: 'HFD', label: 'HFD — Högsta förvaltningsdomstolen' },
  { value: 'KamR', label: 'KamR — Kammarrätt' },
  { value: 'FörvR', label: 'FörvR — Förvaltningsrätt' },
  { value: 'ARN', label: 'ARN — Allmänna reklamationsnämnden' },
  { value: 'AD', label: 'AD — Arbetsdomstolen' },
]

const SUBJECT_AREAS = [
  { value: '', label: 'Alla ämnesområden' },
  { value: 'arv_testamente', label: 'Arv & testamente' },
  { value: 'familjerätt', label: 'Familjerätt' },
  { value: 'avtalsrätt', label: 'Avtalsrätt' },
  { value: 'skadeståndsrätt', label: 'Skadeståndsrätt' },
  { value: 'straffrätt', label: 'Straffrätt' },
  { value: 'arbetsrätt', label: 'Arbetsrätt' },
  { value: 'fastighetsrätt', label: 'Fastighetsrätt' },
  { value: 'förvaltningsrätt', label: 'Förvaltningsrätt' },
  { value: 'processrätt', label: 'Processrätt' },
]

const PAGE_SIZE = 20

function formatDate(d: string | null) {
  if (!d) return '—'
  return d.slice(0, 10)
}

export default function LagPage() {
  const [q, setQ] = useState('')
  const [court, setCourt] = useState('')
  const [amnesomrade, setAmnesomrade] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [offset, setOffset] = useState(0)

  const [results, setResults] = useState<RattspraxisCase[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const abortRef = useRef<AbortController | null>(null)

  const search = useCallback(async (currentOffset: number) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError('')

    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (court) params.set('court', court)
    if (amnesomrade) params.set('amnesomrade', amnesomrade)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(currentOffset))

    try {
      const res = await fetch(`/api/cases?${params}`, { signal: controller.signal })
      const json: CasesResponse | { error: string } = await res.json()
      if ('error' in json) throw new Error(json.error)
      setResults(json.cases)
      setTotal(json.total)
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setError((e as Error).message)
      setResults([])
      setTotal(null)
    } finally {
      setLoading(false)
    }
  }, [q, court, amnesomrade, from, to])

  // Re-search when filters change (reset to page 0)
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
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">← Hem</Link>
        <h1 className="text-lg font-semibold text-gray-800">Rättsfall</h1>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Sök i rubrik och sammanfattning…"
            value={q}
            onChange={e => setQ(e.target.value)}
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
          <select
            value={court}
            onChange={e => setCourt(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gray-500 bg-white"
          >
            {COURTS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select
            value={amnesomrade}
            onChange={e => setAmnesomrade(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gray-500 bg-white"
          >
            {SUBJECT_AREAS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">Från</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">Till</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-gray-500"
            />
          </div>
        </div>
      </form>

      {error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}

      {total != null && !loading && (
        <p className="text-xs text-gray-500 mb-3">
          {total} {total === 1 ? 'rättsfall' : 'rättsfall'}
          {totalPages != null && totalPages > 1 && ` — sida ${page} av ${totalPages}`}
        </p>
      )}

      {loading && (
        <p className="text-sm text-gray-400">Laddar…</p>
      )}

      {!loading && results.length === 0 && total === 0 && (
        <p className="text-sm text-gray-400">Inga rättsfall hittades.</p>
      )}

      <div className="space-y-2">
        {results.map(c => (
          <Link
            key={c.id}
            href={`/tools/lag/${c.id}`}
            className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <p className="text-sm font-medium text-gray-800 leading-snug">
              {c.rubrik ?? '(ingen rubrik)'}
            </p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {c.domstol && (
                <span className="text-xs text-gray-500">{c.domstol}</span>
              )}
              {c.avgorande_datum && (
                <span className="text-xs text-gray-400">{formatDate(c.avgorande_datum)}</span>
              )}
              {c.referat && (
                <span className="text-xs font-mono text-gray-400">{c.referat}</span>
              )}
            </div>
          </Link>
        ))}
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
