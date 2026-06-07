import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { RattspraxisCase } from '@/types/legal'

async function getCase(id: string): Promise<RattspraxisCase | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/cases/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to fetch case: ${res.status}`)
  return res.json()
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return d.slice(0, 10)
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

function Tags({ items }: { items: string[] }) {
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

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const c = await getCase(id)
  if (!c) notFound()

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tools/lag" className="text-xs text-gray-400 hover:text-gray-600">← Rättsfall</Link>
      </div>

      <h1 className="text-base font-semibold text-gray-800 leading-snug mb-6">
        {c.rubrik ?? '(ingen rubrik)'}
      </h1>

      <dl className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Domstol" value={c.domstol} />
          <Field label="Avgörandedatum" value={formatDate(c.avgorande_datum)} />
          <Field label="Referat" value={c.referat} />
          <Field label="Målnummer" value={c.malnummer} />
          <Field label="Ämnesområde" value={c.amnesomrade} />
        </div>

        {c.sammanfattning && (
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Sammanfattning</dt>
            <dd className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{c.sammanfattning}</dd>
          </div>
        )}

        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Lagrum</dt>
          <dd><Tags items={c.lagrum ?? []} /></dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Sökord</dt>
          <dd><Tags items={c.sokord ?? []} /></dd>
        </div>
      </dl>

      {c.url && (
        <div className="mt-8 pt-5 border-t border-gray-200">
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Öppna originalavgörandet ↗
          </a>
        </div>
      )}
    </div>
  )
}
