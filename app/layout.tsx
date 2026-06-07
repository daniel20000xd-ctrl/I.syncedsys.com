import type { Metadata } from 'next'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'

export const metadata: Metadata = {
  title: 'i.syncedsys.com',
  description: 'Personal space',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en" className="h-full">
      <body className="h-full flex flex-col">
        {user && <TopBar email={user.email ?? ''} />}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
