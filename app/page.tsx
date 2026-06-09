import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="p-8">
      <h1 className="text-lg font-semibold text-gray-800 mb-6">Tools</h1>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <Link
          href="/tools/lag"
          className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <p className="text-sm font-medium text-gray-800">Lag</p>
          <p className="text-xs text-gray-500 mt-1">Svenska rättsfall — HD prejudikat</p>
        </Link>
        <Link
          href="/tools/research"
          className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <p className="text-sm font-medium text-gray-800">Research</p>
          <p className="text-xs text-gray-500 mt-1">Knowledge database — rättspraxis, studier, datapunkter</p>
        </Link>
        <div className="p-4 rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
          <p className="text-xs text-gray-400">More coming soon</p>
        </div>
      </div>
    </div>
  )
}
