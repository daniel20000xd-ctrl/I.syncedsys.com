'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ResearchDomain } from '@/types/research'

function formatDate(d: string | null) {
  if (!d) return '—'
  return d.slice(0, 10)
}

export default function ResearchOverviewPage() {
  const [domains, setDomains] = useState<ResearchDomain[]>([])
  const [conceptCount, setConceptCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [dRes, cRes] = await Promise.all([
          fetch('/api/research/domains'),
          fetch('/api/research/concepts'),
        ])
        const dJson = await dRes.json()
        const cJson = await cRes.json()
        if ('error' in dJson) throw new Error(dJson.error)
        if (!active) return
        setDomains(dJson.domains ?? [])
        setConceptCount(Array.isArray(cJson.concepts) ? cJson.concepts.length : 0)
      } catch (e) {
        if (active) setError((e as Error).message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">← Hem</Link>
        <h1 className="text-lg font-semibold text-gray-800">Research</h1>
        {conceptCount != null && (
          <span className="text-xs text-gray-400">{conceptCount} koncept</span>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-sm text-gray-400">Laddar…</p>}

      {!loading && !error && domains.length === 0 && (
        <p className="text-sm text-gray-400">Inga domäner ännu.</p>
      )}

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
      >
        {domains.map((d) => (
          <Link
            key={d.domain_key}
            href={`/tools/research/${d.domain_key}`}
            className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <p className="text-sm font-medium text-gray-800">{d.display_name}</p>
            <p className="text-xs text-gray-500 mt-1">{d.record_count} poster</p>
            <div className="mt-2 space-y-0.5">
              <p className="text-xs text-gray-400">Ingest: {formatDate(d.last_ingested_at)}</p>
              <p className="text-xs text-gray-400">Enrich: {formatDate(d.last_enriched_at)}</p>
              <p className="text-xs text-gray-400">Connect: {formatDate(d.last_connected_at)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
