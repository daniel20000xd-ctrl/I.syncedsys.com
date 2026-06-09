'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { ResearchRecord, StructuralTag, DerivedTag } from '@/types/research'

function formatDate(d: unknown) {
  if (typeof d !== 'string' || !d) return '—'
  return d.slice(0, 10)
}
function asText(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v || null
  return String(v)
}
function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x))
  return []
}

function formatLagrum(item: unknown): string {
  if (typeof item === 'string') return item
  if (item && typeof item === 'object') {
    const o = item as { referens?: string; sfsNummer?: string }
    return [o.referens, o.sfsNummer].filter(Boolean).join(' · ')
  }
  return String(item)
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</dt>
      <dd className="text-sm text-gray-800">{value}</dd>
    </div>
  )
}

function Chips({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-sm text-gray-400">—</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700">
          {item}
        </span>
      ))}
    </div>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value || 0)) * 100)
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="h-1.5 w-24 bg-amber-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400">{pct}%</span>
    </div>
  )
}

export default function ResearchRecordPage() {
  const { domain, id } = useParams<{ domain: string; id: string }>()
  const [record, setRecord] = useState<ResearchRecord | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'notfound' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch(`/api/research/${domain}/${id}`)
        if (res.status === 404) {
          if (active) setStatus('notfound')
          return
        }
        const json = await res.json()
        if ('error' in json) throw new Error(json.error)
        if (!active) return
        setRecord(json)
        setStatus('ok')
      } catch (e) {
        if (!active) return
        setError((e as Error).message)
        setStatus('error')
      }
    })()
    return () => {
      active = false
    }
  }, [domain, id])

  const back = (
    <Link href={`/tools/research/${domain}`} className="text-xs text-gray-400 hover:text-gray-600">
      ← Tillbaka
    </Link>
  )

  if (status === 'loading') {
    return (
      <div className="p-6 max-w-3xl">
        <p className="text-sm text-gray-400">Laddar…</p>
      </div>
    )
  }
  if (status === 'notfound') {
    return (
      <div className="p-6 max-w-3xl">
        {back}
        <p className="text-sm text-gray-400 mt-6">Posten hittades inte.</p>
      </div>
    )
  }
  if (status === 'error' || !record) {
    return (
      <div className="p-6 max-w-3xl">
        {back}
        <p className="text-sm text-red-600 mt-6">{error || 'Ett fel uppstod.'}</p>
      </div>
    )
  }

  const r = record
  const structural: StructuralTag[] = Array.isArray(r.structural_tags) ? r.structural_tags : []
  const derived: DerivedTag[] = Array.isArray(r.derived_tags) ? r.derived_tags : []
  const sourceUrl = asText(r.source_url)
  const rawLagrum = r['lagrum']
  const lagrum = Array.isArray(rawLagrum) ? rawLagrum.map(formatLagrum) : []
  const sokord = asList(r['sokord'])

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">{back}</div>

      <h1 className="text-base font-semibold text-gray-800 leading-snug mb-4">
        {r.title ?? '(ingen titel)'}
      </h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-6">
        <Field label="Datum" value={formatDate(r.record_date)} />
        <Field label="Källa" value={asText(r.source_name)} />
        <Field label="Domstolskod" value={asText(r['domstolskod'])} />
        <Field label="Målnummer" value={asText(r['malnummer'])} />
        <Field label="Referat" value={asText(r['referat'])} />
        <Field label="Status" value={asText(r.phase2_status)} />
      </div>

      {r.summary && (
        <div className="mb-8">
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Sammanfattning</dt>
          <dd className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{r.summary}</dd>
        </div>
      )}

      {/* Structural tags — neutral, what the record explicitly IS */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Strukturella taggar
        </h2>
        {structural.length === 0 ? (
          <p className="text-sm text-gray-400">—</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {structural.map((t, i) => (
              <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700">
                {t.tag}
                {t.category && <span className="text-gray-400"> · {t.category}</span>}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Derived tags — distinct amber, latent connections found later */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3">
          ✦ Härledda taggar
        </h2>
        {derived.length === 0 ? (
          <p className="text-sm text-gray-400">—</p>
        ) : (
          <div className="space-y-3">
            {derived.map((t, i) => (
              <div key={i} className="border border-amber-200 bg-amber-50 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-sm font-medium text-amber-800">✦ {t.tag}</span>
                  <ConfidenceBar value={t.confidence} />
                </div>
                {t.reasoning && (
                  <p className="text-xs text-gray-600 leading-relaxed">{t.reasoning}</p>
                )}
                {t.specific_passage && (
                  <p className="text-xs text-gray-500 italic mt-1.5 border-l-2 border-amber-300 pl-2">
                    “{t.specific_passage}”
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {lagrum.length > 0 && (
        <div className="mb-5">
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Lagrum</dt>
          <dd>
            <Chips items={lagrum} />
          </dd>
        </div>
      )}
      {sokord.length > 0 && (
        <div className="mb-5">
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Sökord</dt>
          <dd>
            <Chips items={sokord} />
          </dd>
        </div>
      )}

      {sourceUrl && (
        <div className="mt-8 pt-5 border-t border-gray-200">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Öppna källan ↗
          </a>
        </div>
      )}
    </div>
  )
}
