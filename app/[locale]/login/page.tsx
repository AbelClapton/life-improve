'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

export default function LoginPage() {
  const t = useTranslations('Login');
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleAuth(type: 'signIn' | 'signUp') {
    setLoading(true)
    setError(null)
    try {
      const { error } = type === 'signIn'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

      if (error) throw error
      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="panel w-full max-w-md">
        <span className="eyebrow">A quieter way to organize</span>
        <h1 className="page-title text-4xl mb-8">{t('title')}</h1>
        <div className="space-y-4">
          <div>
            <label className="field-label">{t('email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-input"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="field-label">{t('password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-input"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--coral)' }}>{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => handleAuth('signIn')}
              disabled={loading}
              className="primary-button flex-1 disabled:opacity-50"
            >
              {loading ? t('loading') : t('signIn')}
            </button>
            <button
              onClick={() => handleAuth('signUp')}
              disabled={loading}
              className="secondary-button flex-1 disabled:opacity-50"
            >
              {t('signUp')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
