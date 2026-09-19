import './globals.css'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { createClientServer } from '@/lib/supabase'

const inter = Inter({ subsets: ['latin'] })

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClientServer()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        {user && (
          <nav className="flex items-center justify-between p-4 bg-white border-b">
            <div className="flex gap-4">
              <Link href="/" className="font-bold text-xl">LifeOrg</Link>
              <Link href="/tasks" className="text-gray-600 hover:text-gray-900">Tasks</Link>
              <Link href="/habits" className="text-gray-600 hover:text-gray-900">Habits</Link>
            </div>
            <div className="text-sm text-gray-500">
              {user.email}
            </div>
          </nav>
        )}
        <main className="max-w-4xl mx-auto p-4">
          {children}
        </main>
      </body>
    </html>
  )
}
