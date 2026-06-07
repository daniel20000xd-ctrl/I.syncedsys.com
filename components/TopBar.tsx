'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function TopBar({ email }: { email: string }) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
      <span className="text-xs text-gray-500">i.syncedsys.com</span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">{email}</span>
        <button
          onClick={handleSignOut}
          className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
